'use client';

import { useMemo, useState } from 'react';
import { Message } from '@/lib/types';
import QuestionInput from './QuestionInput';
import CouncilView from './CouncilView';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [councilKey, setCouncilKey] = useState(0);

  const lastUserQuestion = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return null;
  }, [messages]);

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true);

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
        body: JSON.stringify({ question }),
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
        {lastUserQuestion && (
          <div className="max-w-4xl mx-auto mb-4 flex justify-end">
            <button
              onClick={() => {
                if (showCouncil) {
                  setShowCouncil(false);
                } else {
                  setCouncilKey((k) => k + 1);
                  setShowCouncil(true);
                }
              }}
              className="btn-primary text-sm"
            >
              {showCouncil ? 'Hide Council' : 'Convene Council'}
            </button>
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

        {showCouncil && lastUserQuestion && (
          <div className="max-w-4xl mx-auto">
            <CouncilView key={councilKey} question={lastUserQuestion} />
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
