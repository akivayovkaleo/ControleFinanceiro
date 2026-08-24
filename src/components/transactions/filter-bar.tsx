'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Filtros do extrato.
 *
 * Tudo vai para a query string, não para estado local: assim o filtro
 * sobrevive a recarregar a página, pode ser compartilhado por link e o
 * botão "voltar" do navegador funciona como a pessoa espera.
 */
export function FilterBar({
  categories,
  accounts,
  members,
}: {
  categories: Array<{ id: string; name: string; kind: string }>;
  accounts: Array<{ id: string; name: string }>;
  members: Array<{ id: string; displayName: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('busca') ?? '');

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  // Debounce da busca: sem isso, cada tecla dispararia uma navegação.
  useEffect(() => {
    const current = searchParams.get('busca') ?? '';
    if (search === current) return;

    const timer = setTimeout(() => update('busca', search), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeFilters = ['tipo', 'categoria', 'conta', 'pessoa', 'busca'].filter((key) =>
    searchParams.get(key),
  );

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of activeFilters) params.delete(key);
    setSearch('');
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    'h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg outline-none transition-colors focus:border-brand';

  return (
    <div className="mb-4 space-y-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descrição…"
          aria-label="Buscar lançamentos"
          className="input-base pl-9"
        />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        <select
          value={searchParams.get('tipo') ?? ''}
          onChange={(e) => update('tipo', e.target.value)}
          aria-label="Filtrar por tipo"
          className={cn(selectClass, 'shrink-0')}
        >
          <option value="">Todos os tipos</option>
          <option value="EXPENSE">Despesas</option>
          <option value="INCOME">Receitas</option>
          <option value="TRANSFER">Transferências</option>
        </select>

        <select
          value={searchParams.get('categoria') ?? ''}
          onChange={(e) => update('categoria', e.target.value)}
          aria-label="Filtrar por categoria"
          className={cn(selectClass, 'shrink-0')}
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get('conta') ?? ''}
          onChange={(e) => update('conta', e.target.value)}
          aria-label="Filtrar por conta"
          className={cn(selectClass, 'shrink-0')}
        >
          <option value="">Todas as contas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        {members.length > 1 && (
          <select
            value={searchParams.get('pessoa') ?? ''}
            onChange={(e) => update('pessoa', e.target.value)}
            aria-label="Filtrar por pessoa"
            className={cn(selectClass, 'shrink-0')}
          >
            <option value="">Todo mundo</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                Pago por {member.displayName}
              </option>
            ))}
          </select>
        )}

        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
