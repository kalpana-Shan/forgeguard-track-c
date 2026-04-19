// src/lib/mockData.ts
import { AnalysisResult } from '@/types';

// ----- GENUINE DOCUMENT MOCK -----
export const MOCK_GENUINE: AnalysisResult = {
  document_id: "gen-001",
  status: "analyzed",
  verdict: "LIKELY_GENUINE",
  confidence_score: 0.08,
  verdict_label: "Likely Genuine",
  top_reasons: [
    "Document layout matches known template patterns",
    "No compression artifacts detected in critical fields",
    "Font metrics consistent throughout document"
  ],
  officer_summary: "Document appears authentic. No signs of digital manipulation detected. All text fields show consistent typography and alignment.",
  pages: [
    {
      page_number: 1,
      preview_image_url: "https://placehold.co/800x1000/f7f6f2/28251d?text=Genuine+Certificate",
      ela_heatmap_url: "https://placehold.co/800x1000/28251d/4f98a3?text=ELA+Heatmap",
      suspicious_regions: [],
      ocr_regions: [
        {
          text: "CERTIFICATE OF ACHIEVEMENT",
          box: { x: 200, y: 100, w: 400, h: 40 },
          confidence: 0.98,
          language: "en"
        },
        {
          text: "John Doe",
          box: { x: 300, y: 300, w: 200, h: 30 },
          confidence: 0.95,
          language: "en"
        },
        {
          text: "Grade: A+",
          box: { x: 320, y: 450, w: 150, h: 25 },
          confidence: 0.96,
          language: "en"
        }
      ]
    }
  ]
};

// ----- TAMPERED DOCUMENT MOCK (MARKS CHANGED) -----
export const MOCK_TAMPERED_MARKS: AnalysisResult = {
  document_id: "tam-002",
  status: "analyzed",
  verdict: "HIGH_TAMPER_RISK",
  confidence_score: 0.87,
  verdict_label: "High Tamper Risk",
  top_reasons: [
    "Marks region shows compression mismatch pattern",
    "Text baseline inconsistency detected in marks row",
    "ELA reveals pasted content in grade field"
  ],
  officer_summary: "Manual verification strongly recommended. Three suspicious regions detected affecting the marks/grades section. Evidence suggests digital alteration of numerical values.",
  pages: [
    {
      page_number: 1,
      preview_image_url: "https://placehold.co/800x1000/f7f6f2/28251d?text=Tampered+Marksheet",
      ela_heatmap_url: "https://placehold.co/800x1000/28251d/a12c7b?text=ELA+Heatmap+Tampered",
      suspicious_regions: [
        {
          region_id: "r1",
          box: { x: 350, y: 420, w: 180, h: 35 },
          type: "text_tamper",
          severity: "high",
          field_label: "Marks/Grade",
          reason: "OCR confidence drop (0.41) and spacing anomaly in marks field. Character spacing differs from document baseline.",
          language: "en"
        },
        {
          region_id: "r2",
          box: { x: 500, y: 620, w: 100, h: 100 },
          type: "image_artifact",
          severity: "medium",
          field_label: "Seal/Stamp",
          reason: "ELA reveals compression inconsistency consistent with pasted or cloned stamp image.",
          language: "en"
        },
        {
          region_id: "r3",
          box: { x: 200, y: 280, w: 250, h: 40 },
          type: "layout_anomaly",
          severity: "medium",
          field_label: "Student Name Row",
          reason: "Text baseline shift detected. Row appears misaligned compared to adjacent rows.",
          language: "en"
        }
      ],
      ocr_regions: [
        {
          text: "MARKSHEET - FINAL EXAMINATION",
          box: { x: 180, y: 80, w: 440, h: 45 },
          confidence: 0.94,
          language: "en"
        },
        {
          text: "Mathematics: 95",
          box: { x: 250, y: 400, w: 200, h: 28 },
          confidence: 0.97,
          language: "en"
        },
        {
          text: "Physics: 8",
          box: { x: 350, y: 425, w: 100, h: 25 },
          confidence: 0.41,
          language: "en"
        },
        {
          text: "Chemistry: 87",
          box: { x: 250, y: 460, w: 180, h: 28 },
          confidence: 0.96,
          language: "en"
        }
      ]
    }
  ]
};

// ----- TAMIL DOCUMENT MOCK -----
export const MOCK_TAMIL: AnalysisResult = {
  document_id: "tam-003",
  status: "analyzed",
  verdict: "REVIEW_NEEDED",
  confidence_score: 0.52,
  verdict_label: "Review Needed",
  top_reasons: [
    "Mixed script confidence in name field",
    "Unusual spacing detected in Tamil text region",
    "Low confidence OCR on signature line"
  ],
  officer_summary: "Document contains both English and Tamil text. One region shows lower confidence and spacing irregularity. Recommend manual review of name field.",
  pages: [
    {
      page_number: 1,
      preview_image_url: "https://placehold.co/800x1000/f7f6f2/28251d?text=Tamil+Certificate",
      ela_heatmap_url: "https://placehold.co/800x1000/28251d/da7101?text=ELA+Tamil",
      suspicious_regions: [
        {
          region_id: "r1",
          box: { x: 300, y: 350, w: 220, h: 40 },
          type: "text_tamper",
          severity: "low",
          field_label: "பெயர் (Name)",
          reason: "Tamil character spacing irregular. Possible manual editing of name field.",
          language: "ta"
        }
      ],
      ocr_regions: [
        {
          text: "தமிழ்நாடு அரசு",
          box: { x: 280, y: 100, w: 240, h: 35 },
          confidence: 0.91,
          language: "ta"
        },
        {
          text: "சான்றிதழ்",
          box: { x: 330, y: 160, w: 140, h: 30 },
          confidence: 0.93,
          language: "ta"
        },
        {
          text: "பெயர்: குமார்",
          box: { x: 250, y: 350, w: 200, h: 35 },
          confidence: 0.68,
          language: "ta"
        }
      ]
    }
  ]
};

// ----- SAMPLE COLLECTION FOR QUICK SWITCHER -----
export const SAMPLE_DOCS = [
  {
    id: "genuine_marksheet",
    name: "Genuine Marksheet",
    description: "Clean document, no tampering",
    thumbnail_url: "https://placehold.co/200x200/437a22/white?text=✓",
    type: "genuine" as const,
    format: "PDF",
    data: MOCK_GENUINE
  },
  {
    id: "tampered_marksheet",
    name: "Tampered Marksheet",
    description: "Edited marks and seal",
    thumbnail_url: "https://placehold.co/200x200/a12c7b/white?text=⚠",
    type: "tampered" as const,
    format: "JPG",
    data: MOCK_TAMPERED_MARKS
  },
  {
    id: "genuine_cert",
    name: "Genuine Certificate",
    description: "Authentic certificate",
    thumbnail_url: "https://placehold.co/200x200/437a22/white?text=✓",
    type: "genuine" as const,
    format: "PDF",
    data: MOCK_GENUINE
  },
  {
    id: "tampered_cert",
    name: "Tampered Certificate",
    description: "Altered certificate",
    thumbnail_url: "https://placehold.co/200x200/a12c7b/white?text=⚠",
    type: "tampered" as const,
    format: "JPG",
    data: MOCK_TAMPERED_MARKS
  },
  {
    id: "tamil_cert",
    name: "Tamil Certificate",
    description: "Regional language document",
    thumbnail_url: "https://placehold.co/200x200/da7101/white?text=த",
    type: "genuine" as const,
    format: "PDF",
    data: MOCK_TAMIL
  }
];