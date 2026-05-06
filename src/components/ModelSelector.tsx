'use client';

import { MODELS } from '@/lib/constants';

interface ModelSelectorProps {
  selectedModelId: string | undefined;
  onChange: (modelId: string | undefined) => void;
}

export default function ModelSelector({
  selectedModelId,
  onChange,
}: ModelSelectorProps) {
  return (
    <select
      value={selectedModelId ?? 'auto'}
      onChange={(e) => onChange(e.target.value === 'auto' ? undefined : e.target.value)}
      className="px-3 py-1 rounded border text-sm"
      style={{
        borderColor: 'var(--amika-gray-light)',
        backgroundColor: 'white',
      }}
    >
      <option value="auto">Auto (Router)</option>
      {MODELS.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
