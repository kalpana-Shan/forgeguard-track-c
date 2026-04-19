# 🛡️ ForgeGuard

<div align="center">

**AI-powered document forgery detection with explainable evidence**

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python)](https://www.python.org/)

</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Team](#-team)
- [Acknowledgments](#-acknowledgments)


## 🔍 Overview

ForgeGuard is an AI-powered document verification assistant built for **Track C Hackathon (ThinkRoot x Vortex'26)**. It helps verification officers detect forged documents by analyzing text, pixel-level artifacts, and layout inconsistencies.

**Key Innovation:** Unlike black-box AI systems, ForgeGuard's **Trust Lens** panel provides plain-language explanations for every flag, making the verification process transparent and auditable.

## ✨ Features

### 🔬 Hybrid Detection Engine
- **OCR Analysis:** Extracts text in English & Tamil, detects spacing anomalies and overwritten fields
- **Image Forensics:** Error Level Analysis (ELA) to detect pasted/cloned regions
- **Layout Checks:** Identifies misaligned rows, shifted baselines, and template anomalies

### 🧠 Trust Lens (Explainable AI)
- Officer Summary with recommended actions
- Severity breakdown (High / Medium / Low)
- Evidence cards with plain-language explanations
- Interactive region highlighting on document preview

### 🌐 Regional Language Support
- Tamil OCR support with language-specific confidence scoring
- Extensible to other Indic scripts

### 📊 Professional UI
- Glassmorphism + Neon design system
- Real-time confidence ring visualization
- Layer toggle (Original / OCR Boxes / ELA Heatmap)
- Downloadable officer reports (PDF)


## 🎬 Demo

### 🌐 Live Deployment

- **Frontend:** [https://forgeguard.vercel.app](https://forgeguard.vercel.app)
- **Backend API:** [https://forgeguard-api.onrender.com/docs](https://forgeguard-api.onrender.com/docs)

### 🎥 Video Demo

[▶️ Watch Full Demo](https://drive.google.com/your-demo-link)


## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | Next.js 15 + TypeScript | React framework with SSR |
| **Styling** | Tailwind CSS + CSS Variables | Utility-first styling with design tokens |
| **Animations** | Framer Motion | Smooth transitions & micro-interactions |
| **File Upload** | react-dropzone | Drag & drop document upload |
| **Backend** | FastAPI (Python) | High-performance API framework |
| **OCR** | EasyOCR | Multilingual text extraction |
| **Vision** | OpenCV + scikit-image | ELA, edge detection, clone detection |
| **Deployment** | Vercel (Frontend) + Render (Backend) | Production hosting |

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ & npm
- **Python** 3.11+ & pip
- **Git**

### Frontend Setup

```bash
# Clone repository
git clone https://github.com/kalpana-Shan/forgeguard-track-c.git
cd forgeguard-frontend

# Install dependencies
npm install

# Set up environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Run development server
npm run dev

Frontend runs at http://localhost:3000

Backend Setup

cd ../forgeguard-track-c/backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

Backend runs at http://localhost:8000
API docs at http://localhost:8000/docs

📁 Project Structure

forgeguard-track-c/
├── forgeguard-frontend/          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx              # Upload page
│   │   ├── results/
│   │   │   └── page.tsx          # Results page with Trust Lens
│   │   ├── thinkroot/
│   │   │   └── page.tsx          # Design rationale docs
│   │   ├── globals.css           # Design system tokens
│   │   └── layout.tsx
│   ├── components/
│   │   └── ConfidenceRing.tsx    # Animated confidence meter
│   ├── lib/
│   │   ├── api.ts                # Backend API service
│   │   └── mockData.ts           # Fallback sample data
│   ├── types/
│   │   └── index.ts              # TypeScript definitions
│   └── package.json
│
└── backend/                      # FastAPI backend
    ├── main.py                   # API entry point
    ├── routers/
    │   └── analyze.py            # /analyze endpoint
    ├── services/
    │   ├── ocr_engine.py         # EasyOCR integration
    │   ├── image_forensics.py    # ELA & clone detection
    │   └── scoring_engine.py     # Weighted fusion
    ├── requirements.txt
    └── samples/                  # Pre-loaded demo documents

    📡 API Documentation

http://localhost:8000/api

Endpoints

Method	  Endpoint	     Description
GET	      /samples	     List all demo samples
GET	      /sample/{id}	 Get analysis for a sample
POST	    /analyze	     Upload & analyze a document

Sample Response

{
  "document_id": "454752d9",
  "verdict": "HIGH_TAMPER_RISK",
  "confidence_score": 0.87,
  "verdict_label": "High Tamper Risk",
  "top_reasons": [
    "Marks region shows compression mismatch pattern",
    "Text baseline inconsistency detected in marks row"
  ],
  "officer_summary": "Manual verification strongly recommended...",
  "pages": [{
    "preview_image_url": "/uploads/abc123.jpg",
    "ela_heatmap_url": "/overlays/abc123_ela.jpg",
    "suspicious_regions": [...],
    "ocr_regions": [...]
  }]
}

👥 Team

Name	        Role	                    Contributions
Kalpana     	Backend & AI Pipeline	    FastAPI server, OCR integration, ELA analysis, scoring engine, sample data preparation
Vinitha	      Frontend & UI/UX	        Next.js app, Trust Lens panel, glassmorphism UI, API integration, confidence ring component, demo video


🙏 Acknowledgments

ThinkRoot x Vortex'26 - Hackathon organizers

EasyOCR - Multilingual OCR support

OpenCV - Computer vision toolkit

Vercel & Render - Free deployment platforms

📄 License

This project is created for Track C Hackathon (ThinkRoot x Vortex'26) . All rights reserved.
