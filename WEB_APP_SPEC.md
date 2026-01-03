# Legal Memo Web App - Complete Specification

A Next.js web application that mirrors the mobile app experience with minimal, mobile-like UI. Shares the same Supabase backend and Polar payment system - **NO backend changes required**.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Architecture Overview](#2-architecture-overview)
3. [Shared Code from Mobile](#3-shared-code-from-mobile)
4. [Design System](#4-design-system)
5. [Page Specifications](#5-page-specifications)
6. [Components Library](#6-components-library)
7. [API Integration](#7-api-integration)
8. [Web Recording Implementation](#8-web-recording-implementation)
9. [State Management](#9-state-management)
10. [Authentication Flow](#10-authentication-flow)
11. [Deployment](#11-deployment)

---

## 1. Project Setup

### Initialize Next.js Project

```bash
cd /Users/metinhakanokuyucu
npx create-next-app@latest legal-memo-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd legal-memo-web
```

### Install Dependencies

```bash
npm install @supabase/supabase-js @tanstack/react-query zustand lucide-react framer-motion clsx tailwind-merge
npm install -D @types/node
```

### Environment Variables

Create `.env.local`:

```env
# Supabase (same as mobile - use values from mobile .env)
NEXT_PUBLIC_SUPABASE_URL=https://jaepslscnnjtowwkiudu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Polar Payments (same as mobile)
NEXT_PUBLIC_POLAR_CHECKOUT_URL=https://jaepslscnnjtowwkiudu.supabase.co/functions/v1/polar-checkout
NEXT_PUBLIC_POLAR_PRODUCT_PRICE_ID=your_production_price_id
NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_PRICE_ID=your_sandbox_price_id
NEXT_PUBLIC_POLAR_MODE=production
```

### Tailwind Configuration

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legal Memo color palette (from mobile app)
        primary: '#1A1A2E',
        'primary-light': '#16213E',
        accent: '#0F3460',
        'accent-light': '#E94560',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#0F0F1A',
        surface: '#1A1A2E',
        'surface-light': '#252542',
        text: '#FFFFFF',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
        border: '#2D2D4A',
        'border-light': '#3D3D5C',
        recording: '#EF4444',
      },
      maxWidth: {
        'app': '480px', // Mobile-like width
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

---

## 2. Architecture Overview

### Project Structure

```
legal-memo-web/
├── src/
│   ├── app/
│   │   ├── (main)/                 # Authenticated routes
│   │   │   ├── layout.tsx          # Main layout with navigation
│   │   │   ├── page.tsx            # Home/Recording screen
│   │   │   ├── meetings/
│   │   │   │   └── page.tsx
│   │   │   ├── meeting/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── contacts/
│   │   │   │   └── page.tsx
│   │   │   ├── contact/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── recording/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── auth/
│   │   │   └── page.tsx
│   │   ├── subscription/
│   │   │   └── page.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing/redirect
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Badge.tsx
│   │   ├── Navigation.tsx
│   │   ├── RecordButton.tsx
│   │   ├── MeetingCard.tsx
│   │   ├── ContactCard.tsx
│   │   ├── LiveTranscript.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── TranscriptSegment.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useMeetings.ts
│   │   ├── useContacts.ts
│   │   ├── useUsage.ts
│   │   ├── useRecording.ts
│   │   └── useStreamingTranscription.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── colors.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── stores/
│       └── auth-store.ts
├── public/
│   └── favicon.ico
├── .env.local
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Shared Code from Mobile

### Types (copy from mobile, adapt)

Copy `/Users/metinhakanokuyucu/rork-legal-meeting-assistant/types/index.ts` and modify:

```typescript
// src/types/index.ts
// Remove: import * as Crypto from 'expo-crypto';

// Replace generateShareToken function:
export function generateShareToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

### Colors (copy directly)

```typescript
// src/lib/colors.ts
const Colors = {
  primary: '#1A1A2E',
  primaryLight: '#16213E',
  accent: '#0F3460',
  accentLight: '#E94560',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  border: '#2D2D4A',
  borderLight: '#3D3D5C',
  
  recording: '#EF4444',
  recordingPulse: 'rgba(239, 68, 68, 0.3)',
  
  statusProcessing: '#F59E0B',
  statusReady: '#10B981',
  statusFailed: '#EF4444',
  
  certaintyExplicit: '#10B981',
  certaintyUnclear: '#F59E0B',
};

export default Colors;
```

### Supabase Client (web version)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Initialize auth for Edge Functions
let functionsAuthInitialized = false;
let currentAuthToken: string | null = null;

export async function initSupabaseAuthForFunctions(): Promise<void> {
  if (functionsAuthInitialized) return;
  
  const { data: { session } } = await supabase.auth.getSession();
  currentAuthToken = session?.access_token ?? null;
  await supabase.functions.setAuth(currentAuthToken ?? '');
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    currentAuthToken = session?.access_token ?? null;
    await supabase.functions.setAuth(currentAuthToken ?? '');
  });
  
  functionsAuthInitialized = true;
}

export function getFunctionsAuthStatus() {
  return {
    initialized: functionsAuthInitialized,
    hasToken: !!currentAuthToken,
  };
}
```

---

## 4. Design System

### Design Philosophy

The web app should feel like a **native mobile app running in the browser**, not a traditional SaaS dashboard.

#### Key Principles:

1. **Single-column layout** - Max width 480px, centered
2. **Card-based UI** - Everything in cards with rounded corners
3. **Dark theme** - Same color palette as mobile
4. **Minimal navigation** - Bottom nav on mobile, side nav on desktop
5. **Large touch targets** - 44px minimum for interactive elements
6. **Generous spacing** - 16-24px padding throughout

### Global Styles

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0F0F1A;
  --surface: #1A1A2E;
  --surface-light: #252542;
  --text: #FFFFFF;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --border: #2D2D4A;
  --accent-light: #E94560;
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}

html {
  background-color: var(--background);
  color: var(--text);
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* Mobile-like container */
.app-container {
  @apply mx-auto max-w-app min-h-screen px-6;
}

/* Card style */
.card {
  @apply bg-surface rounded-2xl border border-border p-4;
}

/* Button variants */
.btn-primary {
  @apply bg-accent-light text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity;
}

.btn-secondary {
  @apply bg-surface-light text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity;
}

/* Input style */
.input {
  @apply w-full bg-surface border border-border rounded-xl px-4 py-4 text-text placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors;
}
```

---

## 5. Page Specifications

### Root Layout (`src/app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Legal Memo',
  description: 'AI-powered legal meeting transcription',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Main Layout (`src/app/(main)/layout.tsx`)

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Mic, FolderOpen, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/', icon: Mic, label: 'Record' },
  { href: '/meetings', icon: FolderOpen, label: 'Meetings' },
  { href: '/contacts', icon: Users, label: 'Contacts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Redirect to auth if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.replace('/auth');
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <main className="pb-20 md:pb-0 md:pl-20">
        <div className="app-container">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border md:hidden">
        <div className="flex justify-around items-center h-16 max-w-app mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 py-2 px-4 ${
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
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-surface border-r border-border hidden md:flex flex-col items-center py-8 gap-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl ${
                isActive ? 'text-accent-light bg-accent-light/10' : 'text-text-muted hover:text-text'
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
```

### Home Page (`src/app/(main)/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, User, Users } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import { motion } from 'framer-motion';

type ExpectedSpeakers = 1 | 2 | 3;

export default function HomePage() {
  const router = useRouter();
  const { createMeeting, isCreating } = useMeetings();
  const { canRecord, isTrialExpired } = useUsage();
  const [expectedSpeakers, setExpectedSpeakers] = useState<ExpectedSpeakers>(2);

  const handleStartRecording = async () => {
    if (!canRecord) {
      router.push('/subscription');
      return;
    }

    try {
      const meeting = await createMeeting(expectedSpeakers);
      router.push(`/recording/${meeting.id}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to start recording');
    }
  };

  return (
    <div className="pt-8 pb-24 flex flex-col items-center min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-8">Start Recording</h1>

      {/* Speaker Selector */}
      <div className="w-full mb-8">
        <p className="text-sm font-semibold text-text-muted text-center mb-3 uppercase tracking-wide">
          Number of Speakers
        </p>
        <div className="flex bg-surface rounded-xl p-1">
          {[
            { value: 1, label: 'Solo', icon: User },
            { value: 2, label: '2 People', icon: Users },
            { value: 3, label: '3+', icon: Users },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setExpectedSpeakers(option.value as ExpectedSpeakers)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                expectedSpeakers === option.value
                  ? 'bg-accent-light text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <option.icon size={18} />
              <span className="text-sm font-semibold">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Record Button */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Pulse Ring */}
          <motion.div
            className="absolute inset-0 bg-accent-light rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ width: 220, height: 220 }}
          />
          
          {/* Main Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            disabled={isCreating}
            className={`w-[180px] h-[180px] rounded-full flex items-center justify-center shadow-2xl ${
              isTrialExpired
                ? 'bg-surface-light'
                : 'bg-accent-light'
            }`}
            style={{
              boxShadow: isTrialExpired 
                ? 'none' 
                : '0 12px 24px rgba(233, 69, 96, 0.5)',
            }}
          >
            <Mic size={56} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        <p className="mt-6 text-text-muted text-center">
          {isTrialExpired 
            ? 'Subscribe to start recording' 
            : 'Tap to begin recording'}
        </p>
      </div>
    </div>
  );
}
```

### Auth Page (`src/app/auth/page.tsx`)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLAN } from '@/types';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, isLoading, isAuthenticated, error: authError } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        router.replace('/');
      } else {
        await signUp(email.trim(), password);
        // Show email confirmation message or redirect
        alert('Please check your email to confirm your account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-app">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-text-secondary">
            {isLogin ? 'Sign in to continue' : 'Start your legal meeting assistant'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-12"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-12 pr-12"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p className="text-error text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {!isLogin && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-accent/15 rounded-xl">
              <Gift size={18} className="text-accent" />
              <span className="text-sm font-semibold text-accent">
                {SUBSCRIPTION_PLAN.freeTrialDays}-day free trial • No credit card required
              </span>
            </div>
          )}
        </form>

        <div className="flex justify-center items-center gap-2 mt-8">
          <span className="text-text-secondary">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-accent-light font-semibold"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Meetings Page (`src/app/(main)/meetings/page.tsx`)

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, CheckCircle, AlertCircle, Loader, Lock, DollarSign } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import { useAuth } from '@/hooks/useAuth';
import { MeetingWithContact, formatDuration, getStatusInfo, formatCurrency } from '@/types';
import { MeetingCard } from '@/components/MeetingCard';

export default function MeetingsPage() {
  const router = useRouter();
  const { meetings, isLoading, refetch } = useMeetings();
  const { profile } = useAuth();
  const { isTrialExpired, hasActiveSubscription, hasActiveTrial } = useUsage();
  const [searchQuery, setSearchQuery] = useState('');

  const shouldLockMeetings = isTrialExpired && !hasActiveSubscription && !hasActiveTrial;
  const currencySymbol = profile?.currency_symbol || '$';

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (m.status === 'uploading') return false;
      if (searchQuery.trim()) {
        return m.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [meetings, searchQuery]);

  const handleMeetingClick = (meeting: MeetingWithContact) => {
    if (shouldLockMeetings) {
      router.push('/subscription');
      return;
    }
    router.push(`/meeting/${meeting.id}`);
  };

  return (
    <div className="pt-4 pb-24">
      <h1 className="text-3xl font-bold mb-6">Meetings</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input
          type="text"
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-12"
        />
      </div>

      {/* Meeting List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">
              {searchQuery ? 'No meetings found' : 'No meetings yet'}
            </p>
            {!searchQuery && (
              <p className="text-text-muted text-sm">
                Start a new recording from the Home tab
              </p>
            )}
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onClick={() => handleMeetingClick(meeting)}
              currencySymbol={currencySymbol}
              isLocked={shouldLockMeetings}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 6. Components Library

### MeetingCard Component

```typescript
// src/components/MeetingCard.tsx
'use client';

import { Clock, CheckCircle, AlertCircle, Loader, Lock, DollarSign } from 'lucide-react';
import { MeetingWithContact, formatDuration, getStatusInfo, formatCurrency } from '@/types';

interface MeetingCardProps {
  meeting: MeetingWithContact;
  onClick: () => void;
  currencySymbol?: string;
  isLocked?: boolean;
}

export function MeetingCard({ meeting, onClick, currencySymbol = '$', isLocked = false }: MeetingCardProps) {
  const date = new Date(meeting.created_at);
  const statusInfo = getStatusInfo(meeting.status);
  const contactName = meeting.contact
    ? `${meeting.contact.first_name}${meeting.contact.last_name ? ' ' + meeting.contact.last_name : ''}`
    : null;

  return (
    <button
      onClick={onClick}
      className={`card w-full text-left transition-transform hover:scale-[1.01] ${
        isLocked ? 'opacity-85 border-warning/40' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-semibold truncate flex-1 ${isLocked ? 'text-text-secondary' : ''}`}>
          {meeting.title}
        </h3>
        <StatusIndicator status={meeting.status} isLocked={isLocked} />
      </div>

      {/* Meta */}
      <div className="flex justify-between items-center text-sm text-text-muted mb-3">
        <span>
          {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {meeting.duration_seconds > 0 && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatDuration(meeting.duration_seconds)}</span>
          </div>
        )}
      </div>

      {/* Footer Badges */}
      <div className="flex flex-wrap gap-2">
        {isLocked && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning rounded text-xs font-semibold">
            <Lock size={10} />
            Locked
          </span>
        )}
        
        {!isLocked && meeting.is_billable && meeting.billable_amount && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded text-xs font-semibold">
            <DollarSign size={10} />
            {formatCurrency(meeting.billable_amount, currencySymbol)}
          </span>
        )}

        {contactName && (
          <span className="px-2 py-1 bg-border text-text rounded text-xs font-semibold">
            {contactName}
          </span>
        )}

        {meeting.status !== 'ready' && !isLocked && (
          <span 
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{ 
              backgroundColor: `${statusInfo.color}20`,
              color: statusInfo.color 
            }}
          >
            {statusInfo.label}
          </span>
        )}
      </div>
    </button>
  );
}

function StatusIndicator({ status, isLocked }: { status: string; isLocked?: boolean }) {
  if (isLocked) return <Lock size={16} className="text-warning" />;
  if (status === 'ready') return <CheckCircle size={16} className="text-success" />;
  if (status === 'failed') return <AlertCircle size={16} className="text-error" />;
  return <Loader size={16} className="text-accent-light animate-spin" />;
}
```

### AudioPlayer Component

```typescript
// src/components/AudioPlayer.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2 } from 'lucide-react';
import { formatTimestamp } from '@/types';

interface AudioPlayerProps {
  audioUrl: string | null;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ audioUrl, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime * 1000);
      onTimeUpdate?.(audio.currentTime * 1000);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration * 1000);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime += delta;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Number(e.target.value) / 1000;
  };

  if (!audioUrl) {
    return (
      <div className="card flex items-center justify-center py-8 text-text-muted">
        Audio not available
      </div>
    );
  }

  return (
    <div className="card">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Progress Bar */}
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={handleSliderChange}
        className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer mb-4"
        style={{
          background: `linear-gradient(to right, #E94560 ${(currentTime / duration) * 100}%, #2D2D4A ${(currentTime / duration) * 100}%)`,
        }}
      />
      
      {/* Time Display */}
      <div className="flex justify-between text-sm text-text-muted mb-4">
        <span>{formatTimestamp(currentTime)}</span>
        <span>{formatTimestamp(duration)}</span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button onClick={() => seek(-10)} className="p-2 text-text-muted hover:text-text">
          <RotateCcw size={24} />
        </button>
        
        <button 
          onClick={togglePlay}
          className="w-14 h-14 bg-accent-light rounded-full flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause size={28} className="text-white" fill="white" />
          ) : (
            <Play size={28} className="text-white ml-1" fill="white" />
          )}
        </button>
        
        <button onClick={() => seek(10)} className="p-2 text-text-muted hover:text-text">
          <RotateCw size={24} />
        </button>
      </div>
    </div>
  );
}
```

### LiveTranscript Component

```typescript
// src/components/LiveTranscript.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Turn {
  id: string;
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
  isFinal: boolean;
}

interface LiveTranscriptProps {
  turns: Turn[];
  currentPartial: string;
  isConnected: boolean;
}

export function LiveTranscript({ turns, currentPartial, isConnected }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new content appears
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [turns, currentPartial]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-surface rounded-xl p-4 min-h-[200px]"
    >
      {/* Connection Status */}
      {!isConnected && turns.length === 0 && (
        <div className="flex items-center justify-center h-full text-text-muted">
          Connecting to transcription service...
        </div>
      )}

      {/* Transcribed Turns */}
      <AnimatePresence>
        {turns.map((turn) => (
          <motion.div
            key={turn.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <span className="text-accent-light text-sm font-semibold">
              {turn.speaker}
            </span>
            <p className="text-text mt-1">{turn.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Current Partial (typing indicator) */}
      {currentPartial && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="text-text-secondary italic"
        >
          {currentPartial}
          <span className="animate-pulse">▌</span>
        </motion.div>
      )}

      {/* Empty state when connected but no content yet */}
      {isConnected && turns.length === 0 && !currentPartial && (
        <div className="flex items-center justify-center h-full text-text-muted">
          Start speaking - your words will appear here...
        </div>
      )}
    </div>
  );
}
```

---

## 7. API Integration

### Meeting API Hook

```typescript
// src/hooks/useMeetings.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Meeting, MeetingWithContact, MeetingWithDetails } from '@/types';

export function useMeetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all meetings
  const { data: meetings = [], isLoading, refetch } = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          contact:contacts(
            id,
            first_name,
            last_name,
            category_id,
            category:contact_categories(id, name, color)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MeetingWithContact[];
    },
    enabled: !!user?.id,
  });

  // Create meeting
  const { mutateAsync: createMeeting, isPending: isCreating } = useMutation({
    mutationFn: async (expectedSpeakers: number) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title: `Meeting - ${new Date().toLocaleDateString()}`,
          status: 'uploading',
          duration_seconds: 0,
          expected_speakers: expectedSpeakers,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Update meeting
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useMutation({
    mutationFn: async ({ meetingId, updates }: { meetingId: string; updates: Partial<Meeting> }) => {
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Delete meeting
  const { mutateAsync: deleteMeeting, isPending: isDeleting } = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  return {
    meetings,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    refetch,
  };
}
```

### Usage/Subscription Hook

```typescript
// src/hooks/useUsage.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { 
  isSubscriptionActive, 
  isTrialActive, 
  getTrialDaysRemaining,
  Subscription,
  UsageCredits,
  CanRecordResult,
} from '@/types';

export function useUsage() {
  const { user } = useAuth();

  // Fetch subscription
  const { data: subscription, isLoading: isSubLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  // Fetch can_user_record status
  const { data: canRecordResult, refetch: refreshCanRecord } = useQuery({
    queryKey: ['canRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc('can_user_record', { p_user_id: user.id });
      
      if (error) throw error;
      return data as CanRecordResult;
    },
    enabled: !!user?.id,
  });

  // Fetch usage credits
  const { data: usageCredits } = useQuery({
    queryKey: ['usageCredits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as UsageCredits | null;
    },
    enabled: !!user?.id,
  });

  const hasActiveSubscription = subscription ? isSubscriptionActive(subscription.status) : false;
  const hasActiveTrial = canRecordResult?.has_active_trial ?? false;
  const trialDaysRemaining = canRecordResult?.trial_days_remaining ?? 0;
  const isTrialExpired = !hasActiveSubscription && !hasActiveTrial;
  const canRecord = canRecordResult?.can_record ?? false;

  return {
    subscription,
    usageCredits,
    hasActiveSubscription,
    hasActiveTrial,
    trialDaysRemaining,
    isTrialExpired,
    canRecord,
    isLoading: isSubLoading,
    refreshCanRecord,
    refetchSubscription,
    lifetimeMinutesUsed: usageCredits?.lifetime_minutes_used ?? 0,
  };
}
```

---

## 8. Web Recording Implementation

### useRecording Hook

```typescript
// src/hooks/useRecording.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  error: string | null;
}

export function useRecording() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = useCallback(async (meetingId: string) => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          durationMs: Date.now() - startTimeRef.current,
        }));
      }, 100);

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false, 
        error: null 
      }));
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      }));
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async (meetingId: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorder.onstop = async () => {
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isPaused: false 
        }));

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
```

### Upload Audio to Supabase

```typescript
// Helper function to upload audio
async function uploadAudio(meetingId: string, userId: string, audioBlob: Blob): Promise<string> {
  const fileName = `${userId}/${meetingId}.webm`;
  
  const { data, error } = await supabase.storage
    .from('meeting-audio')
    .upload(fileName, audioBlob, {
      contentType: 'audio/webm',
      upsert: true,
    });
  
  if (error) throw error;
  
  return data.path;
}
```

---

## 9. State Management

### Auth Store (Zustand)

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        set({ user: data.user, session: data.session, isAuthenticated: true });
        await get().fetchProfile();
      },

      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        set({ user: data.user, session: data.session });
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, profile: null, isAuthenticated: false });
      },

      fetchProfile: async () => {
        const user = get().user;
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          set({ profile: data });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);
```

---

## 10. Authentication Flow

### Auth Hook

```typescript
// src/hooks/useAuth.ts
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { supabase, initSupabaseAuthForFunctions } from '@/lib/supabase';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    // Initialize on mount
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        store.setUser(session.user);
        store.setSession(session);
        await store.fetchProfile();
        await initSupabaseAuthForFunctions();
      }
      
      store.setLoading(false);
    };

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        store.setUser(session?.user ?? null);
        store.setSession(session);
        
        if (session?.user) {
          await store.fetchProfile();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user: store.user,
    profile: store.profile,
    session: store.session,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
    updateProfile: store.fetchProfile,
  };
}
```

---

## 11. Deployment

### Vercel Deployment

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-github-repo-url
git push -u origin main
```

2. Deploy to Vercel:
   - Connect GitHub repo to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy

### Environment Variables for Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POLAR_CHECKOUT_URL
NEXT_PUBLIC_POLAR_PRODUCT_PRICE_ID
NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_PRICE_ID
NEXT_PUBLIC_POLAR_MODE
```

### Domain Setup

Configure custom domain in Vercel and update:
1. Supabase Auth → URL Configuration → Site URL
2. Polar webhook URLs if needed

---

## Summary

This specification provides everything needed to build the Legal Memo web application:

- **Same backend** - Uses existing Supabase setup, no changes needed
- **Same payments** - Uses existing Polar integration
- **Mobile-like UI** - Single column, card-based, dark theme
- **Full feature parity** - Recording, meetings, contacts, settings, billing

Start with Phase 1 (project setup, auth) and work through each phase systematically. The mobile app code serves as the primary reference for business logic and UI patterns.

