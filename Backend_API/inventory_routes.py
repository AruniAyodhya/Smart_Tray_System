from fastapi import APIRouter, HTTPException
import pymysql
import os
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
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

class InventoryItem(BaseModel):
    itemName: str
    current: int
    min_qty: int
    max_qty: int
    unitPrice: float

def calculate_status(current, min_val, max_val):
    if current <= min_val: return "low stock"
    if max_val <= current: return "over stock"
    return "good"

def get_next_inventory_id():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT inventoryID FROM inventory ORDER BY id DESC LIMIT 1")
            last = cursor.fetchone()
            if not last: return "I001"
            last_num = int(last['inventoryID'][1:])
            return f"I{str(last_num + 1).zfill(3)}"
    finally:
        connection.close()

@router.get("/inventory")
async def get_inventory():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM inventory")
            return cursor.fetchall()
    finally:
        connection.close()

@router.post("/inventory/add")
async def add_inventory(item: InventoryItem):
    inv_id = get_next_inventory_id()
    status = calculate_status(item.current, item.min_qty, item.max_qty)
    
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            sql = """INSERT INTO inventory (inventoryID, itemName, current, min_qty, max_qty, unitPrice, status) 
                     VALUES (%s, %s, %s, %s, %s, %s, %s)"""
            cursor.execute(sql, (inv_id, item.itemName, item.current, item.min_qty, item.max_qty, item.unitPrice, status))
            connection.commit()
            return {"message": "Inventory added"}
    finally:
        connection.close()

@router.put("/inventory/update/{invID}")
async def update_inventory(invID: str, item: InventoryItem):
    status = calculate_status(item.current, item.min_qty, item.max_qty)
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            sql = """UPDATE inventory SET current=%s, min_qty=%s, max_qty=%s, unitPrice=%s, status=%s 
                     WHERE inventoryID=%s"""
            cursor.execute(sql, (item.current, item.min_qty, item.max_qty, item.unitPrice, status, invID))
            connection.commit()
            return {"message": "Inventory updated"}
    finally:
        connection.close()

@router.delete("/inventory/delete/{invID}")
async def delete_inventory(invID: str):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM inventory WHERE inventoryID = %s", (invID,))
            connection.commit()
            return {"message": "Deleted"}
    finally:
        connection.close()