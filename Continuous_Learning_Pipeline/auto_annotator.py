import sys
import os
import cv2
import numpy as np
import yaml
import shutil
import random

MASTER_DATA_YAML_PATH = '../AI_Model_Training/Master_Dataset/data.yaml'
DATASET_DIR = '../AI_Model_Training/Master_Dataset'

def ensure_dataset_structure():
    pass # Master dataset structure is already established

def update_data_yaml(class_name):
    if not os.path.exists(MASTER_DATA_YAML_PATH):
        print("Error: Master data.yaml not found.")
        return -1
        
    with open(MASTER_DATA_YAML_PATH, 'r') as f:
        data = yaml.safe_load(f)
        
    names = data.get('names', [])
    if class_name not in names:
        names.append(class_name)
        data['names'] = names
        data['nc'] = len(names)
        
        with open(MASTER_DATA_YAML_PATH, 'w') as f:
            yaml.dump(data, f, sort_keys=False)
            
    return names.index(class_name)

def generate_augmented_images(class_name, image_path, class_id):
    ensure_dataset_structure()
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"Could not read {image_path}")
        return
        
    # Resize base image to standard 640x640
    img = cv2.resize(img, (640, 640))
    
    # We create 50 augmented images (40 train, 10 val)
    total_images = 50
    train_count = 40
    
    # Simple auto-annotation: For an uploaded stock image of food, 
    # we can assume the bounding box sits in the center covering roughly 60-80% of the image.
    
    for i in range(total_images):
        split = 'train' if i < train_count else 'valid'
        
        # Augmentations
        aug_img = img.copy()
        
        # 1. Random rotation
        angle = random.uniform(-30, 30)
        M = cv2.getRotationMatrix2D((320, 320), angle, 1)
        aug_img = cv2.warpAffine(aug_img, M, (640, 640), borderMode=cv2.BORDER_REPLICATE)
        
        # 2. Random brightness
        hsv = cv2.cvtColor(aug_img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        v = cv2.add(v, random.randint(-40, 40))
        final_hsv = cv2.merge((h, s, v))
        aug_img = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)
        
        # 3. Random noise
        noise = np.random.randint(0, 15, (640, 640, 3), dtype='uint8')
        aug_img = cv2.add(aug_img, noise)
        
        # Generate bounding box 
        # YOLO format: class x_center y_center width height
        x_center, y_center = 0.5, 0.5
        width, height = random.uniform(0.6, 0.8), random.uniform(0.6, 0.8)
        
        img_name = f"{class_name.replace(' ', '_')}_{i}.jpg"
        label_name = f"{class_name.replace(' ', '_')}_{i}.txt"
        
        img_save_path = os.path.join(DATASET_DIR, split, 'images', img_name)
        label_save_path = os.path.join(DATASET_DIR, split, 'labels', label_name)
        
        cv2.imwrite(img_save_path, aug_img)
        
        with open(label_save_path, 'w') as f:
            f.write(f"{class_id} {x_center} {y_center} {width} {height}\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python auto_annotator.py <class_name> <image_path>")
        sys.exit(1)
        
    class_name = sys.argv[1]
    image_path = sys.argv[2]
    
    class_id = update_data_yaml(class_name)
    if class_id >= 0:
        generate_augmented_images(class_name, image_path, class_id)
        print(f"Successfully generated dataset for {class_name}")
