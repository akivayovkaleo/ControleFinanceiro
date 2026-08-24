'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PALETTE } from '@/lib/presets';
import { cn } from '@/lib/utils';

/**
 * Seletor de cor por paleta fixa.
 *
 * Um `<input type="color">` deixaria escolher cinza sobre cinza e quebraria o
 * contraste dos gráficos. A paleta curada garante que qualquer escolha
 * continue legível nos dois temas.
 */
export function ColorPicker({
  name,
  label = 'Cor',
  defaultValue,
}: {
  name: string;
  label?: string;
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState(defaultValue ?? PALETTE[0]);

  return (
    <div>
      <p className="label-base">{label}</p>
      <input type="hidden" name={name} value={selected} />
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected === color}
            aria-label={`Cor ${color}`}
            onClick={() => setSelected(color)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-transform',
              selected === color ? 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'hover:scale-105',
            )}
            style={{ backgroundColor: color }}
          >
            {selected === color && <Check className="h-4 w-4 text-white" aria-hidden />}
          </button>
        ))}
      </div>
    </div>
  );
}
