import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';

export const metadata: Metadata = { title: 'Recuperar senha' };

/**
 * Recuperação de senha.
 *
 * Não há "esqueci minha senha" por e-mail: isso exigiria um servidor SMTP
 * configurado, e numa instalação caseira essa dependência costuma estar
 * quebrada justo no dia em que se precisa dela. Em vez de prometer algo que
 * não funciona, explicamos o caminho real — o comando de reset no servidor.
 */
export default function PasswordHelpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-10">
      <Link
        href="/entrar"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para o login
      </Link>

      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <KeyRound className="h-6 w-6" aria-hidden />
      </span>

      <h1 className="text-2xl font-semibold tracking-tight text-fg">Esqueceu a senha?</h1>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Esta instalação não envia e-mail de recuperação — seria preciso configurar um
          servidor de e-mail, e uma dependência dessas costuma falhar justamente quando
          você mais precisa.
        </p>

        <p>
          A redefinição é feita por quem administra o servidor, com um comando direto no
          banco:
        </p>

        <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 text-xs text-fg">
          <code>npm run senha -- seu@email.com</code>
        </pre>

        <p>
          O comando pede a nova senha e encerra todas as sessões abertas daquela conta.
        </p>

        <p className="text-xs">
          Se você divide o app com alguém, peça para essa pessoa rodar o comando — ou
          rode você mesmo, se tiver acesso à máquina onde o app está instalado.
        </p>
      </div>
    </main>
  );
}
