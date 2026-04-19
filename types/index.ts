// types/index.ts
// LOCKED SCHEMA - Do not change without syncing with Member 1

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SuspiciousRegion {
  region_id: string;
  box: BoundingBox;
  type: 'text_tamper' | 'image_artifact' | 'layout_anomaly';
  severity: 'low' | 'medium' | 'high';
  field_label: string;
  reason: string;
  language: string;
}

export interface OCRRegion {
  text: string;
  box: BoundingBox;
  confidence: number;
  language: string;
}

export interface PageAnalysis {
  page_number: number;
  preview_image_url: string;
  ela_heatmap_url?: string;
  suspicious_regions: SuspiciousRegion[];
  ocr_regions: OCRRegion[];
}

export interface AnalysisResult {
  document_id: string;
  status: 'processing' | 'analyzed' | 'failed';
  verdict: 'LIKELY_GENUINE' | 'REVIEW_NEEDED' | 'HIGH_TAMPER_RISK';
  confidence_score: number;
  verdict_label: string;
  top_reasons: string[];
  officer_summary: string;
  pages: PageAnalysis[];
}

export interface AnalyzeRequest {
  file: File;
  language_hint?: 'en' | 'ta' | 'auto';
}

export interface SampleResponse {
  samples: {
    id: string;
    name: string;
    description: string;
    thumbnail_url: string;
    type: 'genuine' | 'tampered';
  }[];
}