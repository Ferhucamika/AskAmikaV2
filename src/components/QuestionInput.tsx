'use client';

import { useState } from 'react';

interface QuestionInputProps {
  onSubmit: (question: string) => Promise<void>;
  onConveneCouncil?: (question: string) => Promise<void>;
  isLoading?: boolean;
  isCouncilLoading?: boolean;
}

export default function QuestionInput({
  onSubmit,
  onConveneCouncil,
  isLoading = false,
  isCouncilLoading = false,
}: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    await onSubmit(q);
  };

  const handleCouncil = async () => {
    if (!question.trim() || !onConveneCouncil) return;
    const q = question;
    setQuestion('');
    await onConveneCouncil(q);
  };

  const anyLoading = isLoading || isCouncilLoading;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-4">
      <div className="flex gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2"
          style={{
            borderColor: 'var(--amika-gray-light)',
            minHeight: '100px',
          }}
          disabled={anyLoading}
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={anyLoading || !question.trim()}
            className="btn-primary"
          >
            {isLoading ? 'Processing...' : 'Send'}
          </button>
          {onConveneCouncil && (
            <button
              type="button"
              onClick={handleCouncil}
              disabled={anyLoading || !question.trim()}
              className="text-sm px-3 py-2 rounded border"
              style={{
                borderColor: 'var(--amika-orange)',
                color: anyLoading || !question.trim() ? 'var(--amika-gray-text)' : 'var(--amika-orange)',
                opacity: anyLoading || !question.trim() ? 0.5 : 1,
              }}
              title="Run this question across multiple models in parallel"
            >
              {isCouncilLoading ? 'Convening…' : 'Convene Council'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
