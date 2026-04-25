import torch
import torch.nn as nn
import torchvision.models as models
import os

def get_resnet50_model(num_classes: int, model_path: str, device: torch.device) -> nn.Module:
    """
    Loads a ResNet50 model and updates its fully connected layer to match the specified number of classes.
    """
    model = models.resnet50(weights=None)
    
    nf = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(nf, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes)
    )
    
    # Load weights
    if os.path.exists(model_path):
        try:
            ckpt = torch.load(model_path, map_location=device)
            model.load_state_dict(ckpt["model_state_dict"])
            print("Model loaded successfully")
        except Exception as e:
            print(f"Warning: Failed to load model weights from {model_path}: {e}")
    else:
        print(f"Warning: Model file not found at {model_path}. Using uninitialized weights.")
        
    model.to(device)
    model.eval()
    
    return model
