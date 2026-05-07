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
        const enhancedPrompt = `You are answering an executive's question using real data from Amika's POS sales system (${datasetName}).

Original question: ${question}

Data returned (${fabricResults.result.length} rows):
${JSON.stringify(fabricResults.result, null, 2)}

Format your response in this exact structure:

1. **One-sentence headline** answering the question (e.g., "amika's top growth driver at Sephora is Frizz-Me-Not Styler with +10,111 units vs LY.").

2. **A markdown table** with the data — use clean, readable column names (no internal keys like SPS_ITEM_MAPPING_KEY; show the product name instead). Format numbers with thousands separators (e.g., 10,111 not 10111). Keep the table compact — drop columns that are all blank or all zero unless they're meaningful.

3. **2–4 brief bullet observations** ("Key Takeaways") highlighting the most useful patterns: top performer, surprises, anything an executive should notice. Reference specific numbers.

Rules:
- Be concise — executives skim.
- Don't repeat the data after the table.
- If the data is empty, say so plainly in one sentence and suggest a possible reason (no time-period match, no products in scope, etc.) — do not fabricate.
- No "based on the data..." preamble. Lead with the answer.`;

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
