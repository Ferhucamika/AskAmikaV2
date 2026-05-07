import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuestion } from '@/lib/mcp/analyzer';
import { selectBestModel } from '@/lib/llm/router';
import { clientFor } from '@/lib/llm/factory';
import { analyzeFabricNeeds } from '@/lib/fabric/analyzer';
import { generateDAXQuery } from '@/lib/fabric/dax-generator';
import { matchQueryCatalog } from '@/lib/fabric/catalog-matcher';
import { getFabricClient } from '@/lib/fabric/client';

interface ChatRequestBody {
  question?: string;
  overrideModelId?: string;
}

export async function POST(request: NextRequest) {
  const { question, overrideModelId } = (await request.json()) as ChatRequestBody;

  if (!question) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 });
  }

  try {
    const analysis = await analyzeQuestion(question);
    console.log('Question analysis:', analysis);

    const selectedModel = selectBestModel(analysis, { overrideModelId });
    const client = clientFor(selectedModel);

    // Step 1: Get initial LLM response
    let initialResponse = '';
    for await (const chunk of client.stream([
      { role: 'user', content: question },
    ])) {
      initialResponse += chunk;
    }

    // Step 2: Check if Fabric data is needed (only for business context)
    let finalResponse = initialResponse;
    if (analysis.isBusinessContext && analysis.semanticModel) {
      try {
        const fabricNeeds = await analyzeFabricNeeds(
          question,
          initialResponse,
          analysis
        );

        // Step 3: If Fabric data is needed, fetch it and re-answer
        if (fabricNeeds.isNeeded) {
          const catalogMatch = await matchQueryCatalog(question, analysis.entities);
          if (catalogMatch.matched) {
            console.log('🎯 Catalog match:', catalogMatch.queryKey, `(confidence: ${catalogMatch.confidence})`);
          } else {
            console.log('🔧 No catalog match — generating custom DAX from rules');
          }

          const daxQuery = await generateDAXQuery(
            question,
            analysis.entities,
            analysis.semanticModel,
            catalogMatch
          );
          console.log('📊 Generated DAX query:', daxQuery);

          const fabricClient = getFabricClient();
          const fabricResults = await fabricClient.executeDAX(
            analysis.semanticModel,
            daxQuery
          );

          // Step 4: Re-prompt LLM with Fabric data for enhanced answer
          const enhancedPrompt = `Original question: ${question}

Your initial response was:
${initialResponse}

Here is relevant data from our business system (${analysis.semanticModel}):
${JSON.stringify(fabricResults.result, null, 2)}

Please provide an enhanced answer that incorporates this real business data. Be specific and reference the actual data points.`;

          let enhancedResponse = '';
          for await (const chunk of client.stream([
            { role: 'user', content: enhancedPrompt },
          ])) {
            enhancedResponse += chunk;
          }

          finalResponse = enhancedResponse;
        }
      } catch (fabricError) {
        console.error('Error in Fabric routing:', fabricError);
        // Fall back to initial response if Fabric fails
      }
    }

    // Stream the final response
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(finalResponse));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Selected-Model': selectedModel.id,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
