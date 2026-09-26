/**
 * CEPA GRADE API TypeScript Type Definitions
 * Exact mirrors of FastAPI Pydantic models and CV pipeline output schemas.
 */

export interface HealthResponse {
  status: string;
  service: string;
  models_ready?: boolean;
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  Reject: number;
  [key: string]: number;
}

export interface InspectionUploadResponse {
  inspection_id: string;
  status: 'pending' | 'completed' | 'review_required' | 'failed';
  message: string;
  created_at?: string;
}

export interface InspectionSummary {
  inspection_id: string;
  status: 'pending' | 'completed' | 'review_required' | 'failed';
  created_at: string;
  completed_at?: string | null;
  total_onions?: number | null;
  average_size_mm?: number | null;
  quality_score?: number | null;
  defect_rate?: number | null;
  image_url?: string | null;
}

export interface OnionMorphometry {
  area_pixels?: number;
  perimeter_pixels?: number;
  bbox_width_pixels?: number;
  bbox_height_pixels?: number;
  major_axis_pixels?: number;
  minor_axis_pixels?: number;
  aspect_ratio?: number;
  circularity?: number;
  equivalent_diameter_pixels?: number;
  is_valid_geometry?: boolean;
  solidity?: number;
  extent?: number;
}

export interface GradeBreakdownItem {
  value_mm?: number | null;
  classification?: string | null;
  confidence?: number | null;
  defect_area_pct?: number | null;
  rule?: string | null;
  result?: string | null;
  score_impact?: number | null;
  is_defective?: boolean | null;
  needs_review?: boolean | null;
}

export interface GradingBreakdown {
  size?: GradeBreakdownItem;
  health?: GradeBreakdownItem;
  defects?: GradeBreakdownItem;
  confidence?: GradeBreakdownItem;
  final?: {
    quality_score?: number;
    grade?: string;
    rule?: string;
  };
}

export interface OnionResultResponse {
  id: number;
  onion_number: number;
  size_mm?: number | null;
  quality_class?: 'Healthy' | 'Unhealthy' | string | null;
  grade?: 'Grade A' | 'Grade B' | 'Grade C' | 'Reject' | string | null;
  confidence?: number | null;
  defect_area?: number | null;
  quality_score?: number | null;
  breakdown?: GradingBreakdown | null;
  variety?: 'Red Onion' | 'Yellow Onion' | string | null;
  review_status?: 'AUTO_ACCEPTABLE' | 'REVIEW_RECOMMENDED' | 'MANUAL_REVIEW_REQUIRED' | string | null;
  needs_review?: boolean | null;
  reasons?: string[] | null;
  morphometry?: OnionMorphometry | null;
  bbox?: [number, number, number, number] | null;
  polygon?: [number, number][] | null;
  segmentation_confidence?: number | null;
  quality_confidence?: number | null;
  size_pixels?: number | null;
  crop_url?: string | null;
  mask_url?: string | null;
  created_at?: string | null;
}

export interface CalibrationData {
  status: 'ESTIMATED' | 'UNCALIBRATED' | 'CALIBRATION_CONSTANT_REQUIRED' | 'UNAVAILABLE' | string;
  reference_detected?: boolean;
  reference_diameter_pixels?: number | null;
  reference_diameter_mm?: number | null;
  pixels_per_mm?: number | null;
  mm_per_pixel?: number | null;
  notes?: string | null;
}

export interface InspectionDetailResponse {
  inspection_id: string;
  status: 'pending' | 'completed' | 'review_required' | 'failed';
  created_at: string;
  completed_at?: string | null;
  total_onions?: number | null;
  average_size_mm?: number | null;
  quality_score?: number | null;
  defect_rate?: number | null;
  grade_distribution?: GradeDistribution | null;
  calibration?: CalibrationData | null;
  image_url?: string | null;
  overlay_url?: string | null;
  onions: OnionResultResponse[];
}

export interface ReportResponse {
  inspection_id: string;
  status: 'available' | 'not_implemented' | 'generating' | string;
  file_path?: string | null;
  created_at?: string | null;
  message: string;
  pdf_url?: string | null;
  file_size_bytes?: number | null;
}
