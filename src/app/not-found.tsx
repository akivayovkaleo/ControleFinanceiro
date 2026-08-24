import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Compass className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        O endereço não existe, ou o item que você procurava foi removido.
      </p>
      <Link href="/painel" className="mt-6">
        <Button>Ir para o painel</Button>
      </Link>
    </main>
  );
}
