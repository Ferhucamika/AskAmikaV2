export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  timestamp: Date;
  artifacts?: Artifact[];
}

export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'data' | 'visual';
  language?: string;
  content: string;
  title?: string;
}

export interface QuestionAnalysis {
  isBusinessContext: boolean;
  confidence: number;
  entities: string[];
}

export interface ModelResponse {
  model: string;
  content: string;
  tokensUsed: number;
  streamingTime: number;
}

export interface CouncilResponse {
  responses: ModelResponse[];
  orchestratorSummary: string;
  consensus?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
