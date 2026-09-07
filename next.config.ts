import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * Ver docs/SEGURANCA.md para o racional de cada um.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next injeta scripts inline de hidratação; 'unsafe-inline' é necessário
      // no App Router sem nonce por requisição. Ver docs/SEGURANCA.md.
      "script-src 'self' 'unsafe-inline'" +
        (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  serverExternalPackages: ['@node-rs/argon2'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      /**
       * Anexos são bytes que um usuário subiu, então merecem a política mais
       * apertada que existe: nada carrega, nada executa, e a resposta fica
       * isolada num sandbox.
       *
       * Precisa estar aqui, e não só nos cabeçalhos da rota: os headers do
       * next.config são aplicados por cima da resposta e sobrescreveriam o
       * CSP que a rota define. Esta entrada vem depois da geral, então é ela
       * que vale para este caminho.
       */
      {
        source: '/api/anexos/:path*',
        headers: [
          ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy'),
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; img-src 'self'; frame-ancestors 'none'; sandbox",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
