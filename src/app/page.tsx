import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Handshake,
  Lock,
  PiggyBank,
  Repeat,
  Scale,
  Server,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/guard';
import { env } from '@/lib/env';
import { AppPreview } from '@/components/marketing/app-preview';
import { Button } from '@/components/ui/button';
import { PLANOS } from '@/lib/planos';

export const metadata: Metadata = {
  title: 'Controle financeiro para você e para vocês dois',
  description:
    'Cada um com seu espaço privado, mais um espaço compartilhado para as contas do casal. Divisão de despesas e acerto de contas calculado, não estimado.',
  robots: { index: true, follow: true },
};

export default async function LandingPage() {
  // Quem já entrou não tem o que fazer numa página de vendas.
  const user = await getCurrentUser();
  if (user) redirect('/painel');

  const cadastroAberto = !env().DISABLE_SIGNUP;

  return (
    <div className="min-h-dvh bg-bg">
      <Nav cadastroAberto={cadastroAberto} />
      <Hero cadastroAberto={cadastroAberto} />
      <Problema />
      <ComoFunciona />
      <Recursos />
      <Precos cadastroAberto={cadastroAberto} />
      <Perguntas />
      <Rodape />
    </div>
  );
}

/* ------------------------------------------------------------------ nav */

function Nav({ cadastroAberto }: { cadastroAberto: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem] bg-brand text-brand-fg shadow-brand">
            <Wallet className="h-[1.05rem] w-[1.05rem]" aria-hidden />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-tight text-fg">
            Controle Financeiro
          </span>
        </span>

        <nav className="flex items-center gap-1.5">
          <Link href="#precos" className="hidden px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg sm:block">
            Preços
          </Link>
          <Link href="#perguntas" className="hidden px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg sm:block">
            Perguntas
          </Link>
          <Link href="/entrar">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          {cadastroAberto && (
            <Link href="/criar-conta">
              <Button size="sm">Criar conta</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- hero */

function Hero({ cadastroAberto }: { cadastroAberto: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Brilho de fundo. Fica atrás de tudo e não intercepta cliques. */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] bg-[radial-gradient(50rem_28rem_at_50%_0%,hsl(var(--brand)/0.16),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-2xs font-semibold text-brand">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Feito para quem divide a vida — e as contas
          </span>

          <h1 className="mt-5 text-display font-bold text-fg">
            O seu dinheiro,
            <br />
            o dinheiro de vocês.
            <br />
            <span className="text-brand">Sem misturar.</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Cada um tem um espaço pessoal que ninguém mais vê. Quando quiserem,
            criam um espaço compartilhado só para as contas do casal — com
            divisão de despesas e acerto calculado até o último centavo.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {cadastroAberto ? (
              <Link href="/criar-conta">
                <Button size="xl">
                  Começar agora
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : (
              <Link href="/entrar">
                <Button size="xl">
                  Entrar
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            )}
            <Link href="#como-funciona">
              <Button variant="outline" size="xl">Ver como funciona</Button>
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {['Sem cartão de crédito', 'Seus dados no seu servidor', 'Código aberto'].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-muted">
                <Check className="h-4 w-4 shrink-0 text-income" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pl-4">
          <AppPreview />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- problema */

function Problema() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Quem paga não é sempre quem deve
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Um paga o aluguel, o outro paga o mercado. No fim do mês ninguém sabe
          quanto um deve ao outro sem sentar com a calculadora — e a planilha
          compartilhada some depois do segundo mês.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-fg">
          Os apps comuns forçam uma escolha: ou tudo é seu, ou tudo é do casal.
          <strong className="font-semibold"> A vida real não é assim.</strong>
        </p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- como funciona */

function ComoFunciona() {
  const passos = [
    {
      icone: Wallet,
      titulo: 'Você lança normalmente',
      texto:
        'Registra a despesa como faria em qualquer app: valor, data, categoria, conta.',
    },
    {
      icone: Scale,
      titulo: 'O app pergunta de quem era',
      texto:
        'Meio a meio, proporcional à renda de cada um, personalizado — ou só seu, se for gasto individual.',
    },
    {
      icone: Handshake,
      titulo: 'E fecha a conta por vocês',
      texto:
        '“Ana paga R$ 2.184,41 para Kaleo”, com a tabela mostrando como se chegou nesse número.',
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Três passos, e acabou a discussão
        </h2>
      </div>

      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {passos.map((passo, i) => (
          <li key={passo.titulo} className="card surface-sheen relative p-6">
            <span className="absolute right-5 top-5 text-money-lg font-bold leading-none text-border">
              {i + 1}
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <passo.icone className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-fg">{passo.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------- recursos */

function Recursos() {
  const itens = [
    { icone: Users, titulo: 'Espaços separados', texto: 'Um pessoal, privado. Outro compartilhado, para as contas de vocês. Você decide onde lançar cada coisa.' },
    { icone: Scale, titulo: 'Quatro formas de dividir', texto: 'Meio a meio, proporcional à renda, personalizado ou individual. Muda por lançamento.' },
    { icone: Handshake, titulo: 'Acerto de contas', texto: 'Saldo de cada um, quem paga quanto a quem, e o registro da quitação quando o Pix sai.' },
    { icone: PiggyBank, titulo: 'Orçamentos', texto: 'Limite por categoria, com aviso antes de o mês acabar. Copia do mês anterior num clique.' },
    { icone: Target, titulo: 'Metas', texto: 'Viagem, reserva de emergência, casa nova. Com aportes de quem quiser.' },
    { icone: Repeat, titulo: 'Recorrências', texto: 'Aluguel, salário e assinaturas lançados sozinhos, já divididos do jeito combinado.' },
    { icone: Lock, titulo: 'Privacidade real', texto: 'Nenhuma requisição sai da sua instalação. Sem rastreador, sem anúncio, sem venda de dado.' },
    { icone: Server, titulo: 'Você é o dono', texto: 'Roda no seu servidor. O banco é um arquivo — backup é copiar, sair é levar embora.' },
  ];

  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Tudo o que um controle financeiro precisa ter
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            E a parte que só faz sentido quando são dois.
          </p>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((item) => (
            <div key={item.titulo}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <item.icone className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              </span>
              <h3 className="mt-3.5 text-[0.9375rem] font-semibold tracking-tight text-fg">
                {item.titulo}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- preços */

function Precos({ cadastroAberto }: { cadastroAberto: boolean }) {
  return (
    <section id="precos" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Preços</h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Um preço por casal, não por pessoa. Vocês são dois, mas a conta é uma.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {PLANOS.map((plano) => (
          <div
            key={plano.id}
            className={
              plano.destaque
                ? 'card surface-sheen relative border-brand/40 p-7 shadow-lift ring-1 ring-brand/20'
                : 'card surface-sheen p-7'
            }
          >
            {plano.destaque && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand px-2.5 py-1 text-2xs font-semibold text-brand-fg shadow-brand">
                {plano.selo}
              </span>
            )}

            <h3 className="text-base font-semibold tracking-tight text-fg">{plano.nome}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{plano.resumo}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-money-lg font-bold tracking-tight text-fg">{plano.preco}</span>
              {plano.periodo && <span className="text-sm text-muted">{plano.periodo}</span>}
            </p>

            <ul className="mt-6 space-y-2.5">
              {plano.itens.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-fg">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-income" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            {/* Um <Button disabled> dentro de <Link> continuaria navegando —
                o link é que precisa sumir quando o cadastro está fechado. */}
            {plano.destino === '/criar-conta' && !cadastroAberto ? (
              <Button variant="outline" size="lg" className="mt-7 w-full" disabled>
                Cadastros fechados
              </Button>
            ) : (
              <Link
                href={plano.destino}
                className="mt-7 block"
                {...(plano.destino.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <Button
                  variant={plano.destaque ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full"
                >
                  {plano.acao}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- perguntas */

function Perguntas() {
  const faq = [
    {
      q: 'Minha parceira consegue ver meus gastos pessoais?',
      a: 'Não. O espaço pessoal é isolado: só quem é membro de um espaço enxerga o que há nele, e o pessoal tem um membro só. O que vocês compartilham é o que for lançado no espaço compartilhado.',
    },
    {
      q: 'Preciso informar minha renda?',
      a: 'Só se quiserem usar a divisão proporcional à renda. É opcional, fica visível apenas dentro daquele espaço e não aparece em relatório nenhum.',
    },
    {
      q: 'O app move dinheiro? Conecta com meu banco?',
      a: 'Não faz nem uma coisa nem outra. O Pix acontece no app do seu banco; aqui fica o registro de quem pagou o quê e de quanto ficou acertado. Isso é proposital — sem acesso à sua conta bancária, não há o que vazar.',
    },
    {
      q: 'E se a gente parar de usar?',
      a: 'Seus dados são um arquivo no seu servidor. Você copia e leva embora. Não há aprisionamento porque não há nada nosso no meio.',
    },
    {
      q: 'Funciona no celular?',
      a: 'Foi desenhado a partir dele. Dá para instalar na tela de início e usar em tela cheia, como um app comum.',
    },
    {
      q: 'Serve para quem usa sozinho?',
      a: 'Serve. Todo mundo começa assim: no cadastro você ganha um espaço pessoal, com contas, categorias, orçamentos e metas. O espaço compartilhado é opcional e vem depois, se fizer sentido.',
    },
  ];

  return (
    <section id="perguntas" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Perguntas frequentes
        </h2>

        <dl className="mt-12 divide-y divide-border">
          {faq.map((item) => (
            <div key={item.q} className="py-6 first:pt-0 last:pb-0">
              <dt className="text-[0.9375rem] font-semibold text-fg">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- rodapé */

function Rodape() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-brand-fg">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
          </span>
          Controle Financeiro
        </span>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <Link href="/entrar" className="transition-colors hover:text-fg">Entrar</Link>
          <Link href="#precos" className="transition-colors hover:text-fg">Preços</Link>
          <Link href="/ajuda/senha" className="transition-colors hover:text-fg">Ajuda</Link>
        </nav>
      </div>
    </footer>
  );
}
