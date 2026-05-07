'use client';

import { useState } from 'react';

interface QuestionInputProps {
  onSubmit: (question: string) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
  placeholder?: string;
}

export default function QuestionInput({
  onSubmit,
  isLoading = false,
  submitLabel = 'Send',
  loadingLabel = 'Processing…',
  placeholder = 'Ask me anything…',
}: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    const q = question;
    setQuestion('');
    await onSubmit(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter submits; plain Enter inserts newline
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="flex items-end gap-2 rounded-xl border bg-white p-2 transition-shadow focus-within:shadow-sm"
        style={{ borderColor: 'var(--amika-gray-light)' }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={3}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          className="flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed focus:outline-none disabled:opacity-50"
          style={{ minHeight: 72, maxHeight: 240 }}
        />
        <div className="flex flex-col items-end gap-1">
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
          >
            {isLoading ? loadingLabel : submitLabel}
          </button>
          <span
            className="text-[10px] tracking-wide"
            style={{ color: 'var(--amika-gray-text)' }}
          >
            ⌘ + Enter
          </span>
        </div>
      </div>
    </form>
  );
}
