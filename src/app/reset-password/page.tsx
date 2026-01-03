'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if user came from a valid password reset link
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check for recovery tokens in URL hash (e.g., #access_token=...&type=recovery)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        console.log('[ResetPassword] Checking session, type:', type, 'hasToken:', !!accessToken);
        
        // If we have recovery tokens in the URL, Supabase should process them
        // Let's wait a bit for the session to be established
        if (type === 'recovery' && accessToken) {
          // Give Supabase time to process the tokens
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check for active session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[ResetPassword] Session check result:', { 
          hasSession: !!session, 
          error: error?.message 
        });
        
        if (error) {
          console.error('[ResetPassword] Session error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidSession(false);
        } else if (session) {
          // Valid session - user can reset password
          setIsValidSession(true);
        } else {
          // No session means the link might be invalid or expired
          setError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidSession(false);
        }
      } catch (err) {
        console.error('[ResetPassword] Error checking session:', err);
        setError('Something went wrong. Please try again.');
        setIsValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    // Small delay to allow providers to handle PASSWORD_RECOVERY event first
    const timer = setTimeout(checkSession, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession && !isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-6"
          >
            <XCircle size={40} className="text-error" />
          </motion.div>
          <h1 className="text-2xl font-bold text-text mb-2">Link Expired</h1>
          <p className="text-text-secondary mb-6">
            {error || 'This password reset link has expired or is invalid.'}
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="btn-primary w-full"
          >
            Back to Sign In
          </button>
          <p className="text-text-muted text-sm mt-4">
            You can request a new password reset from the sign in page.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={40} className="text-success" />
          </motion.div>
          <h1 className="text-2xl font-bold text-text mb-2">Password Updated!</h1>
          <p className="text-text-secondary mb-6">
            Your password has been successfully reset. You'll be redirected to sign in.
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="btn-primary w-full"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="/1024x1024.png" 
              alt="Legal Memo" 
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold text-text">Legal Memo</span>
          </div>
        </div>

        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6"
        >
          <Shield size={40} className="text-accent-light" strokeWidth={1.5} />
        </motion.div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text mb-2">Set New Password</h1>
          <p className="text-text-secondary">
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-14 pr-14"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input pl-14 pr-14"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password requirements hint */}
          <p className="text-text-muted text-sm">
            Password must be at least 6 characters
          </p>

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
                <span>Updating...</span>
              </div>
            ) : (
              'Reset Password'
            )}
          </button>

          {/* Back to Sign In */}
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="w-full py-3 text-text-secondary hover:text-text transition-colors"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

