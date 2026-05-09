import pymysql
import os
import sys
import yaml
import shutil
import time
import subprocess

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

MASTER_DATA_YAML_PATH = '../AI_Model_Training/Master_Dataset/data.yaml'
UPLOADS_DIR = '../Backend_API/uploads/menu'

def load_trained_classes():
    if not os.path.exists(MASTER_DATA_YAML_PATH):
        return []
    with open(MASTER_DATA_YAML_PATH, 'r') as f:
        data = yaml.safe_load(f)
    return data.get('names', [])

def get_menu_items():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name, image_path FROM menu")
            return cursor.fetchall()
    except Exception as e:
        print(f"Database error: {e}")
        return []
    finally:
        connection.close()

def main():
    print("Starting Continuous Learning Pipeline check...")
    trained_classes = load_trained_classes()
    menu_items = get_menu_items()
    
    new_items_found = []
    for item in menu_items:
        if item['name'] not in trained_classes:
            new_items_found.append(item)
            
    if not new_items_found:
        print("No new menu items found. AI model is up-to-date.")
        return
        
    python_exe = sys.executable
        
    for new_item in new_items_found:
        print(f"New item detected: {new_item['name']}")
        image_path = os.path.join('../Backend_API', new_item['image_path'])
        if not os.path.exists(image_path):
            print(f"Image not found for {new_item['name']} at {image_path}. Skipping.")
            continue
            
        print(f"Triggering auto-annotation for {new_item['name']}...")
        subprocess.run([python_exe, "auto_annotator.py", new_item["name"], image_path])
        
    print("Triggering retraining process...")
    subprocess.run([python_exe, "retrain_model.py"])
    print("Pipeline completed successfully.")

if __name__ == "__main__":
    main()
