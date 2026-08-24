'use client';

import { SpaceSwitcher, type SpaceOption } from './space-switcher';
import { ThemeToggle } from './theme-toggle';

/** Cabeçalho do celular: só o seletor de espaço e o tema. */
export function MobileHeader({
  spaces,
  activeSpaceId,
}: {
  spaces: SpaceOption[];
  activeSpaceId: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SpaceSwitcher spaces={spaces} activeSpaceId={activeSpaceId} />
        </div>
        <ThemeToggle compact />
      </div>
    </header>
  );
}
