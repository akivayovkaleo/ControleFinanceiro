import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wallet } from 'lucide-react';

/**
 * Moldura das telas de entrada.
 *
 * A coluna da direita (só em telas grandes) explica o que o app faz. Quem
 * chega no login pela primeira vez merece contexto; no celular ela some para
 * não empurrar o formulário para baixo da dobra.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-brand">
              <Wallet className="h-[1.15rem] w-[1.15rem]" aria-hidden />
            </span>
            <span className="text-[0.9375rem] font-semibold tracking-tight text-fg">Controle Financeiro</span>
          </Link>

          <h1 className="text-[1.75rem] font-bold tracking-tight text-fg">{title}</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 text-sm text-muted">{footer}</div>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-surface-2 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_70%_20%,hsl(var(--brand)/0.14),transparent)]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-fg">
            O seu dinheiro, o dinheiro de vocês — sem misturar.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            Cada pessoa tem um espaço pessoal, privado. Quando quiserem, criam um
            espaço compartilhado só para as contas do casal.
          </p>

          <ul className="mt-10 space-y-4 text-sm">
            {[
              ['Divisão automática', 'Meio a meio, proporcional à renda ou do jeito que combinarem.'],
              ['Acerto de contas', '"A Ana deve R$ 312,50 ao Kaleo" — calculado, não estimado.'],
              ['Orçamentos e metas', 'Saiba onde o dinheiro está indo antes do mês acabar.'],
            ].map(([title, description]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <div>
                  <p className="font-medium text-fg">{title}</p>
                  <p className="mt-0.5 text-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
