import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Tag,
  Columns,
  Eye,
  ImageIcon,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { apiClient, getAssetUrl } from '../../api/client';
import type { OnionResultResponse } from '../../api/types';

interface SegmentationViewerProps {
  originalImageUrl: string;
  overlayImageUrl?: string | null;
  totalOnions?: number | null;
  onions?: OnionResultResponse[];
  calibration?: Record<string, any> | null;
}

export const SegmentationViewer: React.FC<SegmentationViewerProps> = ({
  originalImageUrl,
  overlayImageUrl,
  totalOnions,
  onions = [],
  calibration,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'overlay' | 'original'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [rawSrc, setRawSrc] = useState<string>('');
  const [overlaySrc, setOverlaySrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [overlayError, setOverlayError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Authenticated asset resolution (handles token headers and blob URLs)
  useEffect(() => {
    let isMounted = true;
    let rawBlobUrl: string | null = null;
    let overlayBlobUrl: string | null = null;

    async function loadAssets() {
      if (!originalImageUrl) {
        setLoading(false);
        setHasError(false);
        return;
      }

      setLoading(true);
      setHasError(false);
      setOverlayError(false);

      // 1. Resolve raw original image
      try {
        const res = await apiClient.get(originalImageUrl, { responseType: 'blob' });
        if (isMounted) {
          rawBlobUrl = URL.createObjectURL(res.data);
          setRawSrc(rawBlobUrl);
        }
      } catch {
        // Fallback to getAssetUrl (with query token)
        if (isMounted) {
          setRawSrc(getAssetUrl(originalImageUrl));
        }
      }

      // 2. Resolve AI segmentation overlay image if present
      if (overlayImageUrl) {
        try {
          const res = await apiClient.get(overlayImageUrl, { responseType: 'blob' });
          if (isMounted) {
            overlayBlobUrl = URL.createObjectURL(res.data);
            setOverlaySrc(overlayBlobUrl);
          }
        } catch {
          if (isMounted) {
            setOverlaySrc(getAssetUrl(overlayImageUrl));
          }
        }
      } else {
        setOverlaySrc('');
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadAssets();

    return () => {
      isMounted = false;
      if (rawBlobUrl) URL.revokeObjectURL(rawBlobUrl);
      if (overlayBlobUrl) URL.revokeObjectURL(overlayBlobUrl);
    };
  }, [originalImageUrl, overlayImageUrl, reloadKey]);

  // Zoom & Pan Handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Dynamic Class Legend filtering based on real inference data
  const hasRedOnion =
    onions.length > 0
      ? onions.some((o) => o.variety?.toLowerCase().includes('red'))
      : true;
  const hasYellowOnion =
    onions.length > 0
      ? onions.some((o) => o.variety?.toLowerCase().includes('yellow') || !o.variety)
      : true;
  const hasReference = Boolean(
    calibration?.reference_detected ||
      calibration?.status === 'CALIBRATED' ||
      calibration?.status === 'ESTIMATED'
  );
  const hasDefect = onions.some(
    (o) =>
      o.quality_class?.toLowerCase() === 'unhealthy' ||
      o.grade === 'Reject' ||
      (o.defect_area !== null && o.defect_area !== undefined && o.defect_area > 0)
  );

  return (
    <div
      className={`bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-zinc-800/80 overflow-hidden shadow-soft-sm flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl bg-white dark:bg-[#09090B]'
          : ''
      }`}
    >
      {/* Viewer Toolbar */}
      <div className="px-5 py-3.5 bg-zinc-50/70 dark:bg-[#121214] border-b border-zinc-200/90 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Mode Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <ImageIcon className="w-4 h-4 text-brand-500" />
            Inspection View
          </span>

          <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/60 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-brand-500 text-white shadow-soft-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'overlay'
                  ? 'bg-brand-500 text-white shadow-soft-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              AI Overlay
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'original'
                  ? 'bg-brand-500 text-white shadow-soft-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Original
            </button>
          </div>
        </div>

        {/* Zoom & Fit Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            title="Zoom Out"
            disabled={zoomLevel <= 0.5}
            icon={<ZoomOut className="w-3.5 h-3.5" />}
          />
          <span className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400 w-12 text-center select-none">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            title="Zoom In"
            disabled={zoomLevel >= 3}
            icon={<ZoomIn className="w-3.5 h-3.5" />}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            title="Fit to Screen"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Fit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            icon={<Maximize2 className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Main Image Surface (Soft Neutral Studio Canvas) */}
      <div
        className="relative flex-1 bg-zinc-100/90 dark:bg-[#151518] min-h-[400px] max-h-[640px] flex items-center justify-center overflow-hidden p-4 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Loading inspection image...
            </p>
          </div>
        ) : hasError ? (
          /* Error State (No broken image icons!) */
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px] bg-white dark:bg-[#121214] rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 shadow-soft-xs max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Inspection image unavailable
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              The inspection result was loaded, but its source image could not be displayed.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry
            </Button>
          </div>
        ) : !originalImageUrl ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[360px]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              No inspection image selected
            </p>
          </div>
        ) : viewMode === 'split' ? (
          /* Split View: Left Original vs Right AI Segmentation */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-w-full items-center justify-center">
            {/* Left: Original Capture */}
            <div className="flex flex-col items-center justify-center bg-white dark:bg-[#101012] rounded-2xl p-2.5 border border-zinc-200/90 dark:border-zinc-800 shadow-soft-xs relative overflow-hidden group min-h-[320px]">
              <div className="absolute top-3 left-3 bg-zinc-900/85 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-zinc-700/80 z-10 font-semibold tracking-wider shadow-soft-xs">
                Original Capture
              </div>
              <img
                src={rawSrc}
                alt="Original inspection capture"
                onError={() => setHasError(true)}
                className="max-w-full max-h-[480px] object-contain rounded-xl transition-transform duration-100"
                style={{
                  transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
              />
            </div>

            {/* Right: AI Inspection (YOLOv8n-seg) */}
            <div className="flex flex-col items-center justify-center bg-white dark:bg-[#101012] rounded-2xl p-2.5 border border-zinc-200/90 dark:border-zinc-800 shadow-soft-xs relative overflow-hidden group min-h-[320px]">
              <div className="absolute top-3 left-3 bg-emerald-950/90 backdrop-blur-xs text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-emerald-700/70 z-10 flex items-center gap-1.5 font-semibold tracking-wider shadow-soft-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Inspection
              </div>
              {overlaySrc && !overlayError ? (
                <img
                  src={overlaySrc}
                  alt="AI segmentation overlay"
                  onError={() => setOverlayError(true)}
                  className="max-w-full max-h-[480px] object-contain rounded-xl transition-transform duration-100"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  }}
                />
              ) : (
                <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    AI overlay unavailable for this inspection
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single View: Overlay or Original */
          <div className="w-full h-full flex items-center justify-center relative min-h-[360px]">
            <div className="absolute top-3 left-3 bg-zinc-900/85 backdrop-blur-xs text-white text-[11px] font-mono px-3 py-1 rounded-md border border-zinc-700/80 z-10 shadow-soft-xs">
              {viewMode === 'overlay' ? '● AI Inspection (YOLOv8n-seg)' : '● Original Capture'}
            </div>

            {viewMode === 'overlay' && (!overlaySrc || overlayError) ? (
              <div className="min-h-[340px] flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-soft-xs max-w-sm">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  AI overlay unavailable for this inspection
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('original')}
                  className="mt-3"
                >
                  View Original Capture
                </Button>
              </div>
            ) : (
              <img
                src={viewMode === 'overlay' ? overlaySrc : rawSrc}
                alt={viewMode === 'overlay' ? 'AI Inspection' : 'Original Capture'}
                onError={() => {
                  if (viewMode === 'overlay') setOverlayError(true);
                  else setHasError(true);
                }}
                className="max-w-full max-h-[540px] object-contain rounded-2xl shadow-soft-md transition-transform duration-100"
                style={{
                  transform: `scale(${zoomLevel}) translate(${pan.x / zoomLevel}px, ${pan.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Visual Legend Bar (Part 12 Cleaned Up) */}
      <div className="px-5 py-3 bg-white dark:bg-[#121214] border-t border-zinc-200/90 dark:border-zinc-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Tag className="w-3 h-3 text-brand-500" />
            Class Legend:
          </span>

          {hasRedOnion && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c026d3] inline-block shadow-soft-xs" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Red Onion</span>
            </div>
          )}

          {hasYellowOnion && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d97706] inline-block shadow-soft-xs" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">Yellow Onion</span>
            </div>
          )}

          {hasReference && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0891b2] inline-block shadow-soft-xs" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Reference Object
              </span>
            </div>
          )}

          {hasDefect && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] inline-block shadow-soft-xs" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Defect / Unhealthy
              </span>
            </div>
          )}
        </div>

        {totalOnions !== null && totalOnions !== undefined && (
          <div className="text-zinc-500 dark:text-zinc-400 font-medium text-xs flex items-center gap-1.5">
            <span>Detected Onions:</span>
            <span className="font-bold text-zinc-900 dark:text-white font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">
              {totalOnions}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
