'use client';

import { Artifact } from '@/lib/types';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ArtifactPanel({
  artifacts,
  isOpen,
  onClose,
}: ArtifactPanelProps) {
  if (!isOpen || artifacts.length === 0) return null;

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content);
  };

  return (
    <aside
      className="fixed right-0 top-0 h-screen w-2/5 bg-white shadow-lg overflow-y-auto z-50 border-l"
      style={{ borderColor: 'var(--amika-gray-light)' }}
      aria-label="Artifacts panel"
    >
      <header
        className="p-4 border-b flex justify-between items-center"
        style={{ borderColor: 'var(--amika-gray-light)' }}
      >
        <h2 className="text-xl font-bold">Artifacts</h2>
        <button
          onClick={onClose}
          aria-label="Close artifacts panel"
          className="text-2xl leading-none px-2"
        >
          &times;
        </button>
      </header>

      <div className="p-4 space-y-4">
        {artifacts.map((artifact) => (
          <div
            key={artifact.id}
            className="border rounded-lg p-4"
            style={{ borderColor: 'var(--amika-gray-light)' }}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                {artifact.title ?? artifact.type}
              </h3>
              {artifact.language && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--amika-gray-light)',
                    color: 'var(--amika-gray-text)',
                  }}
                >
                  {artifact.language}
                </span>
              )}
            </div>
            <pre
              className="rounded p-3 text-sm overflow-x-auto whitespace-pre-wrap"
              style={{ backgroundColor: 'var(--amika-gray-light)' }}
            >
              <code
                className={artifact.language ? `language-${artifact.language}` : ''}
              >
                {artifact.content}
              </code>
            </pre>
            <button
              onClick={() => handleCopy(artifact.content)}
              className="mt-2 text-sm px-3 py-1 rounded text-white"
              style={{ backgroundColor: 'var(--amika-orange)' }}
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
