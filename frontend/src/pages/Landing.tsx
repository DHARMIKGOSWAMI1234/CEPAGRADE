import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Layers,
  Sparkles,
  Award,
  History,
  FileText,
  Upload,
  Cpu,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export const Landing: React.FC = () => {
  const { isAuthenticated, loginDemo, demoAttempts, maxDemoAttempts } = useAuth();
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Split-screen showcase toggle state
  const [activePreviewMode, setActivePreviewMode] = useState<'split' | 'overlay' | 'original'>('split');

  const handleTryDemo = async () => {
    if (demoAttempts >= maxDemoAttempts) {
      setDemoError('Demo access limit reached. Create a free account to continue using CEPA GRADE.');
      return;
    }
    setDemoError(null);
    setIsDemoLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch (err: any) {
      setDemoError(err?.message || 'Demo session limit reached or service temporarily unavailable.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-[#050505]/90 border-b border-zinc-200/80 dark:border-[#27272A] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <a href="#hero" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Home
            </a>
            <a href="#how-it-works" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs shadow-soft-sm transition-all"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTryDemo}
                  disabled={isDemoLoading}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isDemoLoading ? 'Loading...' : 'Try Demo'}</span>
                </button>

                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-xs shadow-soft-sm transition-all"
                >
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DEMO NOTICE BANNER (IF DEMO ERROR) */}
      {demoError && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2.5 text-center text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{demoError}</span>
          <Link to="/signup" className="font-semibold underline ml-1">
            Create Free Account
          </Link>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200/80 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-medium">
                <ScanLine className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>AI-Assisted Produce Inspection & Automated Grading</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-zinc-900 dark:text-zinc-50">
                Inspect with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500">precision.</span>
                <br />
                Grade with certainty.
              </h1>

              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
                Analyze onion images, inspect detected produce, review quality indicators, and generate structured inspection reports with deterministic grading.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-soft-sm transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleTryDemo}
                  disabled={isDemoLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 bg-white dark:bg-[#121214] text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isDemoLoading ? 'Preparing Demo...' : 'Try Demo'}</span>
                  {demoAttempts < maxDemoAttempts && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                      {maxDemoAttempts - demoAttempts} left
                    </span>
                  )}
                </button>
              </div>

              {/* Factual Highlights */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-[#27272A] text-left">
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Instance Segmentation</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">YOLOv8n-seg</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Health Classifier</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">MobileNetV3</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Grading Logic</p>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Deterministic</p>
                </div>
              </div>
            </div>

            {/* Right Showcase Preview Card */}
            <div className="lg:col-span-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-lg space-y-4">
                
                {/* Visual Header Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Example Inspection
                    </span>
                    <span className="hidden sm:inline text-[11px] text-zinc-400 font-normal">
                      • Interface Preview
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 bg-white dark:bg-[#18181B] p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setActivePreviewMode('split')}
                      className={`px-2 py-0.5 rounded ${activePreviewMode === 'split' ? 'bg-brand-500 text-white font-semibold' : 'text-zinc-500'}`}
                    >
                      Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewMode('overlay')}
                      className={`px-2 py-0.5 rounded ${activePreviewMode === 'overlay' ? 'bg-brand-500 text-white font-semibold' : 'text-zinc-500'}`}
                    >
                      AI Overlay
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewMode('original')}
                      className={`px-2 py-0.5 rounded ${activePreviewMode === 'original' ? 'bg-brand-500 text-white font-semibold' : 'text-zinc-500'}`}
                    >
                      Original
                    </button>
                  </div>
                </div>

                {/* Simulated Inspection Capture Area */}
                <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 aspect-video flex items-center justify-center text-center p-4">
                  {activePreviewMode === 'original' && (
                    <div className="space-y-2 text-zinc-300">
                      <div className="w-20 h-28 mx-auto rounded-full bg-rose-950/80 border-2 border-rose-600/60 shadow-inner flex items-center justify-center">
                        <span className="text-xs text-rose-200 font-mono">Sample #1</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono">Example Optical Input</p>
                    </div>
                  )}

                  {activePreviewMode === 'overlay' && (
                    <div className="space-y-2 text-zinc-300">
                      <div className="relative w-20 h-28 mx-auto rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center ring-4 ring-emerald-500/20">
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-bold absolute -top-3">
                          Healthy 100%
                        </span>
                        <span className="text-xs text-emerald-200 font-mono">24.7 mm</span>
                      </div>
                      <p className="text-xs text-emerald-400 font-mono">YOLOv8 Segmentation Overlay</p>
                    </div>
                  )}

                  {activePreviewMode === 'split' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="grid grid-cols-2 w-full h-full gap-2 items-center">
                        <div className="h-full rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex flex-col items-center justify-center p-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Original</span>
                          <div className="w-14 h-20 rounded-full bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-[10px] text-rose-200 font-mono">
                            RGB
                          </div>
                        </div>
                        <div className="h-full rounded-lg bg-zinc-800/80 border border-emerald-500/40 flex flex-col items-center justify-center p-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">AI Mask</span>
                          <div className="w-14 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-[10px] text-emerald-200 font-mono ring-2 ring-emerald-500/30">
                            Grade C
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Illustrative Result Preview Metrics Strip */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 uppercase">Sample Count</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">1 Bulb</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 uppercase">Sample Size</p>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">24.7 mm</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 uppercase">Sample Health</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">100%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80">
                    <p className="text-[10px] text-zinc-400 uppercase">Sample Grade</p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">Grade C</p>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center italic">
                  * Illustrative interface preview. Actual measurements and quality grades are computed dynamically upon batch ingestion.
                </p>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (4 FACTUAL STEPS) */}
      <section id="how-it-works" className="py-16 md:py-24 bg-zinc-50/70 dark:bg-[#08080A] border-y border-zinc-200/80 dark:border-[#27272A] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 uppercase tracking-widest font-mono">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              How CEPA GRADE Works
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              A transparent, 4-stage pipeline connecting optical produce capture with deterministic quality grading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] shadow-soft-sm space-y-3 relative group hover:border-brand-500/50 transition-all">
              <span className="text-3xl font-extrabold text-brand-500/30 font-mono">01</span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Upload</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Upload an onion image or inspection batch from a standard camera capture.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] shadow-soft-sm space-y-3 relative group hover:border-brand-500/50 transition-all">
              <span className="text-3xl font-extrabold text-brand-500/30 font-mono">02</span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Analyze</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The system detects onion instances and analyzes the available visual characteristics using YOLOv8 segmentation and MobileNetV3.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] shadow-soft-sm space-y-3 relative group hover:border-brand-500/50 transition-all">
              <span className="text-3xl font-extrabold text-brand-500/30 font-mono">03</span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Grade</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The implemented grading logic combines the available inspection measurements and classification results to assign Grade A, B, C, or Reject.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/80 dark:border-[#27272A] shadow-soft-sm space-y-3 relative group hover:border-brand-500/50 transition-all">
              <span className="text-3xl font-extrabold text-brand-500/30 font-mono">04</span>
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Review</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Review visual results, onion-level information, history, and generated PDF reports in the interactive dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID (6 IMPLEMENTED CAPABILITIES) */}
      <section id="features" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 uppercase tracking-widest font-mono">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Built on Verified Computer Vision
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              Only authentic, implemented system capabilities that operate live in the repository.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">AI Segmentation</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Detect individual onion instances and generate visual segmentation overlays using our trained YOLOv8n-seg model.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Health Classification</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Analyze individual onion crops using the existing MobileNetV3 health classification model to detect surface defects and decay.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ScanLine className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Physical Measurement</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Use the reference calibration system with standard coin scales to convert pixel contours into true physical millimeter dimensions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Automated Grading</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Apply deterministic grading rules based on calibrated produce diameter, circularity, and defect rates to assign Grade A, B, C, or Reject.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Inspection History</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Review previously processed inspections stored in the persistent database, complete with timestamps, batch counts, and triage records.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] shadow-soft-sm space-y-3 hover:border-brand-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Inspection Reports</h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Generate structured PDF quality certificates via ReportLab containing produce unit breakdowns, quality scores, and verification barcodes.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. ABOUT SECTION */}
      <section id="about" className="py-16 md:py-20 bg-zinc-50/70 dark:bg-[#08080A] border-t border-zinc-200/80 dark:border-[#27272A] transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 uppercase tracking-widest font-mono">
            Project Background
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            About CEPA GRADE
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            CEPA GRADE was engineered by <strong>Team THE DEBUGGERS</strong> to address optical grading and sorting challenges in agricultural supply chains. The application integrates computer vision segmentation, defect classification, physical calibration, and deterministic grading into an accessible platform that functions in both offline facility terminals and cloud environments.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4 text-xs font-mono text-zinc-500">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>React + TypeScript</span>
            <span>•</span>
            <span>PyTorch & Ultralytics</span>
            <span>•</span>
            <span>SQLite Persistence</span>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="py-16 bg-white dark:bg-[#050505] border-t border-zinc-200/80 dark:border-[#27272A]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ready to inspect onion batches?
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Create an account to start managing inspections, or try the interactive local demo to evaluate system capabilities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold text-sm shadow-soft-sm transition-all"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={handleTryDemo}
              disabled={isDemoLoading}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-brand-500 text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-colors cursor-pointer"
            >
              {isDemoLoading ? 'Loading...' : 'Try Demo'}
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="mt-auto py-8 bg-zinc-50 dark:bg-[#0A0A0C] border-t border-zinc-200/80 dark:border-[#27272A] text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-200">CEPA GRADE</span>
            <span>—</span>
            <span>SMART ONION GRADING FOR A BETTER TOMORROW</span>
          </div>

          <div className="flex items-center space-x-4">
            <a href="#hero" className="hover:underline">Home</a>
            <a href="#how-it-works" className="hover:underline">How It Works</a>
            <a href="#features" className="hover:underline">Features</a>
            <Link to="/login" className="hover:underline">Sign In</Link>
            <Link to="/signup" className="hover:underline">Create Account</Link>
          </div>

          <p>© 2026 CEPA GRADE. Team THE DEBUGGERS.</p>
        </div>
      </footer>

    </div>
  );
};
