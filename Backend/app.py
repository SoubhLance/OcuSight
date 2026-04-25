import os
import io
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError
import torch
import torchvision.transforms as transforms
from model import get_resnet50_model

app = FastAPI(title="OcuSight Backend")

# ------------------ CONFIG ------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "best_resnet50.pth")
JSON_PATH = os.path.join(BASE_DIR, "disease_map.json")
DEVICE = torch.device("cpu") # Map location strictly to cpu as requested
BEST_THRESHOLD = 0.30

# ------------------ LOAD JSON ------------------
try:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        disease_map = json.load(f)
except FileNotFoundError:
    raise RuntimeError(f"Could not find disease mapping at {JSON_PATH}")

disease_cols = list(disease_map.keys())
NUM_CLASSES = len(disease_cols)

# ------------------ LOAD MODEL ------------------
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

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Basic error handling for file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

    # Prepare tensor
    tensor = transform(image).unsqueeze(0).to(DEVICE)

    # Inference logic
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.sigmoid(outputs).cpu().numpy()[0]

    top_conf = float(max(probs))
    sorted_indices = probs.argsort()[::-1]

    top_idx = int(sorted_indices[0])
    top_prob = float(probs[top_idx])

    if top_prob < 0.65:
        return {
            "status": "Healthy",
            "message": "No reliable disease detected",
            "confidence": round(top_prob, 4),
            "note": "Model confidence is not strong enough. Likely a normal retina, but consult a doctor if needed."
        }

    else:
        code = disease_cols[top_idx]

        info = disease_map.get(code, {
            "full_name": code,
            "description": "No description available"
        })

        return {
            "status": "Disease Detected",
            "top_confidence": round(top_prob, 4),
            "prediction": {
                "code": code,
                "name": info["full_name"],
                "description": info["description"],
                "confidence": round(top_prob, 4)
            },
            "advice": "This is an AI-based assessment. Please consult a medical professional for confirmation."
        }