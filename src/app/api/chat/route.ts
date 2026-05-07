import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuestion } from '@/lib/mcp/analyzer';
import { selectBestModel } from '@/lib/llm/router';
import { clientFor } from '@/lib/llm/factory';
import { generateDAXQuery } from '@/lib/fabric/dax-generator';
import { matchQueryCatalog } from '@/lib/fabric/catalog-matcher';
import {
  getFabricClient,
  getFabricDatasetId,
  getFabricDatasetName,
} from '@/lib/fabric/client';

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

    // Step 2: For business context questions, always query Fabric for real data
    let finalResponse = initialResponse;
    if (analysis.isBusinessContext) {
      try {
        const datasetName = getFabricDatasetName();
        const datasetId = getFabricDatasetId();

        const catalogMatch = await matchQueryCatalog(question, analysis.entities);
        if (catalogMatch.matched) {
          console.log('🎯 Catalog match:', catalogMatch.queryKey, `(confidence: ${catalogMatch.confidence})`);
        } else {
          console.log('🔧 No catalog match — generating custom DAX from rules');
        }

        const daxQuery = await generateDAXQuery(
          question,
          analysis.entities,
          datasetName,
          catalogMatch
        );
        console.log('📊 Generated DAX query:', daxQuery);

        const fabricClient = getFabricClient();
        const fabricResults = await fabricClient.executeDAX(datasetId, daxQuery);
        console.log('✅ Fabric returned', fabricResults.result.length, 'rows');

        // Step 3: Re-prompt LLM with Fabric data for enhanced answer
        const enhancedPrompt = `Original question: ${question}

Here is the relevant data from our business system (${datasetName}):
${JSON.stringify(fabricResults.result, null, 2)}

Provide a clear, specific answer to the original question using the data above. Reference actual numbers, products, stores, or regions from the data. If the data is empty or doesn't answer the question, say so plainly.`;

        let enhancedResponse = '';
        for await (const chunk of client.stream([
          { role: 'user', content: enhancedPrompt },
        ])) {
          enhancedResponse += chunk;
        }

        finalResponse = enhancedResponse;
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
