'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArchiveRestore, Check, Plus, Trash2, X } from 'lucide-react';
import {
  deleteCategoryAction,
  restoreCategoryAction,
  saveCategoryAction,
} from '@/server/actions/catalog';
import { idleState } from '@/server/actions/types';
import { PALETTE } from '@/lib/presets';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface CategoryItem {
  id: string;
  name: string;
  kind: 'INCOME' | 'EXPENSE';
  color: string;
  archived: boolean;
  transactionCount: number;
}

/**
 * Gerenciador de categorias.
 *
 * Categorias são muitas e mexidas em lote, então tudo acontece na própria
 * lista: criar no topo, renomear clicando, trocar a cor no ponto colorido.
 * Nenhum modal.
 */
export function CategoryManager({
  spaceId,
  categories,
  kind,
}: {
  spaceId: string;
  categories: CategoryItem[];
  kind: 'INCOME' | 'EXPENSE';
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveState, saveAction] = useActionState(saveCategoryAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteCategoryAction, idleState);
  const [, restoreAction] = useActionState(restoreCategoryAction, idleState);

  useEffect(() => {
    if (saveState.ok) {
      setCreating(false);
      setEditingId(null);
      router.refresh();
    }
  }, [saveState.ok, router]);

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  return (
    <div>
      {saveState.error && (
        <Alert tone="error" className="mb-3">
          {saveState.error}
        </Alert>
      )}
      {deleteState.message && (
        <Alert tone="info" className="mb-3">
          {deleteState.message}
        </Alert>
      )}

      {creating ? (
        <CategoryFields
          spaceId={spaceId}
          kind={kind}
          formAction={saveAction}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="mb-3">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Nova categoria
        </Button>
      )}

      <ul className="divide-y divide-border">
        {active.map((category) =>
          editingId === category.id ? (
            <li key={category.id} className="py-2">
              <CategoryFields
                spaceId={spaceId}
                kind={kind}
                category={category}
                formAction={saveAction}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={category.id} className="flex items-center gap-2.5 py-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setEditingId(category.id)}
                className="min-w-0 flex-1 truncate text-left text-sm text-fg hover:underline"
              >
                {category.name}
              </button>

              {category.transactionCount > 0 && (
                <span className="shrink-0 text-2xs text-muted">
                  {category.transactionCount}
                </span>
              )}

              <form action={deleteAction} className="shrink-0">
                <input type="hidden" name="spaceId" value={spaceId} />
                <input type="hidden" name="categoryId" value={category.id} />
                <button
                  type="submit"
                  aria-label={`Excluir ${category.name}`}
                  title={
                    category.transactionCount > 0
                      ? 'Tem lançamentos — será arquivada'
                      : 'Excluir'
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </form>
            </li>
          ),
        )}
      </ul>

      {archived.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted hover:text-fg">
            {archived.length} categoria{archived.length > 1 ? 's' : ''} arquivada
            {archived.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {archived.map((category) => (
              <li key={category.id} className="flex items-center gap-2.5 py-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full opacity-50"
                  style={{ backgroundColor: category.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {category.name}
                </span>
                <Badge>{category.transactionCount} lançamentos</Badge>
                <form action={restoreAction}>
                  <input type="hidden" name="spaceId" value={spaceId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button
                    type="submit"
                    aria-label={`Reativar ${category.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle transition-colors hover:text-fg"
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CategoryFields({
  spaceId,
  kind,
  category,
  formAction,
  onCancel,
}: {
  spaceId: string;
  kind: 'INCOME' | 'EXPENSE';
  category?: CategoryItem;
  formAction: (payload: FormData) => void;
  onCancel: () => void;
}) {
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);

  return (
    <form action={formAction} className="mb-3 rounded-xl border border-border bg-surface-2/50 p-3">
      <input type="hidden" name="spaceId" value={spaceId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="color" value={color} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}

      <div className="flex items-center gap-2">
        <input
          name="name"
          defaultValue={category?.name}
          placeholder="Nome da categoria"
          maxLength={40}
          autoFocus
          required
          aria-label="Nome da categoria"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand"
        />
        <SubmitButton size="icon" aria-label="Salvar">
          <Check className="h-4 w-4" aria-hidden />
        </SubmitButton>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancelar">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor">
        {PALETTE.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={color === option}
            aria-label={`Cor ${option}`}
            onClick={() => setColor(option)}
            className={cn(
              'h-6 w-6 rounded-md transition-transform',
              color === option
                ? 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface'
                : 'hover:scale-105',
            )}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>
    </form>
  );
}
