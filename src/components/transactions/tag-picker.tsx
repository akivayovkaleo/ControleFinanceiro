'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Field } from '@/components/ui/field';

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

/**
 * Escolha de etiquetas.
 *
 * Botões que alternam, e não um `<select multiple>`: no celular, o select
 * múltiplo nativo é quase impossível de usar, e aqui a lista é curta o
 * suficiente para caber na tela inteira.
 *
 * O valor sai num único campo escondido, separado por vírgula, porque
 * `FormData` não transporta array de forma confiável — o schema em
 * validation/tags.ts desmonta a string de volta.
 */
export function TagPicker({
  tags,
  defaultSelected = [],
  disabled,
  spaceId,
}: {
  tags: TagOption[];
  defaultSelected?: string[];
  disabled?: boolean;
  spaceId: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);

  if (tags.length === 0) {
    return (
      <Field label="Etiquetas" hint="Nenhuma etiqueta criada ainda">
        <p className="text-sm text-muted">
          Etiquetas juntam gastos de categorias diferentes que pertencem à mesma coisa — a
          passagem, o hotel e o restaurante da mesma viagem.{' '}
          <Link
            href={{ pathname: '/categorias', query: { space: spaceId } }}
            className="font-medium text-brand hover:underline"
          >
            Criar a primeira
          </Link>
          .
        </p>
      </Field>
    );
  }

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  };

  return (
    <Field label="Etiquetas" hint="Opcional — a que isso se refere">
      <input type="hidden" name="tagIds" value={selected.join(',')} />
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isOn = selected.includes(tag.id);

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={disabled}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                isOn
                  ? 'border-transparent text-fg'
                  : 'border-border text-muted hover:border-brand/40 hover:text-fg'
              }`}
              style={isOn ? { backgroundColor: `${tag.color}22`, borderColor: tag.color } : undefined}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden
              />
              {tag.name}
              {isOn && <Check className="h-3 w-3" aria-hidden />}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
