import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Printer,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { ErrorState } from '../components/common/ErrorState';
import { useInspection } from '../hooks/useInspection';
import { getInspectionReport } from '../api/inspections';
import { formatDate, formatPercent, formatScore, formatBytes } from '../utils/formatters';
import type { ReportResponse } from '../api/types';

export const Report: React.FC = () => {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const { inspection, loading, error, refetch } = useInspection(inspectionId);
  const [reportMeta, setReportMeta] = useState<ReportResponse | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!inspectionId) return;
    getInspectionReport(inspectionId)
      .then((data) => setReportMeta(data))
      .catch(() => setReportMeta(null));
  }, [inspectionId]);

  if (loading && !inspection) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Inspection Report"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo={`/inspections/${inspectionId}/results`}
        />
        <PageContainer>
          <Loading fullPage label="Preparing Official Inspection Document..." />
        </PageContainer>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header
          title="Inspection Report"
          subtitle={`Inspection ID: ${inspectionId}`}
          showBack
          backTo={`/inspections/${inspectionId}/results`}
        />
        <PageContainer>
          <ErrorState
            title="Report Generation Failed"
            message={error || 'Unable to locate inspection record.'}
            onRetry={refetch}
          />
        </PageContainer>
      </div>
    );
  }

  const healthyCount = inspection.onions.filter((o) => o.quality_class === 'Healthy').length;
  const unhealthyCount = inspection.onions.filter((o) => o.quality_class === 'Unhealthy').length;

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateReport = async () => {
    if (!inspectionId) return;
    setGenerating(true);
    setPdfError(null);
    try {
      const data = await getInspectionReport(inspectionId);
      setReportMeta(data);
    } catch (err: any) {
      setPdfError(err?.response?.data?.detail || err?.message || 'Failed to generate PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!inspectionId) return;
    try {
      const downloadUrl = `/api/inspections/${inspectionId}/report/pdf`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `ONIONVISION_Report_${inspectionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setPdfError('Failed to initiate PDF download.');
    }
  };

  const handleOpenPdf = () => {
    if (!inspectionId) return;
    window.open(`/api/inspections/${inspectionId}/report/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      <div className="no-print">
        <Header
          title="Inspection Report Preview"
          subtitle={`Traceable Reference: ${inspection.inspection_id}`}
          showBack
          backTo={`/inspections/${inspectionId}/results`}
          action={
            <div className="flex items-center gap-2">
              {reportMeta?.status === 'available' ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPdf}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenPdf}
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    Open PDF
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleGenerateReport}
                  loading={generating}
                  icon={<FileText className="w-4 h-4" />}
                >
                  Generate Report
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
              >
                Print
              </Button>
            </div>
          }
        />
      </div>

      <PageContainer maxWidth="standard" className="py-6 sm:py-10">
        {/* PDF Status and Action Banner */}
        <div className="no-print mb-6">
          {generating && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin shrink-0" />
              <div>
                <span className="font-bold text-emerald-950 dark:text-emerald-200">
                  Compiling ReportLab PDF...
                </span>
                <span className="text-emerald-700 dark:text-emerald-300 ml-1.5">
                  Building official ReportLab PDF with complete metrics and morphometry.
                </span>
              </div>
            </div>
          )}

          {!generating && reportMeta?.status === 'available' && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                    PDF Document Ready
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 ml-2">
                    Official inspection report generated
                    {reportMeta.file_size_bytes
                      ? ` • Size: ${formatBytes(reportMeta.file_size_bytes)}`
                      : ''}
                    {reportMeta.created_at ? ` • Generated: ${formatDate(reportMeta.created_at)}` : ''}.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadPdf}
                  icon={<Download className="w-4 h-4" />}
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPdf}
                  icon={<ExternalLink className="w-4 h-4" />}
                >
                  Open PDF
                </Button>
              </div>
            </div>
          )}

          {!generating && (!reportMeta || reportMeta.status !== 'available') && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Technical Inspection Report
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                    Compile formal offline PDF with detailed batch analytics.
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateReport}
                loading={generating}
                icon={<FileText className="w-4 h-4" />}
              >
                Generate Report
              </Button>
            </div>
          )}

          {pdfError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pdfError}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPdfError(null)}>
                Dismiss
              </Button>
            </div>
          )}
        </div>

        {/* Printable Formal Report Document Paper (Pure White Clean Document) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 md:p-12 space-y-8 card-print text-slate-900">
          {/* Document Header */}
          <div className="border-b-2 border-emerald-700 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-emerald-800">
                  ONIONVISION
                </span>
                <span className="text-xs font-mono uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-semibold">
                  Official Quality Inspection Report
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">
                AI-Based Onion Quality Inspection & Automated Grading System
              </p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Team: THE DEBUGGERS • Smart India Hackathon
              </p>
            </div>

            <div className="text-left md:text-right text-xs text-slate-600 font-mono space-y-1">
              <div>
                <strong>Report Ref:</strong> {inspection.inspection_id}
              </div>
              <div>
                <strong>Generated:</strong>{' '}
                {formatDate(inspection.completed_at || inspection.created_at)}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className="text-emerald-700 font-semibold uppercase">{inspection.status}</span>
              </div>
            </div>
          </div>

          {/* Inspection Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Total Sample Count</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {inspection.total_onions ?? inspection.onions.length} Onions
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Overall Quality Score</span>
              <span className="font-bold text-emerald-700 text-sm font-mono mt-0.5 block">
                {formatScore(inspection.quality_score)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Average Calibrated Size</span>
              <span className="font-bold text-slate-900 text-sm font-mono mt-0.5 block">
                {inspection.average_size_mm ? `${inspection.average_size_mm.toFixed(1)} mm` : 'Uncalibrated'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Defect Rate</span>
              <span className="font-bold text-rose-700 text-sm font-mono mt-0.5 block">
                {formatPercent(inspection.defect_rate)}
              </span>
            </div>
          </div>

          {/* Batch Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              1. Batch Quality & Grading Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-slate-700 block">
                  Health Classification (MobileNetV3)
                </span>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Healthy Bulbs:</span>
                  <span className="font-bold text-emerald-600">
                    {healthyCount} (
                    {inspection.onions.length > 0
                      ? formatPercent((healthyCount / inspection.onions.length) * 100)
                      : '—'}
                    )
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Unhealthy / Defective:</span>
                  <span className="font-bold text-rose-600">
                    {unhealthyCount} (
                    {inspection.onions.length > 0
                      ? formatPercent((unhealthyCount / inspection.onions.length) * 100)
                      : '—'}
                    )
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <span className="font-bold text-slate-700 block">
                  Grade Breakdown (Prototype Engine)
                </span>
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-semibold block">Grade A</span>
                    <span className="text-base font-bold text-emerald-900">
                      {inspection.onions.filter((o) => o.grade === 'Grade A').length}
                    </span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                    <span className="text-[10px] text-blue-700 font-semibold block">Grade B</span>
                    <span className="text-base font-bold text-blue-900">
                      {inspection.onions.filter((o) => o.grade === 'Grade B').length}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-700 font-semibold block">Grade C</span>
                    <span className="text-base font-bold text-amber-900">
                      {inspection.onions.filter((o) => o.grade === 'Grade C').length}
                    </span>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <span className="text-[10px] text-rose-700 font-semibold block">Reject</span>
                    <span className="text-base font-bold text-rose-900">
                      {inspection.onions.filter((o) => o.grade === 'Reject').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scale Calibration Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              2. Scale Calibration Reference
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <p>
                <strong>Calibration State:</strong> {inspection.calibration?.status || 'ESTIMATED'}
              </p>
              <p>
                <strong>Reference Disc Detected:</strong>{' '}
                {inspection.calibration?.reference_detected ? 'Yes (Localized in frame)' : 'No'}
              </p>
              {inspection.calibration?.pixels_per_mm ? (
                <p>
                  <strong>Scale Factor:</strong> {inspection.calibration.pixels_per_mm.toFixed(2)}{' '}
                  pixels / mm
                </p>
              ) : (
                <p className="text-amber-800">
                  <strong>Notice:</strong> No calibration constant provided. Physical size is reported
                  as uncalibrated.
                </p>
              )}
            </div>
          </div>

          {/* Individual Onion Results Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              3. Individual Onion Measurements
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Variety</th>
                    <th className="py-2.5 px-3 text-center">Health</th>
                    <th className="py-2.5 px-3 text-center">Confidence</th>
                    <th className="py-2.5 px-3 text-center">Size (mm)</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-left">Primary Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspection.onions.map((o) => (
                    <tr key={o.onion_number}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        #{o.onion_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{o.variety || 'Onion'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-semibold ${
                            o.quality_class === 'Healthy' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {o.quality_class || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {o.confidence ? `${Math.round(o.confidence * 100)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {o.size_mm ? `${o.size_mm.toFixed(1)} mm` : 'Uncalibrated'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{o.grade || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                        {o.reasons && o.reasons.length > 0 ? o.reasons[0] : 'Standard evaluation'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Limitations & Traceability */}
          <div className="space-y-2 border-t border-slate-200 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Technical Limitations & Compliance Notes
            </h4>
            <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
              <li>
                This inspection report is generated by the ONIONVISION autonomous computer vision
                pipeline (YOLOv8n-seg and MobileNetV3-Small).
              </li>
              <li>
                Grades are calculated using the engineering prototype rule engine and do not constitute
                statutory commercial certification (e.g. AGMARK or NAFED).
              </li>
              <li>
                Scale dimensions are dependent upon camera optical distortion and presence of a planar
                calibration reference disc.
              </li>
            </ul>
          </div>

          {/* Document Footer */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>ONIONVISION Quality Intelligence System • Phase 08</span>
            <span>Auth: THE DEBUGGERS</span>
          </div>
        </div>

        {/* Backend Report Endpoint Status Notice */}
        {reportMeta && reportMeta.status === 'not_implemented' && (
          <div className="mt-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3 no-print">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Direct Server PDF Generation Note:
              </p>
              <p className="mt-0.5">{reportMeta.message}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                You can currently use the <strong>"Print to PDF"</strong> button above to save the
                formal report document directly via your browser.
              </p>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
};
