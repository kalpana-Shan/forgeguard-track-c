// lib/api.ts
import { AnalysisResult } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function analyzeDocument(file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  console.log('📤 Sending file to:', `${API_BASE_URL}/analyze`);
  
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API Error:', response.status, errorText);
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ API Response received');
  return data;
}

export async function getSamples(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/samples`);
  if (!response.ok) throw new Error('Failed to fetch samples');
  return response.json();
}

export async function getSampleAnalysis(sampleId: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/sample/${sampleId}`);
  if (!response.ok) throw new Error(`Failed to fetch sample: ${sampleId}`);
  return response.json();
}