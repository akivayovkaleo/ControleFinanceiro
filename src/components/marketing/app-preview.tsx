import { ArrowRight, Handshake } from 'lucide-react';
import { Money } from '@/components/ui/money';
import { Avatar } from '@/components/ui/avatar';

/**
 * Prévia do app na página de vendas.
 *
 * É a interface de verdade remontada em miniatura, não uma captura de tela:
 * fica nítida em qualquer resolução, acompanha o tema claro/escuro e não
 * envelhece quando o produto muda. Os números são fictícios e plausíveis.
 */
export function AppPreview() {
  const categorias = [
    { nome: 'Moradia', valor: 220000, cor: '#e2681f', pct: 42 },
    { nome: 'Mercado', valor: 132649, cor: '#4f9c1f', pct: 25 },
    { nome: 'Restaurante', valor: 33556, cor: '#d63c3c', pct: 6 },
    { nome: 'Transporte', valor: 29047, cor: '#3b6fd4', pct: 6 },
    { nome: 'Lazer', valor: 26667, cor: '#d9599b', pct: 5 },
  ];

  return (
    <div className="card surface-sheen overflow-hidden p-4 shadow-pop sm:p-5">
      {/* barra de janela */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        <span className="ml-2 text-2xs text-subtle">Nossa casa · agosto</span>
      </div>

      {/* indicadores */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { rotulo: 'Receitas', valor: 1100000, tom: 'income' as const },
          { rotulo: 'Despesas', valor: 527907, tom: 'expense' as const },
          { rotulo: 'Sobrou', valor: 572093, tom: 'neutral' as const },
        ].map((item) => (
          <div key={item.rotulo} className="rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-subtle">
              {item.rotulo}
            </p>
            <div className="mt-1">
              <Money cents={item.valor} tone={item.tom} size="sm" />
            </div>
          </div>
        ))}
      </div>

      {/* acerto — o diferencial em destaque */}
      <div className="mt-3 rounded-xl border border-brand-border bg-brand-soft px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="text-xs font-semibold text-brand">Acerto em aberto</p>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <Avatar name="Ana Silva" color="#d9599b" size="xs" />
          <span className="text-xs font-medium text-fg">Ana</span>
          <ArrowRight className="h-3 w-3 text-subtle" aria-hidden />
          <Avatar name="Kaleo Souza" color="#3b6fd4" size="xs" />
          <span className="text-xs font-medium text-fg">Kaleo</span>
          <Money cents={218441} tone="neutral" size="sm" className="ml-auto" />
        </div>
      </div>

      {/* categorias */}
      <div className="mt-3 space-y-2">
        {categorias.map((c) => (
          <div key={c.nome}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-fg">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.cor }}
                  aria-hidden
                />
                {c.nome}
              </span>
              <Money cents={c.valor} tone="neutral" size="xs" />
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.pct}%`, backgroundColor: c.cor }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
