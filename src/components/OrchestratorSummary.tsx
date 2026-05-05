'use client';

interface OrchestratorSummaryProps {
  summary: string;
}

export default function OrchestratorSummary({ summary }: OrchestratorSummaryProps) {
  return (
    <div
      className="mt-6 p-4 rounded-lg text-white"
      style={{ backgroundColor: 'var(--amika-orange)' }}
    >
      <h3 className="text-xl font-bold mb-3">Orchestrator Synthesis</h3>
      <p className="leading-relaxed whitespace-pre-wrap">{summary}</p>
    </div>
  );
}
