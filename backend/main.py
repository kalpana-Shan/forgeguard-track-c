from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import analyze, samples
import os

app = FastAPI(title="ForgeGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("overlays", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/overlays", StaticFiles(directory="overlays"), name="overlays")
app.mount("/samples", StaticFiles(directory="samples"), name="samples")

app.include_router(analyze.router)
app.include_router(samples.router)

# ADD THIS ROOT ENDPOINT
@app.get("/")
def root():
    return {
        "service": "ForgeGuard Track C",
        "status": "running",
        "version": "1.0.0",
        "endpoints": [
            "POST /analyze - Analyze document for forgery",
            "GET /sample/{id} - Get preloaded sample analysis",
            "GET /health - Health check",
            "GET /docs - Swagger documentation"
        ]
    }

@app.get("/health")
def health():
    return {"status": "ok", "service": "ForgeGuard"}