from fastapi import APIRouter, HTTPException, UploadFile, File
import pymysql
import os
import shutil
import glob
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime
import re
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

PROFILE_PICTURE_DIR = "uploads/profile_picture"
os.makedirs(PROFILE_PICTURE_DIR, exist_ok=True)

def remove_profile_picture_files(staff_id: str):
    """Remove all profile picture files for a staff member"""
    pattern = os.path.join(PROFILE_PICTURE_DIR, f"{staff_id}.*")
    for matched_path in glob.glob(pattern):
        if os.path.exists(matched_path):
            os.remove(matched_path)

class StaffMember(BaseModel):
    staff_name: str
    nic: str
    email: str
    phone: str
    address: str
    dob: str
    role: str

def validate_staff_data(data):
    cleaned_staff_name = (data.staff_name or "").strip()
    cleaned_nic = (data.nic or "").strip()
    cleaned_email = (data.email or "").strip()
    cleaned_phone = re.sub(r"\D", "", data.phone or "")
    cleaned_address = (data.address or "").strip()
    cleaned_role = (data.role or "").strip()

    if not cleaned_staff_name:
        raise HTTPException(status_code=400, detail="Staff name is required")

    # NIC Validation
    if not (re.match(r"^[0-9]{12}$", cleaned_nic) or re.match(r"^[0-9]{9}[vV]$", cleaned_nic)):
        raise HTTPException(status_code=400, detail="Invalid NIC format (12 digits or 9+V)")
    
    # Email Validation
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned_email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Phone Validation
    if not re.match(r"^[0-9]{10}$", cleaned_phone):
        raise HTTPException(status_code=400, detail="Phone must be exactly 10 digits")
    
    # Age Validation (16+)
    try:
        birth_date = datetime.strptime(data.dob, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    age = (date.today() - birth_date).days / 365.25
    if age < 16:
        raise HTTPException(status_code=400, detail="Staff member must be at least 16 years old")
    if birth_date >= date.today():
        raise HTTPException(status_code=400, detail="Date of birth cannot be in the future")

    return {
        "staff_name": cleaned_staff_name,
        "nic": cleaned_nic,
        "email": cleaned_email,
        "phone": cleaned_phone,
        "address": cleaned_address,
        "dob": str(birth_date),
        "role": cleaned_role,
    }

@router.get("/staff")
async def get_all_staff():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users ORDER BY staff_id ASC")
            rows = cursor.fetchall()
            for r in rows: r['dob'] = str(r['dob'])
            return rows
    finally:
        conn.close()

@router.post("/staff/add")
async def add_staff(data: StaffMember):
    cleaned = validate_staff_data(data)
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # Generate next sequential staff ID using the highest numeric S### code.
            cursor.execute("""
                SELECT staff_id
                FROM users
                WHERE staff_id REGEXP '^S[0-9]{3}$'
                ORDER BY CAST(SUBSTRING(staff_id, 2) AS UNSIGNED) DESC
                LIMIT 1
            """)
            last = cursor.fetchone()
            next_num = 1 if not last else int(last['staff_id'][1:]) + 1
            next_id = f"S{next_num:03d}"

            # Password is derived from staff_id so both always stay in sync.
            raw_password = f"@staff{next_id[1:]}"
            hashed_pw = pwd_context.hash(raw_password)
            
            cursor.execute("""
                INSERT INTO users (staff_id, staff_name, password, nic, email, phone, address, dob, role)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (next_id, cleaned['staff_name'], hashed_pw, cleaned['nic'], cleaned['email'], cleaned['phone'], cleaned['address'], cleaned['dob'], cleaned['role']))
            conn.commit()
            return {
                "message": "Staff added successfully",
                "staff_id": next_id,
                "username": next_id,
                "generated_password": raw_password
            }
    finally:
        conn.close()

@router.put("/staff/update/{sid}")
async def update_staff(sid: str, data: StaffMember):
    cleaned = validate_staff_data(data)
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE users SET staff_name=%s, nic=%s, email=%s, phone=%s, address=%s, dob=%s, role=%s
                WHERE staff_id=%s
            """, (cleaned['staff_name'], cleaned['nic'], cleaned['email'], cleaned['phone'], cleaned['address'], cleaned['dob'], cleaned['role'], sid))
            conn.commit()
            return {"message": "Updated successfully"}
    finally:
        conn.close()

@router.delete("/staff/delete/{sid}")
async def delete_staff(sid: str):
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE staff_id=%s", (sid,))
            conn.commit()
            return {"message": "Deleted successfully"}
    finally:
        conn.close()

# Password Change Logic
class PasswordChange(BaseModel):
    staff_id: str
    current_password: str
    new_password: str

@router.post("/staff/change-password")
async def change_password(data: PasswordChange):
    if not re.match(r"^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{8,}$", data.new_password):
        raise HTTPException(status_code=400, detail="Password must be 8+ chars with a symbol and letter")
    
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT password FROM users WHERE staff_id=%s", (data.staff_id,))
            user = cursor.fetchone()
            if not user or not pwd_context.verify(data.current_password, user['password']):
                raise HTTPException(status_code=401, detail="Current password incorrect")
            
            new_hashed = pwd_context.hash(data.new_password)
            cursor.execute("UPDATE users SET password=%s WHERE staff_id=%s", (new_hashed, data.staff_id))
            conn.commit()
            return {"message": "Password updated"}
    finally:
        conn.close()

# Profile Picture Logic
@router.post("/staff/upload-profile-picture/{staff_id}")
async def upload_profile_picture(staff_id: str, image: UploadFile = File(...)):
    """Upload or update profile picture for a staff member"""
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT staff_id FROM users WHERE staff_id=%s", (staff_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="Staff member not found")
    finally:
        conn.close()
    
    # Remove old profile picture if exists
    remove_profile_picture_files(staff_id)
    
    # Save new profile picture with staff_id as filename
    file_extension = os.path.splitext(image.filename)[1]
    file_name = f"{staff_id}{file_extension}"
    file_path = os.path.join(PROFILE_PICTURE_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    return {
        "message": "Profile picture uploaded successfully",
        "image_path": file_path
    }

@router.delete("/staff/delete-profile-picture/{staff_id}")
async def delete_profile_picture(staff_id: str):
    """Delete profile picture for a staff member"""
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT staff_id FROM users WHERE staff_id=%s", (staff_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="Staff member not found")
    finally:
        conn.close()
    
    # Remove profile picture files
    remove_profile_picture_files(staff_id)
    
    return {"message": "Profile picture deleted successfully"}