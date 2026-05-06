'use client';

import { useEffect, useMemo, useState } from 'react';
import { Artifact, Message } from '@/lib/types';
import { detectArtifacts } from '@/lib/artifacts/detector';
import { createSessionDocument, SessionDocument } from '@/lib/storage/schemas';
import { saveSession } from '@/lib/storage/sessions';
import ArtifactPanel from './ArtifactPanel';
import QuestionInput from './QuestionInput';
import ModelSelector from './ModelSelector';
import CouncilTabs from './CouncilTabs';

const PILOT_USER_ID = 'pilot-user'; // Replace with the authenticated user's id once MSAL is fully wired.

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [session, setSession] = useState<SessionDocument | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [councilResults, setCouncilResults] = useState<{
    responses: Array<{ model: string; response: string }>;
    orchestratorSummary: string;
  } | null>(null);

  useEffect(() => {
    setSession(createSessionDocument(PILOT_USER_ID));
  }, []);

  useEffect(() => {
    if (!session || isLoading || messages.length === 0) return;
    saveSession({
      ...session,
      title: messages[0]?.content.slice(0, 60) ?? session.title,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        model: m.model,
      })),
      metadata: {
        modelUsed:
          [...messages].reverse().find((m) => m.role === 'assistant' && m.model)
            ?.model ?? '',
        questionsAsked: messages.filter((m) => m.role === 'user').length,
      },
    });
  }, [messages, isLoading, session]);

  const lastUserQuestion = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return null;
  }, [messages]);

  const handleConveneCouncil = async () => {
    if (!lastUserQuestion) return;
    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: lastUserQuestion }),
      });
      const data = await response.json();
      setCouncilResults(data);
      setShowCouncil(true);
    } catch (error) {
      console.error('Council error:', error);
    }
  };

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true);
    setArtifacts([]);
    setShowArtifacts(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = '';
    let messageAdded = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, overrideModelId: selectedModelId }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat API responded ${response.status}`);
      }

      const selectedModel = response.headers.get('X-Selected-Model') ?? undefined;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantContent += decoder.decode(value, { stream: true });

        if (!messageAdded) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: assistantContent,
              model: selectedModel,
              timestamp: new Date(),
            },
          ]);
          messageAdded = true;
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantContent } : m
            )
          );
        }
      }

      const detected = detectArtifacts(assistantContent);
      if (detected.length > 0) {
        setArtifacts(detected);
        setShowArtifacts(true);
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: 'Error: Failed to get response. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--amika-white)' }}
    >
      <ArtifactPanel
        artifacts={artifacts}
        isOpen={showArtifacts}
        onClose={() => setShowArtifacts(false)}
      />
      <header
        className="p-6"
        style={{
          background:
            'linear-gradient(135deg, var(--amika-orange), var(--amika-pink))',
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">AskAmika</h1>
            <p className="text-white/80">C-Level Decision Support</p>
          </div>
          <ModelSelector
            selectedModelId={selectedModelId}
            onChange={setSelectedModelId}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {lastUserQuestion && (
          <div className="max-w-4xl mx-auto mb-4 flex justify-end">
            <button
              onClick={handleConveneCouncil}
              className="btn-primary text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Convening...' : 'Convene Council'}
            </button>
            {showCouncil && (
              <button
                onClick={() => setShowCouncil(false)}
                className="ml-2 text-sm px-3 py-1 rounded"
                style={{
                  backgroundColor: 'var(--amika-gray-light)',
                  color: 'var(--amika-gray-text)',
                }}
              >
                Hide Council
              </button>
            )}
          </div>
        )}
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg max-w-2xl ${
                msg.role === 'user' ? 'ml-auto' : 'mr-auto'
              }`}
              style={{
                backgroundColor:
                  msg.role === 'user'
                    ? 'var(--amika-orange)'
                    : 'var(--amika-gray-light)',
                color: msg.role === 'user' ? 'white' : 'black',
              }}
            >
              {msg.model && msg.role === 'assistant' && (
                <div
                  className="text-xs mb-2 font-medium"
                  style={{ color: 'var(--amika-gray-text)' }}
                >
                  {msg.model}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>

        {showCouncil && councilResults && (
          <div className="max-w-4xl mx-auto mt-6">
            <h2 className="text-xl font-bold mb-4">Council Results</h2>
            <CouncilTabs
              responses={councilResults.responses}
              orchestratorSummary={councilResults.orchestratorSummary}
            />
          </div>
        )}
      </main>

      <footer
        className="p-6 border-t"
        style={{ borderColor: 'var(--amika-gray-light)' }}
      >
        <QuestionInput onSubmit={handleQuestionSubmit} isLoading={isLoading} />
      </footer>
    </div>
  );
}
