'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Gift, Ban, Clock, FileText, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLAN } from '@/types';
import AuthMessageModal, { AuthModalType } from '@/components/ui/AuthMessageModal';
import { useAnalytics } from '@/hooks/useAnalytics';

const BENEFITS = [
  {
    icon: Ban,
    title: 'Eliminate Disputes',
    subtitle: 'Never miss critical agreements',
    description: 'Refer back to the exact moment a client agreed to the terms.',
  },
  {
    icon: Clock,
    title: 'Recover Billable Hours',
    subtitle: 'Track every minute accurately',
    description: 'Automated duration tracking ensures you bill for every minute.',
  },
  {
    icon: FileText,
    title: 'Instant Meeting Summaries',
    subtitle: 'Stop taking notes',
    description: 'Get accurate transcripts & summaries instantly with exact speaker attribution.',
  },
];

const FEATURES = [
  'Unlimited AI transcription',
  'Speaker diarization',
  'Automatic meeting summaries',
  'Shareable meeting links',
  'Contact & case management',
  'Secure cloud storage',
];

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, resetPassword, isLoading, isAuthenticated, error: authError } = useAuth();
  const { trackEvent } = useAnalytics();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBenefit, setActiveBenefit] = useState(0);
  
  // Auth message modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalType, setAuthModalType] = useState<AuthModalType>('emailConfirmation');
  const [authModalEmail, setAuthModalEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  // Sync auth error
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  // Rotate through benefits
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBenefit((prev) => (prev + 1) % BENEFITS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!isForgotPassword && !password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (!isForgotPassword && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isForgotPassword) {
        // Handle forgot password
        await resetPassword(email.trim());
        trackEvent('password_reset_requested');
        setAuthModalEmail(email.trim());
        setAuthModalType('passwordReset');
        setShowAuthModal(true);
      } else if (isLogin) {
        await signIn(email.trim(), password);
        trackEvent('user_signed_in');
        router.replace('/home');
      } else {
        await signUp(email.trim(), password);
        trackEvent('user_signed_up', { method: 'email' });
        setAuthModalEmail(email.trim());
        setAuthModalType('emailConfirmation');
        setShowAuthModal(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      
      // Handle errors differently based on the current mode
      if (isForgotPassword) {
        // For password reset, show the actual error or a friendly message
        if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('limit')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('no user')) {
          setError('No account found with this email address.');
        } else {
          setError(message || 'Failed to send reset link. Please try again.');
        }
      } else if (message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
        setIsLogin(true);
      } else if (message.toLowerCase().includes('invalid')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError('');
  };

  // Handle modal close - reset form and switch to login mode
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    // Reset form
    setPassword('');
    setError('');
    // Switch to login mode after signup or password reset
    if (!isLogin || isForgotPassword) {
      setIsLogin(true);
      setIsForgotPassword(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ActiveIcon = BENEFITS[activeBenefit].icon;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Benefits (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-surface to-background" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-light/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-light/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo & Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/1024x1024.png" 
                alt="Legal Memo" 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <span className="text-2xl font-bold text-text">Legal Memo</span>
            </div>
            <p className="text-text-secondary text-lg max-w-md">
              AI-powered meeting transcription and analysis for legal professionals
            </p>
          </div>

          {/* Benefits Carousel */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.div
              key={activeBenefit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
                <ActiveIcon size={40} className="text-accent-light" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-bold text-text mb-2">
                {BENEFITS[activeBenefit].title}
              </h2>
              <p className="text-accent-light text-lg font-medium mb-3">
                {BENEFITS[activeBenefit].subtitle}
              </p>
              <p className="text-text-secondary text-base leading-relaxed">
                {BENEFITS[activeBenefit].description}
              </p>
            </motion.div>

            {/* Carousel Indicators */}
            <div className="flex gap-2">
              {BENEFITS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveBenefit(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeBenefit 
                      ? 'w-8 bg-accent-light' 
                      : 'w-2 bg-border hover:bg-border-light'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Features List */}
          <div>
            <p className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-4">
              Everything you need
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check size={16} className="text-success flex-shrink-0" />
                  <span className="text-text-secondary text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/1024x1024.png" 
                alt="Legal Memo" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="text-xl font-bold text-text">Legal Memo</span>
            </div>
            <p className="text-text-secondary text-sm">
              AI-powered meeting transcription
            </p>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              {isForgotPassword 
                ? 'Reset Password' 
                : isLogin 
                  ? 'Welcome Back' 
                  : 'Create Account'}
            </h1>
            <p className="text-text-secondary">
              {isForgotPassword
                ? 'Enter your email to receive a reset link'
                : isLogin
                  ? 'Sign in to continue to your dashboard'
                  : 'Start your legal meeting assistant'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-14"
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            {!isForgotPassword && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-14 pr-14"
                  disabled={isSubmitting}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {/* Forgot Password Link */}
            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-accent-light hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-error text-sm text-center bg-error/10 py-2 px-4 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Please wait...</span>
                </div>
              ) : isForgotPassword ? (
                'Send Reset Link'
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>

            {/* Back to Sign In */}
            {isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full py-3 text-text-secondary hover:text-text transition-colors"
              >
                Back to Sign In
              </button>
            )}

            {/* Free Trial Banner */}
            {!isLogin && !isForgotPassword && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-accent/15 rounded-xl">
                <Gift size={18} className="text-accent-light" />
                <span className="text-sm font-semibold text-accent-light">
                  {SUBSCRIPTION_PLAN.freeTrialDays}-day free trial
                </span>
              </div>
            )}
          </form>

          {/* Toggle Mode Footer */}
          {!isForgotPassword && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <span className="text-text-secondary">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                onClick={toggleMode}
                className="text-accent-light font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          )}

          {/* Legal Links */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <a
              href="https://legalmemo.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-text-muted">•</span>
            <a
              href="https://legalmemo.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Auth Message Modal */}
      <AuthMessageModal
        visible={showAuthModal}
        onClose={handleAuthModalClose}
        type={authModalType}
        email={authModalEmail}
      />
    </div>
  );
}
