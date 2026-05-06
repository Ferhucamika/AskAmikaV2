import { Anthropic } from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const DAX_GENERATION_PROMPT = `You are an expert DAX (Data Analysis Expressions) query generator for Microsoft Fabric semantic models.

Your task is to generate a DAX EVALUATE query that answers a business question using a specific semantic model.

Question: {question}
Entities mentioned: {entities}
Semantic Model: {modelName}

Generate a valid DAX EVALUATE query that:
1. Retrieves relevant columns and metrics for the question
2. Uses proper table and column names from the semantic model
3. Applies appropriate filters based on the entities
4. Is concise and efficient

Return ONLY the DAX query, no explanation or markdown formatting.
Start with EVALUATE and include proper syntax.`;

export async function generateDAXQuery(
  question: string,
  entities: string[],
  modelName: string
): Promise<string> {
  const entitiesStr = entities.join(', ');
  const prompt = DAX_GENERATION_PROMPT.replace('{question}', question)
    .replace('{entities}', entitiesStr)
    .replace('{modelName}', modelName);

  const response = await getClient().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response from Claude');
  }

  const daxQuery = block.text.trim();

  if (!daxQuery.startsWith('EVALUATE')) {
    throw new Error('Generated query does not start with EVALUATE');
  }

  return daxQuery;
}
