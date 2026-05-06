'use client';

import { useState } from 'react';
import { MODELS } from '@/lib/constants';

interface CouncilModelPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function CouncilModelPicker({
  selectedIds,
  onChange,
}: CouncilModelPickerProps) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm px-3 py-1 rounded border"
        style={{
          borderColor: 'var(--amika-gray-light)',
          backgroundColor: 'white',
        }}
      >
        Council: {selectedIds.length} models ▾
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 p-3 rounded shadow-lg border z-10 min-w-[220px]"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--amika-gray-light)',
          }}
        >
          <p
            className="text-xs mb-2"
            style={{ color: 'var(--amika-gray-text)' }}
          >
            Pick at least 3 models:
          </p>
          {MODELS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => toggle(m.id)}
              />
              <span className="text-sm">{m.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
