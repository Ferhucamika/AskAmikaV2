'use client';

import { useEffect, useState } from 'react';
import { Artifact, Message } from '@/lib/types';
import { detectArtifacts } from '@/lib/artifacts/detector';
import { createSessionDocument, SessionDocument } from '@/lib/storage/schemas';
import { saveSession } from '@/lib/storage/sessions';
import ArtifactPanel from './ArtifactPanel';
import QuestionInput from './QuestionInput';
import ModelSelector from './ModelSelector';
import CouncilTabs from './CouncilTabs';
import CouncilModelPicker from './CouncilModelPicker';
import MarkdownMessage from './MarkdownMessage';

const DEFAULT_COUNCIL_IDS = ['claude-opus', 'claude-sonnet', 'openai-flagship'];

const PILOT_USER_ID = 'pilot-user'; // Replace with the authenticated user's id once MSAL is fully wired.

type ChatMode = 'auto' | 'council';

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
  const [councilModelIds, setCouncilModelIds] = useState<string[]>(DEFAULT_COUNCIL_IDS);
  const [councilLoading, setCouncilLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('auto');

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

  const runCouncil = async (question: string) => {
    if (councilModelIds.length < 3) {
      alert('Pick at least 3 models for the Council.');
      return;
    }
    setCouncilLoading(true);
    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          modelIds: councilModelIds,
        }),
      });
      const data = await response.json();
      setCouncilResults(data);
      setShowCouncil(true);
    } catch (error) {
      console.error('Council error:', error);
    } finally {
      setCouncilLoading(false);
    }
  };

  const handleConveneCouncilFromInput = async (question: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    await runCouncil(question);
  };

  const handleClearChat = () => {
    if (messages.length === 0 && !councilResults && artifacts.length === 0) return;
    if (!confirm('Clear the current conversation? This cannot be undone.')) return;
    setMessages([]);
    setArtifacts([]);
    setShowArtifacts(false);
    setCouncilResults(null);
    setShowCouncil(false);
    setSession(createSessionDocument(PILOT_USER_ID));
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
        <h1 className="text-3xl font-bold text-white">AskAmika</h1>
        <p className="text-white/80">C-Level Decision Support</p>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
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
              {msg.role === 'assistant' ? (
                <MarkdownMessage content={msg.content} />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
              {msg.model && msg.role === 'assistant' && (
                <div
                  className="text-xs mt-3 pt-2 border-t font-medium"
                  style={{
                    color: 'var(--amika-gray-text)',
                    borderColor: 'rgba(0,0,0,0.1)',
                  }}
                >
                  Model: {msg.model}
                </div>
              )}
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
        className="border-t bg-white"
        style={{ borderColor: 'var(--amika-gray-light)' }}
      >
        <div className="max-w-4xl mx-auto px-6 pt-3 pb-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <ModeToggle mode={mode} onChange={setMode} />

            <div
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--amika-gray-light)' }}
              aria-hidden
            />

            {mode === 'auto' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--amika-gray-text)' }}>
                  Model
                </span>
                <ModelSelector
                  selectedModelId={selectedModelId}
                  onChange={setSelectedModelId}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--amika-gray-text)' }}>
                  Council
                </span>
                <CouncilModelPicker
                  selectedIds={councilModelIds}
                  onChange={setCouncilModelIds}
                />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {showCouncil && (
                <button
                  onClick={() => setShowCouncil(false)}
                  className="text-xs px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--amika-gray-light)',
                    color: 'var(--amika-gray-text)',
                  }}
                >
                  Hide council
                </button>
              )}
              <button
                onClick={handleClearChat}
                disabled={isLoading || councilLoading || (messages.length === 0 && !councilResults)}
                className="text-xs px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--amika-gray-light)',
                  color: 'var(--amika-gray-text)',
                }}
              >
                Clear chat
              </button>
            </div>
          </div>

          <QuestionInput
            onSubmit={mode === 'auto' ? handleQuestionSubmit : handleConveneCouncilFromInput}
            isLoading={mode === 'auto' ? isLoading : councilLoading}
            submitLabel={mode === 'auto' ? 'Send' : 'Convene Council'}
            loadingLabel={mode === 'auto' ? 'Processing…' : 'Convening…'}
            placeholder={
              mode === 'auto'
                ? 'Ask me anything…'
                : 'Ask the Council — multiple models will answer in parallel…'
            }
          />
        </div>
      </footer>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (m: ChatMode) => void;
}) {
  const baseClass =
    'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap';
  return (
    <div
      role="group"
      aria-label="Response mode"
      className="inline-flex items-center p-1 rounded-lg border"
      style={{
        borderColor: 'var(--amika-gray-light)',
        backgroundColor: 'var(--amika-gray-light)',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('auto')}
        aria-pressed={mode === 'auto'}
        className={baseClass}
        style={{
          backgroundColor: mode === 'auto' ? 'white' : 'transparent',
          color: mode === 'auto' ? 'var(--amika-orange)' : 'var(--amika-gray-text)',
          boxShadow: mode === 'auto' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        Auto
      </button>
      <button
        type="button"
        onClick={() => onChange('council')}
        aria-pressed={mode === 'council'}
        className={baseClass}
        style={{
          backgroundColor: mode === 'council' ? 'white' : 'transparent',
          color: mode === 'council' ? 'var(--amika-orange)' : 'var(--amika-gray-text)',
          boxShadow: mode === 'council' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        Council
      </button>
    </div>
  );
}
