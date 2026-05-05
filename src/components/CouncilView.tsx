'use client';

import { useState } from 'react';
import OrchestratorSummary from './OrchestratorSummary';

interface CouncilMember {
  model: string;
  response: string;
}

interface CouncilData {
  responses: CouncilMember[];
  orchestratorSummary: string;
}

interface CouncilViewProps {
  question: string;
}

export default function CouncilView({ question }: CouncilViewProps) {
  const [data, setData] = useState<CouncilData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!response.ok) {
        throw new Error(`Council API responded ${response.status}`);
      }
      setData((await response.json()) as CouncilData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      className="mt-6 p-4 border-t"
      style={{ borderColor: 'var(--amika-gray-light)' }}
    >
      <h2 className="text-2xl font-bold mb-4">Council</h2>

      {!data && !error && (
        <button onClick={generate} disabled={isLoading} className="btn-primary">
          {isLoading ? 'Generating Council...' : 'Get Council Perspective'}
        </button>
      )}

      {error && (
        <div
          className="p-3 rounded mb-3 text-white"
          style={{ backgroundColor: 'var(--amika-coral)' }}
        >
          {error}
          <button
            onClick={() => {
              setError(null);
              setData(null);
            }}
            className="ml-3 underline"
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {data.responses.map((member) => (
              <div
                key={member.model}
                className="border rounded-lg p-4"
                style={{ borderColor: 'var(--amika-gray-light)' }}
              >
                <h3 className="font-bold mb-2">{member.model}</h3>
                <div
                  className="text-sm rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap"
                  style={{ backgroundColor: 'var(--amika-gray-light)' }}
                >
                  {member.response}
                </div>
              </div>
            ))}
          </div>

          <OrchestratorSummary summary={data.orchestratorSummary} />
        </>
      )}
    </section>
  );
}
