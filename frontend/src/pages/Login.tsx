import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ArrowRight, AlertCircle, CheckCircle2, Lock, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] dark:bg-[#050505] text-[#18181B] dark:text-[#FAFAFA] transition-colors duration-200">
      {/* Top Bar with Brand & Theme Switcher */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-[#27272A]">
        <div className="flex items-center space-x-3">
          <Logo size="md" />
        </div>
        <div className="flex items-center space-x-3">
          {isSupabaseConfigured ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Auth Active
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Local Dev / Supabase Unconfigured
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Editorial Auth Workspace */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Editorial Narrative Panel */}
          <div className="lg:col-span-6 space-y-6 lg:pr-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 text-xs font-medium tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Smart India Hackathon • AI Vision Pipeline</span>
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Inspect with <span className="text-brand-500 dark:text-brand-400">confidence.</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mt-2">
                SMART ONION GRADING FOR A BETTER TOMORROW
              </p>
            </div>

            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg">
              AI-powered onion quality inspection for faster sorting, grading and reporting. Precision computer vision calibrated for commercial agricultural sorting.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>YOLOv8n-seg contour instance segmentation</span>
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

            {/* Quick Demo Credentials Assistant */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Quick Demo Operator Login:
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">FastAPI / Demo</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  id="login-fill-demo"
                  onClick={() => handleFillDemo('operator@onionvision.ai', 'Operator123!')}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 text-zinc-700 dark:text-zinc-300 font-mono transition-colors"
                >
                  operator@onionvision.ai
                </button>
              </div>
            </div>
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

              {!isSupabaseConfigured && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Supabase Configuration Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Set <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono">frontend/.env</code> for live cloud authentication. Local development authentication is currently active.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start space-x-2.5 text-sm animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <span>{error}</span>
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <span
                      title="Password reset requires SMTP email integration"
                      className="text-xs text-zinc-400 dark:text-zinc-500 cursor-not-allowed select-none"
                    >
                      Forgot password?
                    </span>
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-[#27272A] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
                    />
                  </div>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-soft-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
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

      {/* Editorial Footer */}
      <footer className="w-full py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-100 dark:border-[#18181B]">
        CEPA GRADE • SMART ONION GRADING FOR A BETTER TOMORROW • The Debuggers • Smart India Hackathon
      </footer>
    </div>
  );
};
