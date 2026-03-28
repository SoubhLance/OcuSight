# copy_dataset_correct.py
import os
import shutil
import pandas as pd
from pathlib import Path

def copy_dataset_correct():
    print("="*60)
    print("📁 RFMiD Dataset Reorganization")
    print("="*60)
    
    # Source paths with correct names
    base_source = "A. RFMiD_All_Classes_Dataset"
    images_source = os.path.join(base_source, "1. Original Images")
    labels_source = os.path.join(base_source, "2. Groundtruths")
    
    # Destination paths
    dest_base = "data/rfmid"
    
    # Create directories
    print("\n📂 Creating directories...")
    os.makedirs(os.path.join(dest_base, "images", "train"), exist_ok=True)
    os.makedirs(os.path.join(dest_base, "images", "val"), exist_ok=True)
    os.makedirs(os.path.join(dest_base, "images", "test"), exist_ok=True)
    os.makedirs(os.path.join(dest_base, "labels"), exist_ok=True)
    print("✅ Directories created")
    
    # Copy training images (a. Training Set)
    print("\n📸 Copying Training images...")
    train_src = os.path.join(images_source, "a. Training Set")
    train_dest = os.path.join(dest_base, "images", "train")
    train_count = 0
    
    if os.path.exists(train_src):
        for file in os.listdir(train_src):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')):
                shutil.copy2(os.path.join(train_src, file), train_dest)
                train_count += 1
        print(f"✅ Copied {train_count} training images")
    else:
        print(f"❌ Training folder not found: {train_src}")
    
    # Copy validation images (b. Validation Set)
    print("\n📸 Copying Validation images...")
    val_src = os.path.join(images_source, "b. Validation Set")
    val_dest = os.path.join(dest_base, "images", "val")
    val_count = 0
    
    if os.path.exists(val_src):
        for file in os.listdir(val_src):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')):
                shutil.copy2(os.path.join(val_src, file), val_dest)
                val_count += 1
        print(f"✅ Copied {val_count} validation images")
    else:
        print(f"❌ Validation folder not found: {val_src}")
    
    # Copy testing images (c. Testing Set)
    print("\n📸 Copying Testing images...")
    test_src = os.path.join(images_source, "c. Testing Set")
    test_dest = os.path.join(dest_base, "images", "test")
    test_count = 0
    
    if os.path.exists(test_src):
        for file in os.listdir(test_src):
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')):
                shutil.copy2(os.path.join(test_src, file), test_dest)
                test_count += 1
        print(f"✅ Copied {test_count} testing images")
    else:
        print(f"❌ Testing folder not found: {test_src}")
    
    # Copy labels
    print("\n📊 Copying labels...")
    
    # Training labels
    train_labels_src = os.path.join(labels_source, "a. RFMiD_Training_Labels.csv")
    if os.path.exists(train_labels_src):
        train_labels_dest = os.path.join(dest_base, "labels", "train_labels.csv")
        shutil.copy2(train_labels_src, train_labels_dest)
        
        # Read and display info
        df = pd.read_csv(train_labels_src)
        print(f"✅ Training labels: {len(df)} samples, {len(df.columns)-1} disease classes")
    else:
        print(f"❌ Training labels not found: {train_labels_src}")
    
    # Validation labels
    val_labels_src = os.path.join(labels_source, "b. RFMiD_Validation_Labels.csv")
    if os.path.exists(val_labels_src):
        val_labels_dest = os.path.join(dest_base, "labels", "val_labels.csv")
        shutil.copy2(val_labels_src, val_labels_dest)
        
        df = pd.read_csv(val_labels_src)
        print(f"✅ Validation labels: {len(df)} samples, {len(df.columns)-1} disease classes")
    else:
        print(f"❌ Validation labels not found: {val_labels_src}")
    
    # Testing labels
    test_labels_src = os.path.join(labels_source, "c. RFMiD_Testing_Labels.csv")
    if os.path.exists(test_labels_src):
        test_labels_dest = os.path.join(dest_base, "labels", "test_labels.csv")
        shutil.copy2(test_labels_src, test_labels_dest)
        
        df = pd.read_csv(test_labels_src)
        print(f"✅ Testing labels: {len(df)} samples, {len(df.columns)-1} disease classes")
    else:
        print(f"❌ Testing labels not found: {test_labels_src}")
    
    # Final verification
    print("\n" + "="*60)
    print("📊 DATASET VERIFICATION")
    print("="*60)
    
    print(f"\n✅ Training images: {train_count}")
    print(f"✅ Validation images: {val_count}")
    print(f"✅ Testing images: {test_count}")
    print(f"✅ Total images: {train_count + val_count + test_count}")
    
    # Show sample of images
    if train_count > 0:
        print("\n📁 Sample training images (first 5):")
        train_files = os.listdir(train_dest)[:5]
        for file in train_files:
            print(f"   - {file}")
    
    print("\n📄 Labels files:")
    labels_dir = os.path.join(dest_base, "labels")
    for file in os.listdir(labels_dir):
        print(f"   - {file}")
    
    # Check class distribution
    print("\n📈 Class Distribution (Training Set):")
    train_labels_path = os.path.join(dest_base, "labels", "train_labels.csv")
    if os.path.exists(train_labels_path):
        df = pd.read_csv(train_labels_path)
        disease_cols = [col for col in df.columns if col != 'ID']
        
        # Show top 10 diseases by prevalence
        class_counts = df[disease_cols].sum().sort_values(ascending=False)
        for disease, count in class_counts.head(10).items():
            percentage = (count / len(df)) * 100
            print(f"   {disease}: {int(count)} ({percentage:.1f}%)")
        
        # Show rare diseases
        rare = class_counts[class_counts < 10]
        if len(rare) > 0:
            print(f"\n   ⚠️  Rare diseases (<10 samples): {len(rare)} classes")
            for disease, count in rare.head(5).items():
                print(f"      - {disease}: {int(count)}")
    
    print("\n" + "="*60)
    print("✅ Dataset reorganization complete!")
    print(f"📁 Data ready at: {dest_base}")
    print("="*60)
    
    return train_count, val_count, test_count

if __name__ == "__main__":
    train, val, test = copy_dataset_correct()
    
    if train > 0 and val > 0 and test > 0:
        print("\n🎉 SUCCESS! Dataset is ready for training!")
        print("\nNext steps:")
        print("1. Run: python train_resnet50.py")
        print("2. Monitor GPU usage")
    else:
        print("\n⚠️  Some images were not copied. Please check the paths.")