from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import pymysql
import os
import shutil
import glob
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

UPLOAD_DIR = "uploads/menu"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def remove_menu_image_files(menu_id: str, image_path: Optional[str] = None):
    if image_path and os.path.exists(image_path):
        os.remove(image_path)

    pattern = os.path.join(UPLOAD_DIR, f"{menu_id}.*")
    for matched_path in glob.glob(pattern):
        if os.path.exists(matched_path):
            os.remove(matched_path)

def get_next_menu_id():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT menuID FROM menu ORDER BY id DESC LIMIT 1")
            last = cursor.fetchone()
            if not last: return "M001"
            last_num = int(last['menuID'][1:])
            return f"M{str(last_num + 1).zfill(3)}"
    finally:
        connection.close()

@router.get("/menu")
async def get_menu():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM menu")
            return cursor.fetchall()
    finally:
        connection.close()

@router.post("/menu/add")
async def add_menu_item(
    name: str = Form(...),
    price: float = Form(...),
    description: str = Form(...) ,
    image: UploadFile = File(...)
):
    menu_id = get_next_menu_id()
    file_extension = os.path.splitext(image.filename)[1]
    file_name = f"{menu_id}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Save only the relative path for image_path, with correct extension
    relative_image_path = f"uploads/menu/{file_name}"

    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            sql = "INSERT INTO menu (menuID, name, price, description, image_path) VALUES (%s, %s, %s, %s, %s)"
            cursor.execute(sql, (menu_id, name, price, description, relative_image_path))
            connection.commit()
            return {"message": "Item added successfully"}
    finally:
        connection.close()

@router.put("/menu/update/{menuID}")
async def update_menu_item(
    menuID: str,
    name: str = Form(...),
    price: float = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name, image_path FROM menu WHERE menuID = %s", (menuID,))
            existing_menu = cursor.fetchone()
            if not existing_menu:
                raise HTTPException(status_code=404, detail="Menu item not found")

            old_name = existing_menu["name"]
            if image:
                remove_menu_image_files(menuID, existing_menu.get("image_path"))
                file_extension = os.path.splitext(image.filename)[1]
                file_name = f"{menuID}{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, file_name)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(image.file, buffer)
                # Save only the relative path for image_path, with correct extension
                relative_image_path = f"uploads/menu/{file_name}"
                sql = "UPDATE menu SET name=%s, price=%s, description=%s, image_path=%s WHERE menuID=%s"
                cursor.execute(sql, (name, price, description, relative_image_path, menuID))
            else:
                sql = "UPDATE menu SET name=%s, price=%s, description=%s WHERE menuID=%s"
                cursor.execute(sql, (name, price, description, menuID))

            # Keep stock records aligned if the menu item name changes.
            if old_name != name:
                cursor.execute("UPDATE inventory SET itemName=%s WHERE itemName=%s", (name, old_name))

            connection.commit()
            return {"message": "Updated"}
    finally:
        connection.close()

from ai_dataset_manager import remove_class_from_ai_dataset

@router.delete("/menu/delete/{menuID}")
async def delete_menu_item(menuID: str):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name, image_path FROM menu WHERE menuID = %s", (menuID,))
            menu_item = cursor.fetchone()
            if not menu_item:
                raise HTTPException(status_code=404, detail="Menu item not found")

            # Remove related stock rows for the deleted menu item.
            cursor.execute("DELETE FROM inventory WHERE itemName = %s", (menu_item["name"],))
            deleted_stock_count = cursor.rowcount

            cursor.execute("DELETE FROM menu WHERE menuID = %s", (menuID,))
            connection.commit()
            remove_menu_image_files(menuID, menu_item.get("image_path"))
            
            # Clean up AI training dataset to prevent YOLO class shift corruption
            try:
                remove_class_from_ai_dataset(menu_item["name"])
            except Exception as e:
                print(f"Failed to clean AI dataset for {menu_item['name']}: {e}")
                
            return {"message": "Deleted", "deleted_stock_count": deleted_stock_count}
    finally:
        connection.close()