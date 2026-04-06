# ResNet50_Optimized_Training.ipynb

"""
================================================================================
RESNET-50 OPTIMIZED TRAINING FOR RETINAL DISEASE DETECTION
================================================================================
Hardware: HP Omen 16 (RTX 4060 8GB, i7-13700HX)
Dataset: RFMiD (3200 images, 46 diseases)
Optimizations: Mixed Precision (BF16), TF32, Optimized Data Loading
================================================================================
"""

# %% [markdown]
# # 1. IMPORTS (Minimal & Optimized)

# %%
import os
import gc
import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image
from tqdm import tqdm
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# PyTorch Core
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.models as models
import torchvision.transforms as transforms

# Metrics
from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

# %% [markdown]
# # 2. HARDWARE OPTIMIZATION (RTX 4060 Specific)

# %%
class HardwareOptimizer:
    """Optimize for HP Omen 16 RTX 4060"""
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        if self.device.type == 'cuda':
            self.gpu_name = torch.cuda.get_device_name(0)
            self.vram_total = torch.cuda.get_device_properties(0).total_memory / 1e9
            self.cuda_version = torch.version.cuda
            
            # RTX 4060 specific optimizations
            torch.backends.cudnn.benchmark = True
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            # Enable BF16 for RTX 4060 (better than FP16)
            self.use_bf16 = torch.cuda.is_bf16_supported()
            
        else:
            self.use_bf16 = False
    
    def print_specs(self):
        """Print hardware configuration"""
        print("="*60)
        print("🖥️  HP Omen 16 Hardware Configuration")
        print("="*60)
        print(f"CPU: Intel i7-13700HX (16 cores)")
        print(f"GPU: {self.gpu_name if self.device.type == 'cuda' else 'CPU'}")
        if self.device.type == 'cuda':
            print(f"VRAM: {self.vram_total:.1f} GB")
            print(f"CUDA: {self.cuda_version}")
            print(f"BF16 Support: {self.use_bf16}")
            print(f"TF32 Enabled: True")
        print("="*60)

# Initialize hardware optimizer
hw = HardwareOptimizer()
hw.print_specs()

# Set device
device = hw.device
use_bf16 = hw.use_bf16

# Set random seed for reproducibility
def set_seed(seed=42):
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

set_seed(42)

# %% [markdown]
# # 3. OPTIMIZED DATASET CLASS

# %%
class OptimizedRFMiDDataset(Dataset):
    """Memory-efficient dataset with PIL and caching"""
    
    def __init__(self, img_dir, labels_df, transform=None):
        self.img_dir = img_dir
        self.labels_df = labels_df.reset_index(drop=True)
        self.transform = transform
        
        # Get disease columns (all except ID)
        self.disease_cols = [c for c in labels_df.columns if c != 'ID']
        self.num_classes = len(self.disease_cols)
        
        # Pre-cache image paths for faster access
        self.img_paths = []
        self.valid_indices = []
        
        for idx, img_name in enumerate(self.labels_df['ID'].values):
            img_path = os.path.join(img_dir, img_name)
            
            # Try different extensions
            found = False
            for ext in ['', '.png', '.jpg', '.jpeg']:
                test_path = img_path + ext
                if os.path.exists(test_path):
                    self.img_paths.append(test_path)
                    self.valid_indices.append(idx)
                    found = True
                    break
            
            if not found:
                print(f"⚠️  Warning: Image not found: {img_name}")
                self.img_paths.append(None)
                self.valid_indices.append(idx)
        
        print(f"Loaded {len(self.valid_indices)} images from {img_dir}")
    
    def __len__(self):
        return len(self.img_paths)
    
    def __getitem__(self, idx):
        # Load image
        img_path = self.img_paths[idx]
        if img_path and os.path.exists(img_path):
            try:
                image = Image.open(img_path).convert('RGB')
            except:
                image = Image.new('RGB', (224, 224), color='black')
        else:
            image = Image.new('RGB', (224, 224), color='black')
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        
        # Get labels
        original_idx = self.valid_indices[idx]
        labels = self.labels_df.iloc[original_idx][self.disease_cols].values.astype(np.float32)
        labels = torch.tensor(labels, dtype=torch.float32)
        
        return image, labels
    
    def get_class_weights(self):
        """Calculate class weights for imbalance handling"""
        class_counts = self.labels_df[self.disease_cols].sum().values
        total_samples = len(self.labels_df)
        weights = total_samples / (self.num_classes * (class_counts + 1e-6))
        return torch.tensor(weights, dtype=torch.float32)

# %% [markdown]
# # 4. OPTIMIZED TRANSFORMS

# %%
class OptimizedTransforms:
    """Memory-efficient transforms"""
    
    @staticmethod
    def get_train_transform(input_size=224):
        """Training transforms with augmentation"""
        return transforms.Compose([
            transforms.Resize((input_size, input_size)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.3),
            transforms.RandomRotation(degrees=30),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])
    
    @staticmethod
    def get_val_transform(input_size=224):
        """Validation transforms (no augmentation)"""
        return transforms.Compose([
            transforms.Resize((input_size, input_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                               std=[0.229, 0.224, 0.225])
        ])

# %% [markdown]
# # 5. LOAD DATASET

# %%
# Paths
DATA_DIR = "data/rfmid"
TRAIN_IMAGES = os.path.join(DATA_DIR, "images", "train")
VAL_IMAGES = os.path.join(DATA_DIR, "images", "val")
TEST_IMAGES = os.path.join(DATA_DIR, "images", "test")

TRAIN_LABELS = os.path.join(DATA_DIR, "labels", "train_labels.csv")
VAL_LABELS = os.path.join(DATA_DIR, "labels", "val_labels.csv")
TEST_LABELS = os.path.join(DATA_DIR, "labels", "test_labels.csv")

# Load dataframes
print("📊 Loading datasets...")
train_df = pd.read_csv(TRAIN_LABELS)
val_df = pd.read_csv(VAL_LABELS)
test_df = pd.read_csv(TEST_LABELS)

print(f"Training: {len(train_df)} samples")
print(f"Validation: {len(val_df)} samples")
print(f"Testing: {len(test_df)} samples")

# Get disease columns
disease_cols = [c for c in train_df.columns if c != 'ID']
num_classes = len(disease_cols)
print(f"Disease classes: {num_classes}")

# Create datasets
train_dataset = OptimizedRFMiDDataset(
    img_dir=TRAIN_IMAGES,
    labels_df=train_df,
    transform=OptimizedTransforms.get_train_transform(224)
)

val_dataset = OptimizedRFMiDDataset(
    img_dir=VAL_IMAGES,
    labels_df=val_df,
    transform=OptimizedTransforms.get_val_transform(224)
)

test_dataset = OptimizedRFMiDDataset(
    img_dir=TEST_IMAGES,
    labels_df=test_df,
    transform=OptimizedTransforms.get_val_transform(224)
)

# %% [markdown]
# # 6. OPTIMIZED DATALOADERS

# %%
# Optimized parameters for RTX 4060
BATCH_SIZE = 32  # Fits perfectly in 8GB VRAM
NUM_WORKERS = 4  # Optimal for i7-13700HX
PIN_MEMORY = True
PREFETCH_FACTOR = 2

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=NUM_WORKERS,
    pin_memory=PIN_MEMORY,
    prefetch_factor=PREFETCH_FACTOR,
    persistent_workers=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=PIN_MEMORY,
    prefetch_factor=PREFETCH_FACTOR,
    persistent_workers=True
)

test_loader = DataLoader(
    test_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=NUM_WORKERS,
    pin_memory=PIN_MEMORY,
    prefetch_factor=PREFETCH_FACTOR,
    persistent_workers=True
)

print(f"✅ Dataloaders created")
print(f"   Batch size: {BATCH_SIZE}")
print(f"   Workers: {NUM_WORKERS}")
print(f"   Train batches: {len(train_loader)}")
print(f"   Val batches: {len(val_loader)}")
print(f"   Test batches: {len(test_loader)}")

# %% [markdown]
# # 7. BUILD RESNET-50 MODEL

# %%
def build_resnet50(num_classes):
    """Build optimized ResNet-50 model"""
    
    # Load pretrained model
    model = models.resnet50(weights='IMAGENET1K_V1')
    
    # Freeze early layers for faster training (optional)
    # for param in model.parameters():
    #     param.requires_grad = False
    
    # Replace classifier
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_features, 512),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes)
    )
    
    return model

# Build model
print("🏗️  Building ResNet-50...")
model = build_resnet50(num_classes)
model = model.to(device)

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

print(f"Total parameters: {total_params:,}")
print(f"Trainable parameters: {trainable_params:,}")
print(f"Model size: {total_params * 4 / 1024 / 1024:.2f} MB")

# %% [markdown]
# # 8. TRAINING COMPONENTS

# %%
# Class weights for imbalance handling
class_weights = train_dataset.get_class_weights().to(device)

# Loss function
criterion = nn.BCEWithLogitsLoss(pos_weight=class_weights)

# Optimizer (AdamW with weight decay)
optimizer = optim.AdamW(
    model.parameters(),
    lr=0.001,
    weight_decay=0.01,
    betas=(0.9, 0.999)
)

# Learning rate scheduler
NUM_EPOCHS = 50
scheduler = optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=NUM_EPOCHS,
    eta_min=1e-6
)

# Mixed precision scaler (use BF16 if available)
if use_bf16:
    from torch.cuda.amp import autocast
    scaler = None  # BF16 doesn't need scaling
    print("✅ Using BF16 mixed precision")
else:
    from torch.cuda.amp import autocast, GradScaler
    scaler = GradScaler()
    print("✅ Using FP16 mixed precision")

print(f"Learning rate: 0.001")
print(f"Weight decay: 0.01")
print(f"Epochs: {NUM_EPOCHS}")

# %% [markdown]
# # 9. TRAINING FUNCTIONS

# %%
def train_epoch(model, loader, criterion, optimizer, scaler, device, use_bf16):
    """Train for one epoch with mixed precision"""
    model.train()
    total_loss = 0
    num_batches = 0
    
    pbar = tqdm(loader, desc="Training", leave=False)
    
    for images, labels in pbar:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        
        optimizer.zero_grad(set_to_none=True)
        
        # Mixed precision forward
        with autocast(enabled=(scaler is not None or use_bf16), dtype=torch.bfloat16 if use_bf16 else torch.float16):
            outputs = model(images)
            loss = criterion(outputs, labels)
        
        # Backward pass
        if scaler:
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
        
        total_loss += loss.item()
        num_batches += 1
        
        # Update progress bar
        pbar.set_postfix({'loss': f'{loss.item():.4f}'})
    
    return total_loss / num_batches

def validate_epoch(model, loader, criterion, device, use_bf16):
    """Validate for one epoch"""
    model.eval()
    total_loss = 0
    num_batches = 0
    
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        pbar = tqdm(loader, desc="Validation", leave=False)
        
        for images, labels in pbar:
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)
            
            with autocast(enabled=(use_bf16), dtype=torch.bfloat16 if use_bf16 else torch.float16):
                outputs = model(images)
                loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            num_batches += 1
            
            # Get predictions
            probs = torch.sigmoid(outputs)
            preds = (probs > 0.5).float()
            
            all_preds.append(preds.cpu())
            all_labels.append(labels.cpu())
    
    # Concatenate
    all_preds = torch.cat(all_preds).numpy()
    all_labels = torch.cat(all_labels).numpy()
    
    # Calculate metrics
    accuracy = np.mean(np.all(all_preds == all_labels, axis=1))
    f1_macro = f1_score(all_labels, all_preds, average='macro', zero_division=0)
    f1_micro = f1_score(all_labels, all_preds, average='micro', zero_division=0)
    
    return {
        'loss': total_loss / num_batches,
        'accuracy': accuracy,
        'f1_macro': f1_macro,
        'f1_micro': f1_micro,
        'predictions': all_preds,
        'labels': all_labels
    }

# %% [markdown]
# # 10. TRAINING LOOP

# %%
# Create directories
os.makedirs('checkpoints', exist_ok=True)
os.makedirs('outputs', exist_ok=True)

# Training history
history = {
    'train_loss': [],
    'val_loss': [],
    'val_acc': [],
    'val_f1_macro': [],
    'val_f1_micro': []
}

best_f1 = 0.0
early_stop_counter = 0
early_stop_patience = 10

print("="*60)
print("🚀 STARTING RESNET-50 TRAINING")
print("="*60)
start_time = time.time()

for epoch in range(NUM_EPOCHS):
    epoch_start = time.time()
    
    print(f"\n📊 Epoch {epoch+1}/{NUM_EPOCHS}")
    print("-" * 40)
    
    # Train
    train_loss = train_epoch(model, train_loader, criterion, optimizer, scaler, device, use_bf16)
    history['train_loss'].append(train_loss)
    
    # Validate
    val_metrics = validate_epoch(model, val_loader, criterion, device, use_bf16)
    history['val_loss'].append(val_metrics['loss'])
    history['val_acc'].append(val_metrics['accuracy'])
    history['val_f1_macro'].append(val_metrics['f1_macro'])
    history['val_f1_micro'].append(val_metrics['f1_micro'])
    
    # Update scheduler
    scheduler.step()
    
    # Print metrics
    epoch_time = time.time() - epoch_start
    print(f"Train Loss: {train_loss:.4f}")
    print(f"Val Loss: {val_metrics['loss']:.4f}")
    print(f"Val Accuracy: {val_metrics['accuracy']:.4f}")
    print(f"Val F1 (macro): {val_metrics['f1_macro']:.4f}")
    print(f"Val F1 (micro): {val_metrics['f1_micro']:.4f}")
    print(f"LR: {optimizer.param_groups[0]['lr']:.6f}")
    print(f"Time: {epoch_time:.1f}s")
    
    # Save best model
    if val_metrics['f1_macro'] > best_f1:
        best_f1 = val_metrics['f1_macro']
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'val_f1': best_f1,
            'val_accuracy': val_metrics['accuracy']
        }, 'checkpoints/best_resnet50.pth')
        print(f"✅ New best model! F1: {best_f1:.4f}")
        early_stop_counter = 0
    else:
        early_stop_counter += 1
    
    # Early stopping
    if early_stop_counter >= early_stop_patience:
        print(f"\n⚠️  Early stopping triggered at epoch {epoch+1}")
        break
    
    # Clear GPU cache
    torch.cuda.empty_cache()
    gc.collect()

total_time = time.time() - start_time
print(f"\n✅ Training Complete!")
print(f"Total time: {total_time/60:.2f} minutes")
print(f"Best F1 Score: {best_f1:.4f}")

# %% [markdown]
# # 11. PLOT TRAINING CURVES

# %%
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Loss curve
axes[0, 0].plot(history['train_loss'], label='Train Loss', linewidth=2)
axes[0, 0].plot(history['val_loss'], label='Val Loss', linewidth=2)
axes[0, 0].set_xlabel('Epoch')
axes[0, 0].set_ylabel('Loss')
axes[0, 0].set_title('Training & Validation Loss')
axes[0, 0].legend()
axes[0, 0].grid(True, alpha=0.3)

# Accuracy curve
axes[0, 1].plot(history['val_acc'], label='Validation Accuracy', linewidth=2, color='green')
axes[0, 1].set_xlabel('Epoch')
axes[0, 1].set_ylabel('Accuracy')
axes[0, 1].set_title('Validation Accuracy')
axes[0, 1].legend()
axes[0, 1].grid(True, alpha=0.3)

# F1 Macro curve
axes[1, 0].plot(history['val_f1_macro'], label='F1 (macro)', linewidth=2, color='orange')
axes[1, 0].set_xlabel('Epoch')
axes[1, 0].set_ylabel('F1 Score')
axes[1, 0].set_title('Validation F1 Score (Macro)')
axes[1, 0].legend()
axes[1, 0].grid(True, alpha=0.3)

# F1 Micro curve
axes[1, 1].plot(history['val_f1_micro'], label='F1 (micro)', linewidth=2, color='red')
axes[1, 1].set_xlabel('Epoch')
axes[1, 1].set_ylabel('F1 Score')
axes[1, 1].set_title('Validation F1 Score (Micro)')
axes[1, 1].legend()
axes[1, 1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('outputs/training_curves.png', dpi=150, bbox_inches='tight')
plt.show()

# %% [markdown]
# # 12. EVALUATE ON TEST SET

# %%
# Load best model
checkpoint = torch.load('checkpoints/best_resnet50.pth')
model.load_state_dict(checkpoint['model_state_dict'])
print(f"Loaded best model from epoch {checkpoint['epoch']+1}")
print(f"Best validation F1: {checkpoint['val_f1']:.4f}")

# Evaluate
print("\n📊 Evaluating on Test Set...")
test_metrics = validate_epoch(model, test_loader, criterion, device, use_bf16)

print("\n" + "="*60)
print("🎯 TEST SET RESULTS")
print("="*60)
print(f"Test Loss: {test_metrics['loss']:.4f}")
print(f"Test Accuracy: {test_metrics['accuracy']:.4f}")
print(f"Test F1 (macro): {test_metrics['f1_macro']:.4f}")
print(f"Test F1 (micro): {test_metrics['f1_micro']:.4f}")

# %% [markdown]
# # 13. PER-CLASS PERFORMANCE

# %%
# Calculate per-class metrics
predictions = test_metrics['predictions']
labels = test_metrics['labels']

precision, recall, f1, support = precision_recall_fscore_support(
    labels, predictions, average=None, zero_division=0
)

# Create results dataframe
per_class_df = pd.DataFrame({
    'Disease': disease_cols,
    'Precision': precision,
    'Recall': recall,
    'F1-Score': f1,
    'Samples': support
})

per_class_df = per_class_df.sort_values('F1-Score', ascending=False)

# Save to CSV
per_class_df.to_csv('outputs/per_class_results.csv', index=False)

print("\n📈 Top 10 Performing Classes:")
print(per_class_df.head(10).to_string(index=False))

print("\n📉 Bottom 10 Performing Classes:")
print(per_class_df.tail(10).to_string(index=False))

# %% [markdown]
# # 14. VISUALIZE PER-CLASS PERFORMANCE

# %%
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Top 10 classes
top10 = per_class_df.head(10)
axes[0].barh(top10['Disease'], top10['F1-Score'], color='green', alpha=0.7)
axes[0].set_xlabel('F1 Score')
axes[0].set_title('Top 10 Performing Diseases')
axes[0].set_xlim(0, 1)
axes[0].grid(True, alpha=0.3)

# Bottom 10 classes
bottom10 = per_class_df.tail(10)
axes[1].barh(bottom10['Disease'], bottom10['F1-Score'], color='red', alpha=0.7)
axes[1].set_xlabel('F1 Score')
axes[1].set_title('Bottom 10 Performing Diseases (Rare Diseases)')
axes[1].set_xlim(0, 1)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('outputs/per_class_performance.png', dpi=150, bbox_inches='tight')
plt.show()

# %% [markdown]
# # 15. SAVE RESULTS

# %%
# Save training history
results = {
    'best_val_f1': best_f1,
    'test_accuracy': float(test_metrics['accuracy']),
    'test_f1_macro': float(test_metrics['f1_macro']),
    'test_f1_micro': float(test_metrics['f1_micro']),
    'history': {
        'train_loss': history['train_loss'],
        'val_loss': history['val_loss'],
        'val_accuracy': history['val_acc'],
        'val_f1_macro': history['val_f1_macro']
    },
    'hardware': {
        'gpu': hw.gpu_name if device.type == 'cuda' else 'CPU',
        'batch_size': BATCH_SIZE,
        'mixed_precision': 'BF16' if use_bf16 else 'FP16' if scaler else 'None'
    }
}

import json
with open('outputs/training_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("✅ Results saved to outputs/")

# %% [markdown]
# # 16. SUMMARY REPORT

# %%
print("\n" + "="*60)
print("📊 RESNET-50 TRAINING SUMMARY")
print("="*60)

print(f"\n📁 Dataset:")
print(f"   Training: {len(train_dataset)} images")
print(f"   Validation: {len(val_dataset)} images")
print(f"   Testing: {len(test_dataset)} images")
print(f"   Classes: {num_classes}")

print(f"\n🏗️  Model:")
print(f"   Architecture: ResNet-50")
print(f"   Parameters: {total_params:,}")
print(f"   Input size: 224x224")

print(f"\n⚙️  Training Config:")
print(f"   Epochs: {len(history['train_loss'])}")
print(f"   Batch size: {BATCH_SIZE}")
print(f"   Learning rate: 0.001")
print(f"   Optimizer: AdamW")
print(f"   Mixed precision: {'BF16' if use_bf16 else 'FP16' if scaler else 'None'}")

print(f"\n🎯 Best Results:")
print(f"   Validation F1 (macro): {best_f1:.4f}")
print(f"   Test F1 (macro): {test_metrics['f1_macro']:.4f}")
print(f"   Test Accuracy: {test_metrics['accuracy']:.4f}")

print(f"\n💻 Hardware:")
if device.type == 'cuda':
    print(f"   GPU: {hw.gpu_name}")
    print(f"   VRAM: {hw.vram_total:.1f} GB")
print(f"   Device: {device}")

print("\n" + "="*60)
print("🎉 Training Pipeline Complete!")
print("="*60)

# %% [markdown]
# # 17. INFERENCE EXAMPLE

# %%
def predict_image(image_path, model, device, use_bf16):
    """Predict disease for a single image"""
    
    # Load and preprocess
    image = Image.open(image_path).convert('RGB')
    transform = OptimizedTransforms.get_val_transform(224)
    input_tensor = transform(image).unsqueeze(0).to(device)
    
    # Predict
    model.eval()
    with torch.no_grad():
        with autocast(enabled=use_bf16, dtype=torch.bfloat16 if use_bf16 else torch.float16):
            output = model(input_tensor)
            probs = torch.sigmoid(output)
    
    # Get predictions
    probs = probs.cpu().numpy()[0]
    predictions = (probs > 0.5).astype(int)
    
    # Get positive diseases
    positive_diseases = [disease_cols[i] for i, pred in enumerate(predictions) if pred == 1]
    disease_probs = {disease_cols[i]: probs[i] for i in range(len(probs)) if probs[i] > 0.3}
    
    return positive_diseases, disease_probs

# Example usage (uncomment to test)
# test_image = "data/rfmid/images/test/1.png"
# diseases, probs = predict_image(test_image, model, device, use_bf16)
# print(f"Predicted diseases: {diseases}")
# print(f"Probabilities: {probs}")

print("\n✅ Inference function ready!")
print("Use predict_image() to test on new images")