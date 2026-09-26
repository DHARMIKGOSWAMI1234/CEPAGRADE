import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { UploadZone } from '../components/inspection/UploadZone';
import { uploadInspection } from '../api/inspections';
import type { LayoutContextType } from '../components/layout/AppLayout';

export const NewInspection: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const outletContext = useOutletContext<LayoutContextType | undefined>();

  const handleStartInspection = async (file: File, referenceDiameterMm?: number) => {
    setLoading(true);
    setApiError(null);
    try {
      // Create inspection with process=true for synchronous real CV execution
      const uploadResp = await uploadInspection(file, true, referenceDiameterMm);
      if (uploadResp.inspection_id) {
        navigate(`/inspections/${uploadResp.inspection_id}/results`);
      }
    } catch (err: any) {
      setApiError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to upload and start inspection. Please ensure the backend is running.'
      );
      setLoading(false);
    }
  };

  const steps = [
    { num: '01', title: 'Setup', active: true, done: false },
    { num: '02', title: 'Image', active: true, done: false },
    { num: '03', title: 'Analysis', active: loading, done: false },
    { num: '04', title: 'Results', active: false, done: false },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200">
      <Header
        title="New Inspection"
        subtitle="Capture or upload high-resolution produce images for automated AI inspection & grading."
        showBack
        backTo="/"
        onOpenMobileMenu={outletContext?.openMobileMenu}
      />

      <PageContainer maxWidth="standard">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progression Stepper: 01 Setup -> 02 Image -> 03 Analysis -> 04 Results */}
          <div className="bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200/90 dark:border-[#27272A] rounded-2xl p-4 sm:p-5 shadow-soft-sm">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
              {steps.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        s.active
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'bg-zinc-200 dark:bg-[#18181B] text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {s.num}
                    </span>
                    <span
                      className={
                        s.active
                          ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 mx-2 sm:mx-4 h-0.5 bg-zinc-200 dark:bg-zinc-800" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Operator Instructions & Quality Guidelines */}
          <div className="bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-6 shadow-soft-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-[#27272A]">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                Optical Inspection Guidelines
              </h3>
              <span className="text-[11px] font-mono text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-900">
                Operator Best Practices
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 leading-relaxed">
              Ensure reliable segmentation, crop extraction, and calibrated physical dimensions:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-[#121214] p-3.5 rounded-xl border border-zinc-200 dark:border-[#27272A]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-100">Overhead Lighting:</strong> Position camera directly overhead with diffuse, shadow-minimized illumination.
                </span>
              </div>
              <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-[#121214] p-3.5 rounded-xl border border-zinc-200 dark:border-[#27272A]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-100">Coin Reference:</strong> Include a standard coin (₹1, ₹2, ₹5, ₹10) in the same plane for physical mm calibration.
                </span>
              </div>
            </div>
          </div>

          {/* Upload & Calibration Component */}
          <UploadZone onStartInspection={handleStartInspection} loading={loading} />

          {/* API Error Notification */}
          {apiError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 p-4 rounded-xl flex items-start gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">API Connection Error</p>
                <p className="mt-0.5 leading-relaxed">{apiError}</p>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
};
