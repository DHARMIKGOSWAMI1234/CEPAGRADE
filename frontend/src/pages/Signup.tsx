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
  ScanLine,
  Clock,
  RotateCcw,
  WifiOff,
} from 'lucide-react';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  // Resend verification email state & cooldown
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { signup, loginWithGoogle, resendVerificationEmail, infoMessage } = useAuth();
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
    if (isSubmitting) return;

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
      setError('Please enter a valid email address.');
      setErrorCode('INVALID_EMAIL');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
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
      const result = await signup(name.trim(), email.trim(), password, confirmPassword);
      if (result.emailConfirmationRequired) {
        setSignupSuccess(
          'Account created successfully! Please check your email inbox to verify your account.'
        );
        setResendCooldown(60);
      } else {
        // Direct authentication -> redirect to dashboard which triggers first-time onboarding
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
      } else if (err?.message?.includes('Network') || err?.code === 'ERR_NETWORK') {
        setError('Unable to connect to CEPA GRADE. Please check that the service is running.');
        setErrorCode('NETWORK_ERROR');
      } else {
        setError(err?.message || 'Registration failed. Please check your information and try again.');
        setErrorCode('GENERIC_AUTH_ERROR');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (isGoogleSubmitting) return;
    setError(null);
    setErrorCode(null);
    setIsGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err instanceof AuthError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError('Google sign-in is currently unavailable. Please use email and password.');
        setErrorCode('GENERIC_AUTH_ERROR');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const isRateLimited =
    errorCode === 'RATE_LIMIT' ||
    error?.toLowerCase().includes('too many') ||
    error?.toLowerCase().includes('rate limit');

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#050505] text-[#18181B] dark:text-[#FAFAFA] transition-colors duration-200">
      
      {/* Top Bar with Brand & Theme Switcher */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-[#27272A]">
        <div className="flex items-center space-x-3">
          <Link to="/" title="CEPA GRADE Home">
            <Logo size="md" />
          </Link>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Brand Identity Editorial Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-medium">
              <ScanLine className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>AI-Assisted Produce Inspection</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.15] text-zinc-900 dark:text-zinc-50">
                Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500">CEPA GRADE</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
                Create an account to start managing optical quality inspections, tracking historical produce batches, and generating verified PDF reports.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Automated YOLOv8 polygon instance segmentation</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>MobileNetV3 health defect detection</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Deterministic rule-based grading & ReportLab certificates</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              New accounts include access to the standard operator workspace with produce scanning and report generation.
            </div>
          </div>

          {/* Right Form Card Panel */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] rounded-2xl shadow-soft-lg p-8 md:p-10 space-y-6 transition-all">
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Create Account
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Enter your details to register as a CEPA GRADE operator.
                </p>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                id="signup-google"
                onClick={handleGoogleSignUp}
                disabled={isGoogleSubmitting || isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121214] text-zinc-800 dark:text-zinc-200 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                aria-label="Sign up with Google"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isGoogleSubmitting ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
                <span className="bg-white dark:bg-[#0D0D0F] px-3 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                  or register with email
                </span>
              </div>

              {/* RATE LIMIT ALERT */}
              {isRateLimited && (
                <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-semibold text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Registration Throttled
                      </p>
                      <p className="text-xs leading-relaxed mt-0.5">
                        {error || 'Too many attempts. Please wait a few moments before trying again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS NOTICE */}
              {signupSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3 text-sm animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-xs uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        Check Your Inbox
                      </p>
                      <p className="text-xs leading-relaxed">
                        {signupSuccess}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || isResending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                    <Link
                      to={`/login?email=${encodeURIComponent(email)}`}
                      className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      Proceed to Sign In →
                    </Link>
                  </div>
                </div>
              )}

              {/* RESEND MESSAGE */}
              {resendMessage && (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center space-x-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {/* ERROR ALERT */}
              {error && !isRateLimited && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start space-x-2.5 text-sm animate-shake">
                  {errorCode === 'NETWORK_ERROR' ? (
                    <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-xs leading-relaxed">{error}</span>
                </div>
              )}

              {/* INFO MESSAGE */}
              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs">
                  {infoMessage}
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
                      placeholder="Jane Operator"
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
                      placeholder="name@domain.com"
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
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors disabled:opacity-60"
                      />
                    </div>
                  </div>
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
                  to="/login"
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
