import os
import shutil
from ultralytics import YOLO

MASTER_DATA_YAML_PATH = '../AI_Model_Training/Master_Dataset/data.yaml'
CURRENT_MODEL_PATH = '../AI_Model_Training/Part6_Deployment_Inference/best.pt'
OUTPUT_DIR = 'runs/detect/continuous_learning'

def main():
    print("Loading current best model...")
    if not os.path.exists(CURRENT_MODEL_PATH):
        print("Model not found!")
        return
        
    model = YOLO(CURRENT_MODEL_PATH)
    
    print("Starting fine-tuning process...")
    # We are now training on the FULL master dataset to prevent catastrophic forgetting!
    results = model.train(
        data=os.path.abspath(MASTER_DATA_YAML_PATH),
        epochs=5,
        imgsz=640,
        batch=8,
        name='continuous_learning',
        exist_ok=True,
        workers=0 # To avoid multiprocessing issues on windows during automated runs
    )
    
    new_model_path = os.path.join(OUTPUT_DIR, 'weights', 'best.pt')
    if os.path.exists(new_model_path):
        print("Training complete. Deploying new model...")
        shutil.copy(new_model_path, CURRENT_MODEL_PATH)
        print("New model deployed to inference folder successfully!")
    else:
        print("Training failed. New model not found.")

if __name__ == "__main__":
    main()
