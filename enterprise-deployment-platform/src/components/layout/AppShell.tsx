import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { NowPlayingBar } from '@/components/player/NowPlayingBar';
import { PageTransition } from '@/components/ui/PageTransition';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-black text-foreground">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 rounded-none md:rounded-t-lg md:my-2 md:mr-2 bg-background overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto scrollbar-spotify">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <NowPlayingBar />
      <MobileNav />
    </div>
  );
}
