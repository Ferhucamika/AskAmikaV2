'use client';

import { useState } from 'react';

interface QuestionInputProps {
  onSubmit: (question: string) => Promise<void>;
  isLoading?: boolean;
}

export default function QuestionInput({ onSubmit, isLoading = false }: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    await onSubmit(question);
    setQuestion('');
  };

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
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !question.trim()} className="btn-primary">
          {isLoading ? 'Processing...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
