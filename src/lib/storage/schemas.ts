export interface ArtifactDocument {
  id: string;
  type: 'code' | 'document' | 'data' | 'visual';
  language?: string;
  content: string;
  title?: string;
}

export interface MessageDocument {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  artifacts?: ArtifactDocument[];
}

export interface SessionDocument {
  id: string;
  userId: string;
  title: string;
  messages: MessageDocument[];
  createdAt: string;
  updatedAt: string;
  metadata: {
    modelUsed: string;
    questionsAsked: number;
  };
}

export function createSessionDocument(
  userId: string,
  title: string = 'New Chat'
): SessionDocument {
  const now = new Date().toISOString();
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      modelUsed: '',
      questionsAsked: 0,
    },
  };
}
