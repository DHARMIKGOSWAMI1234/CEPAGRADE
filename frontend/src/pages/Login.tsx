import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, AuthError, type AuthErrorCode } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw,
  WifiOff,
  KeyRound,
  X,
} from 'lucide-react';

export const Login: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Resend verification email cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Password reset modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { login, resendVerificationEmail, resetPassword, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Sync if query param changes
  useEffect(() => {
    const qEmail = new URLSearchParams(location.search).get('email');
    if (qEmail && !email) {
      setEmail(qEmail);
    }
  }, [location.search]);

  // Decrement resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setResendMessage(null);

    try {
      const res = await resendVerificationEmail(email.trim());
      setResendMessage(res.message);
      setResendCooldown(60);
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError(err?.message || 'Failed to resend verification email.');
        setErrorCode('GENERIC_AUTH_ERROR');
      }
      setResendCooldown(30);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions

    setError(null);
    setErrorCode(null);
    setResendMessage(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      setErrorCode('INVALID_CREDENTIALS');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError(err?.message || 'Authentication failed. Please verify your credentials.');
        setErrorCode('GENERIC_AUTH_ERROR');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || isResetting) return;
    setIsResetting(true);
    setResetStatus(null);
    setResetError(null);

    try {
      const res = await resetPassword(resetEmail.trim());
      setResetStatus(res.message);
    } catch (err: any) {
      setResetError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setErrorCode(null);
  };

  const isRateLimited = errorCode === 'RATE_LIMIT' || error?.toLowerCase().includes('too many') || error?.toLowerCase().includes('rate limit');
  const isUnconfirmedEmail = errorCode === 'EMAIL_NOT_CONFIRMED' || error?.toLowerCase().includes('verify your email');

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#050505] text-[#18181B] dark:text-[#FAFAFA] transition-colors duration-200">
      {/* Top Bar with Brand & Theme Switcher */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-[#27272A]">
        <div className="flex items-center space-x-3">
          <Logo size="md" />
        </div>
        <div className="flex items-center space-x-3">
          {isFirebaseConfigured ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Auth Active
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Offline / Firebase Unconfigured
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Brand Identity Editorial Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Official Agricultural AI Platform</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-zinc-900 dark:text-zinc-50">
                Inspect with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500">confidence.</span>
              </h1>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
                AI-powered onion quality inspection for faster sorting, grading and reporting.
              </p>
            </div>

            {/* Tagline Banner */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Brand Vision
              </p>
              <p className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-200">
                SMART ONION GRADING FOR A BETTER TOMORROW
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Real-time YOLOv8 polygon instance segmentation</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>MobileNetV3 health classification & optical mm calibration</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Deterministic AGMARK grading & ReportLab PDF certificates</span>
              </div>
            </div>

            {/* Quick Demo Credentials Assistant (Only shown in offline mode when Firebase is unconfigured) */}
            {!isFirebaseConfigured && (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Quick Demo Operator Login:
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono">Offline / Local</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    id="login-fill-demo"
                    onClick={() => handleFillDemo('operator@cepagrade.ai', 'Operator123!')}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 text-zinc-700 dark:text-zinc-300 font-mono transition-colors cursor-pointer"
                  >
                    operator@cepagrade.ai
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Form Card Panel */}
          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] rounded-2xl shadow-soft-lg p-8 md:p-10 space-y-6 transition-all">
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Sign In
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Access your inspection batches, review queue, and verified reports.
                </p>
              </div>

              {!isFirebaseConfigured && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Firebase Configuration Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Set <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code> and <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_FIREBASE_PROJECT_ID</code> in <code className="font-mono">frontend/.env</code> for live cloud authentication. Local development authentication is currently active.
                  </p>
                </div>
              )}

              {/* RATE LIMIT ALERT */}
              {isRateLimited && (
                <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Authentication Throttled
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5">
                        Too many authentication attempts. Please wait and try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* UNCONFIRMED EMAIL NOTICE & RESEND ACTION */}
              {isUnconfirmedEmail && (
                <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <Mail className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Email Verification Required
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5">
                        Please verify your email before accessing CEPA GRADE. Check your inbox for the verification link.
                      </p>
                    </div>
                  </div>

                  {email.trim() && (
                    <div className="pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || isResending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : isResending
                            ? 'Sending...'
                            : 'Resend Verification Email'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* RESEND FEEDBACK STATUS */}
              {resendMessage && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {/* GENERAL AUTH ERROR */}
              {error && !isRateLimited && !isUnconfirmedEmail && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start space-x-2.5 text-sm animate-shake">
                  {errorCode === 'NETWORK_ERROR' ? (
                    <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-xs leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@cepagrade.ai"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setShowForgotModal(true);
                        setResetStatus(null);
                        setResetError(null);
                      }}
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-soft-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="pt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Create an account
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Forgot Password Modal (Part 19) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] rounded-2xl shadow-soft-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Reset Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Enter your registered email address and we'll send you official Firebase password reset instructions.
            </p>

            {resetStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetStatus}</span>
              </div>
            )}

            {resetError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="operator@cepagrade.ai"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isResetting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Notice */}
      <footer className="w-full py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-[#27272A]">
        CEPA GRADE — AI-Based Onion Quality Inspection and Automated Grading System
      </footer>
    </div>
  );
};
