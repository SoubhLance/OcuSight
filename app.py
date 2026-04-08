import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image
import argparse
import pandas as pd
import json

# 🔹 Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 🔹 Build EXACT SAME model as training
def build_model(num_classes):
    model = models.resnet50(weights=None)
    nf = model.fc.in_features

    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(nf, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes),
    )

    return model


# 🔹 Load labels from CSV (order matters)
df = pd.read_csv("data/rfmid/labels/train_labels.csv")
disease_cols = list(df.columns[1:])  # skip image column

NUM_CLASSES = len(disease_cols)
print(f"✅ Loaded {NUM_CLASSES} disease labels")

# 🔹 Load disease metadata JSON
with open("disease_map.json", "r") as f:
    disease_map = json.load(f)

print(f"✅ Loaded disease metadata")

# 🔹 Build model
model = build_model(NUM_CLASSES).to(device)

# 🔹 Load checkpoint
ckpt = torch.load("checkpoints/best_resnet50.pth", map_location=device)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()

print(f"✅ Loaded model from epoch {ckpt['epoch'] + 1} | Val F1: {ckpt['val_f1']:.4f}")

# 🔹 Transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# 🔥 Tuned threshold
BEST_THRESHOLD = 0.10


# 🔹 Prediction function
def predict(image_path):
    image = Image.open(image_path).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(device)

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

    return results


# 🔹 CLI
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True, help="Path to image")
    args = parser.parse_args()

    preds = predict(args.image)

    print("\n🔍 Predictions:")

if len(preds) == 0:
    print("✅ Healthy Eye (No disease detected)")
else:
    top_pred = preds[0]  # highest confidence
    conf = top_pred["confidence"] * 100  # convert to %

    if conf < 20:
        print("✅ Healthy Eye")
        print(f"   Confidence : {conf:.2f}% (very low risk)")
    
    elif conf < 30:
        print("⚠️ Low Detection (Weak signals found)")
        print(f"   Confidence : {conf:.2f}%")
        print("   Suggestion : Monitor regularly or retest with better image")
    
    else:
        # Show normal disease predictions
        for r in preds[:5]:
            print(f"\n🦠 {r['name']} ({r['code']})")
            print(f"   Confidence : {r['confidence']*100:.2f}%")
            print(f"   Info       : {r['description']}")