/**
 * Middleware de borda.
 *
 * ATENÇÃO — ISTO NÃO É A FRONTEIRA DE SEGURANÇA. O middleware roda no Edge,
 * sem acesso ao banco, então só sabe se existe um cookie com assinatura
 * válida. Ele existe para evitar carregar uma página inteira antes de
 * redirecionar. Quem realmente decide acesso é `requireUser()` /
 * `requireSpace()` no servidor, consultando a tabela de sessões.
 *
 * Também bloqueia requisições que mudam estado vindas de outra origem
 * (defesa em profundidade contra CSRF, além do SameSite do cookie).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

const PUBLIC_ROUTES = ['/entrar', '/criar-conta', '/'];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CSRF: uma requisição que muda estado precisa vir da própria origem.
  if (MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    if (origin) {
      const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = null;
      }
      if (!originHost || !host || originHost !== host) {
        return new NextResponse('Origem não permitida.', { status: 403 });
      }
    }
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Sem cookie numa rota privada → login, guardando para onde a pessoa ia.
  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    if (pathname !== '/') url.searchParams.set('proximo', pathname);
    return NextResponse.redirect(url);
  }

  // Com cookie nas telas de entrada → direto para o painel.
  if (hasSession && (pathname === '/entrar' || pathname === '/criar-conta' || pathname === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/painel';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Tudo, menos assets estáticos e o manifest — o middleware não tem o que
     * decidir sobre eles e rodar à toa custa latência.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt).*)',
  ],
};
