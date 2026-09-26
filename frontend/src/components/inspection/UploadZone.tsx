import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  AlertTriangle,
  ArrowRight,
  Info,
  Check,
  FileCheck,
} from 'lucide-react';
import { Button } from '../common/Button';
import { formatBytes } from '../../utils/formatters';

interface UploadZoneProps {
  onStartInspection: (file: File, referenceDiameterMm?: number) => void;
  loading?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onStartInspection, loading = false }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enableCalibration, setEnableCalibration] = useState<boolean>(true);
  const [referenceDiameterMm, setReferenceDiameterMm] = useState<number>(25.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 15 * 1024 * 1024; // 15MB

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(`Invalid format: ${selectedFile.name}. Only JPG, JPEG, PNG, and WEBP are supported.`);
      return;
    }

    if (selectedFile.size > maxSizeBytes) {
      setError(`File size (${formatBytes(selectedFile.size)}) exceeds the maximum allowed limit of 15 MB.`);
      return;
    }

    // Verify image readability & minimum dimensions
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 50 || img.height < 50) {
          setError('Image dimensions too small (minimum 50x50 pixels required for CV inference).');
          return;
        }
        setFile(selectedFile);
        setPreviewUrl(e.target?.result as string);
      };
      img.onerror = () => {
        setError('Corrupted image binary: unable to decode visual stream.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!file) return;
    onStartInspection(file, enableCalibration ? referenceDiameterMm : undefined);
  };

  return (
    <div className="space-y-6">
      {/* 3-Step Process Flow Container */}
      <div className="space-y-6">
        {/* STEP 1: Select Image */}
        <div className="bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-6 shadow-soft-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center font-mono">
              1
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Step 1: Select Image
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Upload or drop an onion batch photograph for optical analysis
              </p>
            </div>
          </div>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-200 select-none ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 scale-[0.99]'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-brand-500 dark:hover:border-brand-500 bg-zinc-50/60 dark:bg-[#121214] hover:bg-brand-50/20 dark:hover:bg-[#18181B]'
              }`}
            >
              <input
                ref={inputRef}
                id="upload-file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-brand-50/60 dark:ring-brand-950/30">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Upload Image or drag and drop
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm mx-auto leading-relaxed">
                Take a clean top-down photograph of your onion batch with even illumination
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0D0D0F] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                Supported formats: JPG, JPEG, PNG, WEBP (Max 15MB)
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 dark:bg-[#121214] rounded-xl p-4 border border-zinc-200 dark:border-[#27272A]">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Large Preview */}
                <div className="w-full sm:w-64 h-52 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 shrink-0 relative group">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Selected target preview"
                      className="w-full h-full object-contain p-1"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-900/80 hover:bg-red-600 text-white rounded-md transition-colors shadow"
                    title="Change / Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* File Metadata & Actions */}
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm break-all">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      <span className="bg-white dark:bg-[#0D0D0F] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                        {formatBytes(file.size)}
                      </span>
                      <span className="bg-white dark:bg-[#0D0D0F] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                        {file.type || 'image'}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Validated
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Image validated and ready for analysis. Proceed to Step 2 to configure scale calibration.
                  </p>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                      disabled={loading}
                    >
                      Change Image
                    </Button>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Calibration */}
        <div className="bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-6 shadow-soft-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center font-mono">
              2
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Step 2: Physical Scale Calibration
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Estimate physical millimeter dimensions from camera sensor pixels
              </p>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-[#121214] rounded-xl p-4 border border-zinc-200 dark:border-[#27272A] space-y-4">
            <div className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
              <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <span>
                <strong>How it works:</strong> Use a visible reference object (such as a standard coin or circular calibration disc) placed in the same focal plane to calibrate physical millimetres.
              </span>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={enableCalibration}
                  onChange={(e) => setEnableCalibration(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-brand-500 focus:ring-brand-500 w-4 h-4"
                />
                <span>Reference object is present in this image</span>
              </label>
            </div>

            {enableCalibration && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Reference Object Known Diameter:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '₹1 Coin (20.0 mm)', val: 20.0 },
                      { label: '₹2 Coin (25.0 mm)', val: 25.0 },
                      { label: '₹5 Coin (23.0 mm)', val: 23.0 },
                      { label: '₹10 Coin (27.0 mm)', val: 27.0 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setReferenceDiameterMm(opt.val)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          referenceDiameterMm === opt.val
                            ? 'bg-brand-50 text-brand-700 border-brand-500 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                            : 'bg-white dark:bg-[#0D0D0F] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Custom Diameter (mm):</span>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="150"
                    value={referenceDiameterMm}
                    onChange={(e) => setReferenceDiameterMm(parseFloat(e.target.value) || 25.0)}
                    className="w-24 px-2.5 py-1 text-xs font-mono font-semibold rounded-lg bg-white dark:bg-[#0D0D0F] border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs text-zinc-400">mm</span>
                </div>
              </div>
            )}

            {!enableCalibration && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
                <strong>Calibration Disabled:</strong> Without a physical reference, all morphometry measurements will be reported accurately in sensor pixels, and millimeter dimensions will state "Calibration required".
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: Start Inspection */}
        <div className="bg-white dark:bg-[#0D0D0F] rounded-2xl border border-zinc-200/90 dark:border-[#27272A] p-6 shadow-soft-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-brand-500 text-white font-bold text-xs flex items-center justify-center font-mono">
              3
            </span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Step 3: Execute Inspection
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Run the 9-stage deep vision pipeline with segmentation, classification & grading
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              loading={loading}
              disabled={!file}
              icon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold shadow-md hover:shadow-lg transition-all"
            >
              {loading ? 'Processing Pipeline...' : 'START INSPECTION'}
            </Button>

            {file && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleRemove}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            )}

            {!file && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Select an image above to activate inspection
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-red-900 dark:text-red-200">Validation Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
