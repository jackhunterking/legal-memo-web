'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle, KeyRound } from 'lucide-react';

export type AuthModalType = 'emailConfirmation' | 'passwordReset' | 'emailConfirmed';

interface AuthMessageModalProps {
  visible: boolean;
  onClose: () => void;
  type: AuthModalType;
  email?: string;
}

const modalContent: Record<AuthModalType, {
  icon: typeof Mail;
  iconBg: string;
  iconColor: string;
  title: string;
  getMessage: (email?: string) => string;
  buttonText: string;
}> = {
  emailConfirmation: {
    icon: Mail,
    iconBg: 'bg-accent-light/20',
    iconColor: 'text-accent-light',
    title: 'Check Your Email',
    getMessage: (email) => email 
      ? `We've sent a confirmation link to ${email}. Please check your inbox and click the link to verify your account.`
      : 'We\'ve sent a confirmation link to your email. Please check your inbox and click the link to verify your account.',
    buttonText: 'Got it',
  },
  passwordReset: {
    icon: KeyRound,
    iconBg: 'bg-accent-light/20',
    iconColor: 'text-accent-light',
    title: 'Password Reset Sent',
    getMessage: (email) => email
      ? `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions.`
      : 'We\'ve sent a password reset link to your email. Please check your inbox and follow the instructions.',
    buttonText: 'Got it',
  },
  emailConfirmed: {
    icon: CheckCircle,
    iconBg: 'bg-success/20',
    iconColor: 'text-success',
    title: 'Email Confirmed!',
    getMessage: () => 'Your email has been verified successfully. You can now sign in to your account.',
    buttonText: 'Continue to Sign In',
  },
};

export default function AuthMessageModal({
  visible,
  onClose,
  type,
  email,
}: AuthMessageModalProps) {
  const content = modalContent[type];
  const Icon = content.icon;

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-surface rounded-2xl border border-border z-50 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <X size={20} className="text-text-muted" />
            </button>

            {/* Content */}
            <div className="p-6 pt-8 flex flex-col items-center text-center">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-full ${content.iconBg} flex items-center justify-center mb-5`}>
                <Icon size={32} className={content.iconColor} strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-text mb-3">
                {content.title}
              </h2>

              {/* Message */}
              <p className="text-text-secondary text-base leading-relaxed mb-6 max-w-sm">
                {content.getMessage(email)}
              </p>

              {/* Email Badge (if provided) */}
              {email && type !== 'emailConfirmed' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-light rounded-xl mb-6">
                  <Mail size={16} className="text-text-muted" />
                  <span className="text-text text-sm font-medium">{email}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={onClose}
                className="btn-primary w-full max-w-xs"
              >
                {content.buttonText}
              </button>

              {/* Helper Text */}
              {type === 'emailConfirmation' && (
                <p className="text-text-muted text-sm mt-4">
                  Didn't receive the email? Check your spam folder.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

