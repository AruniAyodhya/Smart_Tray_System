from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pymysql.cursors
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from passlib.context import CryptContext
from pydantic import BaseModel

# Import modular routes
import staff_routes
import food_routes
import inventory_routes
import promotion_routes
import order_routes
import transaction_routes
import ai_food_scanner

load_dotenv()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
             # 1. Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    staff_id VARCHAR(10) UNIQUE NOT NULL,
                    staff_name VARCHAR(100) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    nic VARCHAR(20) NOT NULL,
                    email VARCHAR(100) NOT NULL,
                    phone VARCHAR(15) NOT NULL,
                    address TEXT,
                    dob DATE,
                    role VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 2. Menu table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS menu (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    menuID VARCHAR(10) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    description TEXT,
                    image_path VARCHAR(255)
                )
            """)

            # 3. Inventory table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS inventory (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    inventoryID VARCHAR(10) UNIQUE NOT NULL,
                    itemName VARCHAR(100) NOT NULL,
                    current INT NOT NULL,
                    min_qty INT NOT NULL,
                    max_qty INT NOT NULL,
                    unitPrice DECIMAL(10,2) NOT NULL,
                    status VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 4. Seasonal Promotions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS seasonal_promotions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    promoID VARCHAR(10) UNIQUE NOT NULL,
                    title VARCHAR(100) NOT NULL,
                    discount INT NOT NULL,
                    startDate DATE NOT NULL,
                    endDate DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'scheduled'
                )
            """)

            # 5. Daily Discounts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_discounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    discountID VARCHAR(10) UNIQUE NOT NULL,
                    productName VARCHAR(100) NOT NULL,
                    originalPrice DECIMAL(10,2) NOT NULL,
                    discount INT NOT NULL,
                    newPrice DECIMAL(10,2) NOT NULL,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 6. NEW: Orders Table (Manual & AI POS)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    orderID VARCHAR(10) UNIQUE NOT NULL,
                    staff_id VARCHAR(10) NOT NULL,
                    subtotal DECIMAL(10,2) NOT NULL,
                    total_discount DECIMAL(10,2) DEFAULT 0.00,
                    final_total DECIMAL(10,2) NOT NULL,
                    order_status ENUM('pending', 'completed', 'void') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 7. NEW: Order Items Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS order_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    orderItemID VARCHAR(10) UNIQUE NOT NULL,
                    orderID VARCHAR(10) NOT NULL,
                    menuID VARCHAR(10) NOT NULL,
                    item_name VARCHAR(100) NOT NULL,
                    quantity INT NOT NULL,
                    FOREIGN KEY (orderID) REFERENCES orders(orderID) ON DELETE CASCADE
                )
            """)


            # 8. NEW: Transactions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    paymentID VARCHAR(10) UNIQUE NOT NULL,
                    orderID VARCHAR(10) NOT NULL,
                    payment_method ENUM('cash', 'card') NOT NULL,
                    discount DECIMAL(10,2) DEFAULT 0.00,
                    total DECIMAL(10,2) NOT NULL,
                    payment_status ENUM('complete', 'refund', 'void') DEFAULT 'complete',
                    items_summary TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (orderID) REFERENCES orders(orderID) ON DELETE CASCADE
                )
            """)
            
            # Default Admin Check
            cursor.execute("SELECT * FROM users WHERE staff_id = 'S001'")
            if not cursor.fetchone():
                hashed_pass = pwd_context.hash("@staff001")
                cursor.execute("""
                    INSERT INTO users (staff_id, staff_name, password, nic, email, phone, address, dob, role)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, ("S001", "System Admin", hashed_pass, "199012345678", "admin@gmail.com", "0771234567", "Main Office", "1990-01-01", "system admin"))
            
            connection.commit()
    finally:
        connection.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Smart Tray System API", lifespan=lifespan)

# Setup static directories
os.makedirs("uploads/menu", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(staff_routes.router, prefix="/api")
app.include_router(food_routes.router, prefix="/api") 
app.include_router(inventory_routes.router, prefix="/api")
app.include_router(promotion_routes.router, prefix="/api")
app.include_router(order_routes.router, prefix="/api")
app.include_router(transaction_routes.router, prefix="/api") # REGISTERED NEW ROUTE
app.include_router(ai_food_scanner.router, prefix="/api") # AI food scanner route

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
async def login(request: LoginRequest):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE staff_id = %s", (request.username,))
            user = cursor.fetchone()
            if not user or not pwd_context.verify(request.password, user['password']):
                raise HTTPException(status_code=401, detail="Invalid Staff ID or Password")
            user.pop('password')
            user['dob'] = str(user['dob'])
            return user
    finally:
        connection.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)