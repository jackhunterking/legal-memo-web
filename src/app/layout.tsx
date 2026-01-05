import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PostHogProvider } from '@/components/PostHogProvider';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Legal Memo',
  description: 'AI-powered legal meeting transcription and analysis',
  icons: {
    icon: '/favicon.png',
    apple: '/1024x1024.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <PostHogProvider>
          <Providers>
            {children}
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
