import os
import io
import json
import gdown
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
import torch
import torchvision.transforms as transforms
from model import get_resnet50_model
from datetime import datetime, timedelta
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# ── Gemini Setup ───────────────────────────────────────────────────────────────
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_gemini_client = None

if _GEMINI_API_KEY:
    _gemini_client = genai.Client(api_key=_GEMINI_API_KEY)

FALLBACK_ADVICE = (
    "Maintain eye hygiene, reduce screen time, and consult a doctor if symptoms persist."
)


def _get_severity(confidence_pct: float) -> str:
    """Return severity tier based on confidence percentage (0-100)."""
    if confidence_pct > 70:
        return "high"
    elif confidence_pct >= 40:
        return "medium"
    return "low"


def generate_gemini_response(disease: str, confidence: float) -> str:
    """
    Generate AI-powered medical advice using Gemini.
    confidence is a 0-1 float; internally converted to percentage.
    Falls back to static advice on any error.
    """
    if not _gemini_client:
        return FALLBACK_ADVICE

    conf_pct = round(confidence * 100, 1)
    severity = _get_severity(conf_pct)

    if severity == "high":
        prompt = (
            f"A retinal scan AI detected '{disease}' with {conf_pct}% confidence (HIGH). "
            "As a helpful medical assistant, provide concise advice in 3-4 short bullet points covering: "
            "1) Likely remedies or treatments, 2) Precautions the patient should take, "
            "3) Lifestyle or dietary tips to slow progression, "
            "4) A strong recommendation to consult an ophthalmologist immediately. "
            "Be empathetic but clinical. Do NOT use asterisks or markdown formatting."
        )
    elif severity == "medium":
        prompt = (
            f"A retinal scan AI detected '{disease}' with {conf_pct}% confidence (MEDIUM – uncertain). "
            "As a helpful medical assistant, provide concise advice in 3 short bullet points covering: "
            "1) Basic precautions to follow, 2) Symptoms to monitor at home, "
            "3) Advice to consult a doctor if symptoms persist or worsen. "
            "Be reassuring but cautious. Do NOT use asterisks or markdown formatting."
        )
    else:  # low
        prompt = (
            f"A retinal scan AI returned a low-confidence result ({conf_pct}%) for '{disease}'. "
            "The patient may be healthy. As a helpful medical assistant, provide 3 short bullet points on: "
            "1) General eye care tips, 2) Reducing screen time and eye strain exercises, "
            "3) A light suggestion to consult a doctor if they notice any vision changes. "
            "Keep the tone positive and simple. Do NOT use asterisks or markdown formatting."
        )

    try:
        response = _gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        text = response.text.strip()
        return text if text else FALLBACK_ADVICE
    except Exception:
        return FALLBACK_ADVICE

app = FastAPI(title="OcuSight Backend")

# ------------------ CORS ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ CONFIG ------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_resnet50.pth")
JSON_PATH = os.path.join(BASE_DIR, "disease_map.json")
PREDICTIONS_FILE = os.path.join(BASE_DIR, "data", "predictions.json")
DEVICE = torch.device("cpu") # Map location strictly to cpu as requested
BEST_THRESHOLD = 0.10

os.makedirs(os.path.join(BASE_DIR, "data"), exist_ok=True)
if not os.path.exists(PREDICTIONS_FILE):
    with open(PREDICTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

def save_prediction(record):
    try:
        with open(PREDICTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = []

    data.append(record)

    with open(PREDICTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ------------------ LOAD JSON ------------------
try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        disease_map = json.load(f)
except FileNotFoundError:
    raise RuntimeError(f"Could not find disease mapping at {JSON_PATH}")

disease_cols = list(disease_map.keys())
NUM_CLASSES = len(disease_cols)

# ------------------ LOAD MODEL ------------------
if not os.path.exists(MODEL_PATH):
    print("⬇️ Downloading model from Google Drive...")
    url = "https://drive.google.com/uc?id=1K965YTQ1--6fneSFjHwG98GOOLn3BqgG"
    gdown.download(url, MODEL_PATH, quiet=False)
    print("✅ Model downloaded")

# Loaded globally only once
model = get_resnet50_model(NUM_CLASSES, MODEL_PATH, DEVICE)

# ------------------ TRANSFORM ------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ------------------ API ------------------
@app.get("/")
def home():
    return {"message": "OcuSight ResNet50 Backend running 🚀"}

import shutil

async def _run_inference(file: UploadFile):
    """Shared inference logic for /predict and /analyze."""
    # Basic error handling for file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    try:
        # Save file temporarily
        file_path = f"temp/{file.filename}"
        os.makedirs("temp", exist_ok=True)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image = Image.open(file_path).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.sigmoid(outputs).cpu().numpy()[0]

    results = []

    for i in range(len(probs)):
        if probs[i] > BEST_THRESHOLD:
            code = disease_cols[i]

            # Get info from JSON
            info = disease_map.get(code, {
                "full_name": code,
                "description": "No description available"
            })

            results.append({
                "code": code,
                "name": info["full_name"],
                "description": info["description"],
                "confidence": float(probs[i])
            })

    # Sort by confidence
    results.sort(key=lambda x: x["confidence"], reverse=True)

    preds = results

    if len(preds) == 0:
        # No disease signal — treat as healthy with low confidence
        severity = "low"
        advice = generate_gemini_response("Healthy Eye", 0.0)
        result_data = {
            "status": "Healthy",
            "confidence": 0,
            "severity": severity,
            "message": "No significant disease detected",
            "advice": advice,
            "predictions": []
        }
    else:
        top_pred = preds[0]
        top_conf = top_pred["confidence"]
        conf_pct = top_conf * 100
        severity = _get_severity(conf_pct)

        # Generate Gemini advice
        advice = generate_gemini_response(top_pred["name"], top_conf)

        # Classification logic (same as CLI)
        if top_conf < 0.2:
            result_data = {
                "status": "Healthy",
                "confidence": round(top_conf, 4),
                "severity": severity,
                "message": "Very low risk",
                "advice": advice,
                "predictions": preds[:5]
            }

        elif top_conf < 0.3:
            result_data = {
                "status": "Low Risk",
                "confidence": round(top_conf, 4),
                "severity": severity,
                "message": "Weak signals detected, monitor regularly",
                "advice": advice,
                "predictions": preds[:5]
            }

        else:
            result_data = {
                "status": "Disease Detected",
                "confidence": round(top_conf, 4),
                "severity": severity,
                "top_prediction": top_pred,
                "predictions": preds[:5],
                "advice": advice
            }

    # Save prediction
    record = {
        "id": datetime.now().isoformat(),
        "filename": file.filename,
        "timestamp": datetime.now().isoformat(),
        "status": result_data["status"],
        "confidence": result_data["confidence"],
        "severity": result_data.get("severity"),
        "top_prediction": result_data.get("top_prediction"),
        "predictions": result_data.get("predictions", [])
    }
    save_prediction(record)

    return result_data

@app.post("/predict")
async def predict_api(file: UploadFile = File(...)):
    return await _run_inference(file)

@app.post("/analyze")
async def analyze_api(file: UploadFile = File(...)):
    return await _run_inference(file)

@app.get("/history")
def get_history():
    try:
        with open(PREDICTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = []
    return list(reversed(data))

@app.get("/stats")
def get_stats():
    try:
        with open(PREDICTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = []

    total_scans = len(data)
    completed = total_scans
    disease_detected_count = sum(1 for d in data if d.get("status") == "Disease Detected")
    detection_rate = (disease_detected_count / total_scans) if total_scans > 0 else 0

    recent_activity = [
        {
            "id": r["id"],
            "filename": r["filename"],
            "status": r["status"],
            "timestamp": r["timestamp"]
        } for r in reversed(data[-5:])
    ]

    distribution_counts = {}
    for r in data:
        if r.get("status") == "Disease Detected" and r.get("top_prediction"):
            name = r["top_prediction"].get("name")
            if name:
                distribution_counts[name] = distribution_counts.get(name, 0) + 1

    distribution = [{"name": k, "value": v} for k, v in distribution_counts.items()]

    return {
        "total_scans": total_scans,
        "completed": completed,
        "disease_detected_count": disease_detected_count,
        "detection_rate": detection_rate,
        "recent_activity": recent_activity,
        "distribution": distribution
    }

@app.get("/analytics")
def get_analytics(period: str = "12 months"):
    try:
        with open(PREDICTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = []

    now = datetime.now()
    if period == "7 days":
        cutoff = now - timedelta(days=7)
    elif period == "30 days":
        cutoff = now - timedelta(days=30)
    elif period == "3 months":
        cutoff = now - timedelta(days=90)
    else:
        cutoff = now - timedelta(days=365)

    filtered_data = []
    for d in data:
        try:
            dt = datetime.fromisoformat(d["timestamp"])
            if dt >= cutoff:
                filtered_data.append(d)
        except Exception:
            pass

    filtered_data.sort(key=lambda x: x["timestamp"])

    total_scans = len(filtered_data)
    total_patients = len(set(d.get("filename") for d in filtered_data)) if filtered_data else 0
    avg_confidence = (sum(d.get("confidence", 0) for d in filtered_data) / total_scans) if total_scans > 0 else 0

    disease_detected_count = sum(1 for d in filtered_data if d.get("status") == "Disease Detected")
    detection_rate = (disease_detected_count / total_scans) if total_scans > 0 else 0

    disease_distribution_counts = {}
    for d in filtered_data:
        if d.get("status") == "Disease Detected" and d.get("top_prediction"):
            name = d["top_prediction"].get("name")
            if name:
                disease_distribution_counts[name] = disease_distribution_counts.get(name, 0) + 1
                
    disease_distribution = [{"name": k, "value": v} for k, v in disease_distribution_counts.items()]

    monthly_counts = {}
    for d in filtered_data:
        try:
            dt = datetime.fromisoformat(d["timestamp"])
            month_str = dt.strftime("%b")
            monthly_counts[month_str] = monthly_counts.get(month_str, 0) + 1
        except Exception:
            pass
            
    monthly_uploads_list = []
    seen_months = set()
    for d in filtered_data:
        try:
            dt = datetime.fromisoformat(d["timestamp"])
            month_str = dt.strftime("%b")
            if month_str not in seen_months:
                seen_months.add(month_str)
                monthly_uploads_list.append(month_str)
        except Exception:
            pass

    monthly_uploads = [{"month": m, "uploads": monthly_counts[m]} for m in monthly_uploads_list]

    confidence_trend_raw = filtered_data[-10:]
    confidence_trend = []
    for d in confidence_trend_raw:
        try:
            dt = datetime.fromisoformat(d["timestamp"])
            confidence_trend.append({
                "month": dt.strftime("%b %d"),
                "avg": round((d.get("confidence", 0) * 100), 1)
            })
        except Exception:
            pass

    return {
        "total_scans": total_scans,
        "total_patients": total_patients,
        "avg_confidence": avg_confidence,
        "detection_rate": detection_rate,
        "disease_distribution": disease_distribution,
        "monthly_uploads": monthly_uploads,
        "confidence_trend": confidence_trend
    }