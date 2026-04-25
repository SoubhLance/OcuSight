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
DEVICE = torch.device("cpu") # Map location strictly to cpu as requested
BEST_THRESHOLD = 0.10

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
        return {
            "status": "Healthy",
            "confidence": 0,
            "message": "No significant disease detected",
            "predictions": []
        }

    top_pred = preds[0]
    top_conf = top_pred["confidence"]

    # Classification logic (same as CLI)
    if top_conf < 0.2:
        return {
            "status": "Healthy",
            "confidence": round(top_conf, 4),
            "message": "Very low risk",
            "predictions": preds[:5]
        }

    elif top_conf < 0.3:
        return {
            "status": "Low Risk",
            "confidence": round(top_conf, 4),
            "message": "Weak signals detected, monitor regularly",
            "predictions": preds[:5]
        }

    else:
        return {
            "status": "Disease Detected",
            "confidence": round(top_conf, 4),
            "top_prediction": top_pred,
            "predictions": preds[:5],
            "advice": "Consult a medical professional for confirmation"
        }

@app.post("/predict")
async def predict_api(file: UploadFile = File(...)):
    return await _run_inference(file)


@app.post("/analyze")
async def analyze_api(file: UploadFile = File(...)):
    return await _run_inference(file)