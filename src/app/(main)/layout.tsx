'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Mic, FolderOpen, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';

const navItems = [
  { href: '/home', icon: Mic, label: 'Record' },
  { href: '/meetings', icon: FolderOpen, label: 'Meetings' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // Auth guard - only redirect unauthenticated users to auth page
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="pb-20 md:pb-0 md:ml-20">
        <div className="app-container">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border md:hidden z-50">
        <div className="flex justify-around items-center h-16 max-w-[480px] mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/home' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
                  isActive ? 'text-accent-light' : 'text-text-muted'
                }`}
              >
                <item.icon size={24} />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Side Navigation (desktop) */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-surface border-r border-border hidden md:flex flex-col items-center py-8 gap-6 z-50">
        <div className="mb-4">
          <img 
            src="/1024x1024.png" 
            alt="Legal Memo" 
            className="w-10 h-10 rounded-xl object-cover"
          />
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/home' && pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                isActive 
                  ? 'text-accent-light bg-accent-light/10' 
                  : 'text-text-muted hover:text-text hover:bg-surface-light'
              }`}
            >
              <item.icon size={24} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

