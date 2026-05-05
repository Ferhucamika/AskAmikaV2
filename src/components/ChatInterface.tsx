'use client';

import { useState } from 'react';
import { Message } from '@/lib/types';
import QuestionInput from './QuestionInput';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuestionSubmit = async (question: string) => {
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Chat API wiring lands in Task 7. For now this is UI-only.
    setIsLoading(false);
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
              {msg.content}
            </div>
          ))}
        </div>
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
