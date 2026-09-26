import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, AuthError, type AuthErrorCode } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  AlertTriangle,
  ShieldCheck,
  Clock,
  RotateCcw,
  WifiOff,
  LogIn,
} from 'lucide-react';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // Resend verification email state & cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { signup, resendVerificationEmail, isFirebaseConfigured, infoMessage } = useAuth();
  const navigate = useNavigate();

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
      setResendCooldown(60); // 60s cooldown to prevent repeated rate limits
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
    setSignupSuccess(null);
    setResendMessage(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      setErrorCode('INVALID_EMAIL');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. operator@cepagrade.ai).');
      setErrorCode('INVALID_EMAIL');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long and include a mix of characters.');
      setErrorCode('WEAK_PASSWORD');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      setErrorCode('PASSWORD_MISMATCH');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signup(name.trim(), email.trim(), password, confirmPassword);
      if (res.emailConfirmationRequired) {
        setSignupSuccess(
          'Account created successfully! A verification email has been sent. Please confirm your email before signing in.'
        );
        setErrorCode('EMAIL_NOT_CONFIRMED');
        setResendCooldown(60);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      // Intentionally preserve name and email state so operator does not lose typed data
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError(err?.message || 'Registration failed. Please try again.');
        setErrorCode('GENERIC_AUTH_ERROR');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRateLimited = errorCode === 'RATE_LIMIT' || error?.toLowerCase().includes('too many') || error?.toLowerCase().includes('rate limit');
  const isExistingAccount = errorCode === 'USER_ALREADY_EXISTS';

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

      {/* Main Editorial Auth Workspace */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Editorial Narrative Panel */}
          <div className="lg:col-span-5 space-y-6 lg:pr-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Start inspecting in <span className="text-brand-500 dark:text-brand-400">minutes.</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mt-2">
                SMART ONION GRADING FOR A BETTER TOMORROW
              </p>
            </div>

            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Create an operator profile to upload onion lot imagery, analyze multi-onion instance segmentation, review automated grading certificates, and inspect quality metrics.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Deterministic grading aligned with AGMARK size categories</span>
              </div>
              <div className="flex items-start space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Explainable AI review triggers for boundary certainty</span>
              </div>
              <div className="flex items-start space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Traceable batch ledgers with complete history tracking</span>
              </div>
            </div>
          </div>

          {/* Right Signup Card */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] rounded-2xl shadow-soft-lg p-8 md:p-10 space-y-6">
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Create your CEPA GRADE account
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Fill in your details below to register your operator credentials.
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

              {/* RATE LIMIT ERROR ALERT (TASK 2, 3, 5, 6) */}
              {isRateLimited && (
                <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Email Rate Limit Reached
                      </p>
                      <p className="text-xs leading-relaxed">
                        Too many signup emails have been requested. Please wait before requesting another verification email. If you already created an account, use Sign In instead.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <Link
                      to={`/login?email=${encodeURIComponent(email.trim())}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In Instead</span>
                    </Link>

                    {email.trim() && (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || isResending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-zinc-700 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : isResending
                            ? 'Sending...'
                            : 'Resend Verification'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* EXISTING ACCOUNT ERROR ALERT (TASK 5, 6) */}
              {isExistingAccount && (
                <div className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-3 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <UserIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs uppercase tracking-wide text-blue-800 dark:text-blue-300">
                        Account Already Exists
                      </p>
                      <p className="text-xs leading-relaxed">
                        An account with this email address already exists. Please sign in instead.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      to={`/login?email=${encodeURIComponent(email.trim())}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with This Email</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* OTHER AUTH ERRORS */}
              {error && !isRateLimited && !isExistingAccount && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start space-x-2.5 text-sm animate-shake">
                  {errorCode === 'NETWORK_ERROR' ? (
                    <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-xs leading-relaxed">{error}</span>
                </div>
              )}

              {/* REGISTRATION SUCCESS / CONFIRMATION REQUIRED BANNER (TASK 4, 5) */}
              {(signupSuccess || (infoMessage && errorCode === 'EMAIL_NOT_CONFIRMED')) && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 space-y-3 text-sm animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-emerald-900 dark:text-emerald-300">
                        Registration Submitted
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5">
                        {signupSuccess || infoMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                    <Link
                      to={`/login?email=${encodeURIComponent(email.trim())}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Proceed to Sign In</span>
                    </Link>

                    {email.trim() && (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || isResending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-zinc-700 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : isResending
                            ? 'Sending...'
                            : 'Resend Verification'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* RESEND FEEDBACK STATUS */}
              {resendMessage && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">Assigned Role:</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">Operator (Standard Access)</span>
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-soft-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </form>

              <div className="pt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Already have an account?{' '}
                <Link
                  to={`/login${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
                  className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Sign In
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer Notice */}
      <footer className="w-full py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-[#27272A]">
        CEPA GRADE — AI-Based Onion Quality Inspection and Automated Grading System
      </footer>
    </div>
  );
};
