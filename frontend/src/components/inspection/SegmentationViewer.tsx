import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  RotateCcw,
  Tag,
  Columns,
  Eye,
} from 'lucide-react';
import { Button } from '../common/Button';
import { getAssetUrl } from '../../api/client';

interface SegmentationViewerProps {
  originalImageUrl: string;
  overlayImageUrl?: string | null;
  totalOnions?: number | null;
}

export const SegmentationViewer: React.FC<SegmentationViewerProps> = ({
  originalImageUrl,
  overlayImageUrl,
  totalOnions,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'overlay' | 'original'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const rawSrc = getAssetUrl(originalImageUrl);
  const overlaySrc = overlayImageUrl ? getAssetUrl(overlayImageUrl) : rawSrc;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white dark:bg-slate-950' : ''
      }`}
    >
      {/* Viewer Toolbar */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Visual Inspection
          </span>

          <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Split View
            </button>
            {overlayImageUrl && (
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'overlay'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                AI Overlay
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('original')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'original'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-12 text-center select-none">
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

      {/* Main Image Display Surface */}
      <div className="relative flex-1 bg-slate-950 min-h-[460px] max-h-[660px] flex items-center justify-center overflow-auto p-4 select-none">
        {viewMode === 'split' ? (
          /* Split View: Left Original vs Right AI Segmentation */
          <div
            className="transition-transform duration-150 origin-center grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-w-full items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Left: Original Image */}
            <div className="flex flex-col items-center justify-center bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 relative">
              <span className="absolute top-3 left-3 bg-slate-900/90 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700/60 z-10">
                RAW CAPTURE
              </span>
              <img
                src={rawSrc}
                alt="Original raw inspection capture"
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            </div>

            {/* Right: AI Segmentation Overlay */}
            <div className="flex flex-col items-center justify-center bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 relative">
              <span className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-700/60 z-10 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI SEGMENTATION
              </span>
              <img
                src={overlaySrc}
                alt="AI instance segmentation and bounding box overlay"
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            </div>
          </div>
        ) : (
          /* Single Large View: Overlay or Original */
          <div
            className="transition-transform duration-150 origin-center flex items-center justify-center max-w-full max-h-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={viewMode === 'overlay' ? overlaySrc : rawSrc}
              alt="Inspection visual focus"
              className="max-w-full max-h-[580px] object-contain rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* View Mode Indicator Overlay */}
        <div className="absolute top-4 left-4 hidden sm:block bg-slate-900/85 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-md border border-slate-700/80 font-mono">
          {viewMode === 'split'
            ? '● Split Comparison: Raw Capture (Left) vs AI Instance Segmentation (Right)'
            : viewMode === 'overlay'
            ? '● AI Overlay: Multi-Class Masks & Bounding Boxes'
            : '● Raw Capture: Unprocessed Optical Stream'}
        </div>
      </div>

      {/* Visual Legend Bar */}
      <div className="px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Class Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#c026d3] inline-block shadow-xs" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Red Onion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#d97706] inline-block shadow-xs" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Yellow Onion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#0891b2] inline-block shadow-xs" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Reference Object (Calibration)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#e11d48] inline-block shadow-xs" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Defect / Unhealthy Highlight</span>
          </div>
        </div>

        {totalOnions !== null && totalOnions !== undefined && (
          <div className="text-slate-500 dark:text-slate-400 font-medium text-xs">
            Detected Instances:{' '}
            <span className="font-bold text-slate-900 dark:text-white font-mono">{totalOnions}</span>
          </div>
        )}
      </div>
    </div>
  );
};
