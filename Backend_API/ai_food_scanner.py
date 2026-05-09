from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import pymysql
import os
import numpy as np
from PIL import Image
from ultralytics import YOLO

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../AI_Model_Training/Part6_Deployment_Inference/best.pt')

def load_model():
    # Load YOLOv8 model
    model = YOLO(MODEL_PATH)
    return model

model = load_model()

# Map YOLO results to detected items
# You may need to adjust this depending on your model's output

def predict_food_items(img_arr):
    # Convert numpy array to PIL Image if needed
    from PIL import Image
    if not isinstance(img_arr, Image.Image):
        img = Image.fromarray(img_arr)
    else:
        img = img_arr
    # YOLOv8 inference with extremely low confidence threshold for testing
    results = model(img, conf=0.01)
    detected_items = []
    
    print("----- YOLO RAW DETECTIONS -----")
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            name = result.names[cls]
            print(f"Detected: {name} (Confidence: {conf:.4f})")
            
            # We will return items with at least 2% confidence to the frontend to prove it works
            if conf >= 0.02:
                detected_items.append({
                    "name": name,
                    "confidence": conf
                })
    print("-------------------------------")
    return detected_items

router = APIRouter()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

@router.post("/scan-food")
async def scan_food(image: UploadFile = File(...)):
    # Read image
    try:
        img = Image.open(image.file)
        img_arr = np.array(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    # AI Inference
    detected_items = predict_food_items(img)

    # Lookup menu catalog for prices
    connection = pymysql.connect(**DB_CONFIG)
    results = []
    try:
        with connection.cursor() as cursor:
            for item in detected_items:
                cursor.execute("SELECT menuID, name, price FROM menu WHERE name = %s", (item['name'],))
                menu_item = cursor.fetchone()
                if menu_item:
                    results.append({
                        "menuID": menu_item["menuID"],
                        "name": menu_item["name"],
                        "price": float(menu_item["price"]),
                        "confidence": item.get("confidence", 1.0)
                    })
    finally:
        connection.close()

    return {"detected_items": results}
