import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/**
 * Tipografia.
 *
 * A Inter foi escolhida por causa dos números: ela tem versão tabular de
 * verdade, o zero cortado (`ss03`) não se confunde com "O" num extrato, e o
 * "1" tem serifa de base, então não vira "l". Num app onde a pessoa lê
 * colunas de valores, isso não é detalhe.
 *
 * `next/font` baixa a fonte no build e serve do próprio domínio — nenhuma
 * requisição sai para o Google em produção, o que mantém a CSP fechada em
 * `font-src 'self'` e não vaza o IP de quem usa o app.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Controle Financeiro',
    template: '%s · Controle Financeiro',
  },
  description:
    'Controle financeiro pessoal e para casais: lançamentos, orçamentos, metas e acerto de contas.',
  applicationName: 'Controle Financeiro',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Financeiro' },
  formatDetection: { telephone: false },
  // Um app de finanças pessoais não tem nada a ganhar sendo indexado.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1219' },
  ],
};

/**
 * Aplica o tema ANTES da primeira pintura.
 *
 * Sem isso, a página aparece clara por um instante e depois pisca para o
 * escuro. O script é minúsculo e roda síncrono no <head> de propósito.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('cf-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (stored !== 'light' && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
