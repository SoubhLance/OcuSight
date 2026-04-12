from fastapi import FastAPI, UploadFile, File
from PIL import Image
import torch
import torchvision.models as models
import torchvision.transforms as transforms
import torch.nn as nn
import io
import json

app = FastAPI()

# ------------------ CONFIG ------------------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = "checkpoints/best_resnet50.pth"
BEST_THRESHOLD = 0.10

# ------------------ LOAD LABELS ------------------
import pandas as pd
df = pd.read_csv("../data/rfmid/labels/train_labels.csv")
disease_cols = list(df.columns[1:])
NUM_CLASSES = len(disease_cols)

# ------------------ LOAD JSON ------------------
with open("../disease_map.json", "r") as f:
    disease_map = json.load(f)

# ------------------ MODEL ------------------
model = models.resnet50(weights=None)
nf = model.fc.in_features

model.fc = nn.Sequential(
    nn.Dropout(0.3),
    nn.Linear(nf, 512),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(512, NUM_CLASSES),
)

checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
model.load_state_dict(checkpoint["model_state_dict"])

model.to(DEVICE)
model.eval()

# ------------------ TRANSFORM ------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# ------------------ API ------------------
@app.get("/")
def home():
    return {"message": "OcuSight running 🚀"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.sigmoid(outputs)[0].cpu().numpy()

    results = []

    for i in range(len(probs)):
        if probs[i] > BEST_THRESHOLD:
            code = disease_cols[i]

            info = disease_map.get(code, {
                "full_name": code,
                "description": "No description available"
            })

            results.append({
                "code": code,
                "name": info["full_name"],
                "description": info["description"],
                "confidence": round(float(probs[i]) * 100, 2)
            })

    results.sort(key=lambda x: x["confidence"], reverse=True)

    # ------------------ DECISION LOGIC ------------------
    if len(results) == 0:
        return {"status": "Healthy Eye 👁️"}

    top_conf = results[0]["confidence"]

    if top_conf < 20:
        return {
            "status": "Healthy Eye 👁️",
            "confidence": top_conf
        }

    elif top_conf < 30:
        return {
            "status": "Low Detection ⚠️",
            "confidence": top_conf,
            "message": "Weak signals detected, consider retesting"
        }

    return {
        "predictions": results[:5]
    }