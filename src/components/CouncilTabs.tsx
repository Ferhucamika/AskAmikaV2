'use client';

import { useState } from 'react';
import MarkdownMessage from './MarkdownMessage';

interface Response {
  model: string;
  response: string;
}

interface CouncilTabsProps {
  responses: Response[];
  orchestratorSummary: string;
}

export default function CouncilTabs({
  responses,
  orchestratorSummary,
}: CouncilTabsProps) {
  if (!responses || responses.length === 0) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<'orchestrator' | number>('orchestrator');

  const tabs: Array<{ id: 'orchestrator' | number; label: string }> = [
    { id: 'orchestrator', label: 'Orchestrator' },
    ...responses.map((r, i) => ({ id: i, label: r.model })),
  ];

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: 'var(--amika-gray-light)' }}
    >
      <div className="flex border-b" style={{ borderColor: 'var(--amika-gray-light)' }}>
        {tabs.map((tab) => (
          <button
            key={String(tab.id)}
            onClick={() => setActiveTab(tab.id as 'orchestrator' | number)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{
              backgroundColor:
                activeTab === tab.id
                  ? 'var(--amika-orange)'
                  : 'var(--amika-gray-light)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        <div
          className="rounded p-3 text-sm"
          style={{ backgroundColor: 'var(--amika-gray-light)' }}
        >
          {activeTab === 'orchestrator' ? (
            <MarkdownMessage content={orchestratorSummary} />
          ) : (
            <>
              <MarkdownMessage content={responses[activeTab as number].response} />
              <div
                className="text-xs mt-3 pt-2 border-t font-medium"
                style={{
                  color: 'var(--amika-gray-text)',
                  borderColor: 'rgba(0,0,0,0.1)',
                }}
              >
                Model: {responses[activeTab as number].model}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
