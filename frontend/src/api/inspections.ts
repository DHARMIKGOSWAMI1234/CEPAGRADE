import { apiClient } from './client';
import type {
  HealthResponse,
  InspectionDetailResponse,
  InspectionSummary,
  InspectionUploadResponse,
  OnionResultResponse,
  ReportResponse,
} from './types';

/**
 * Checks system health and operational readiness of ML models.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/api/health');
  return response.data;
}

/**
 * Uploads an image and optionally triggers immediate CV execution.
 */
export async function uploadInspection(
  file: File,
  autoProcess: boolean = false,
  referenceDiameterMm?: number
): Promise<InspectionUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const params: Record<string, any> = {
    process: autoProcess,
  };
  if (referenceDiameterMm !== undefined && referenceDiameterMm > 0) {
    params.reference_diameter_mm = referenceDiameterMm;
  }

  const response = await apiClient.post<InspectionUploadResponse>('/api/inspections', formData, {
    params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Executes the complete CV pipeline on an existing inspection image.
 */
export async function processInspection(
  inspectionId: string,
  referenceDiameterMm?: number
): Promise<InspectionDetailResponse> {
  const params: Record<string, any> = {};
  if (referenceDiameterMm !== undefined && referenceDiameterMm > 0) {
    params.reference_diameter_mm = referenceDiameterMm;
  }

  const response = await apiClient.post<InspectionDetailResponse>(
    `/api/inspections/${inspectionId}/process`,
    null,
    { params }
  );
  return response.data;
}

/**
 * Lists historical inspections with pagination.
 */
export async function listInspections(skip: number = 0, limit: number = 50): Promise<InspectionSummary[]> {
  const response = await apiClient.get<InspectionSummary[]>('/api/inspections', {
    params: { skip, limit },
  });
  return response.data;
}

/**
 * Retrieves full inspection record by ID.
 */
export async function getInspection(inspectionId: string): Promise<InspectionDetailResponse> {
  const response = await apiClient.get<InspectionDetailResponse>(`/api/inspections/${inspectionId}`);
  return response.data;
}

/**
 * Retrieves per-onion results for an inspection.
 */
export async function getInspectionResults(inspectionId: string): Promise<OnionResultResponse[]> {
  const response = await apiClient.get<OnionResultResponse[]>(`/api/inspections/${inspectionId}/results`);
  return response.data;
}

/**
 * Retrieves full details for a single detected onion.
 */
export async function getSingleOnion(
  inspectionId: string,
  onionNumber: number
): Promise<OnionResultResponse> {
  const response = await apiClient.get<OnionResultResponse>(
    `/api/inspections/${inspectionId}/onions/${onionNumber}`
  );
  return response.data;
}

/**
 * Retrieves report reference and generation status.
 */
export async function getInspectionReport(inspectionId: string): Promise<ReportResponse> {
  const response = await apiClient.get<ReportResponse>(`/api/inspections/${inspectionId}/report`);
  return response.data;
}

/**
 * Returns the download URL for official PDF inspection report.
 */
export function getReportPdfUrl(inspectionId: string): string {
  return `/api/inspections/${inspectionId}/report/pdf`;
}
