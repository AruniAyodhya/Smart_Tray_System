from fastapi import APIRouter, HTTPException
import pymysql
import os

router = APIRouter()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'database': 'smart_tray',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_next_id(cursor, table, prefix, column):
    cursor.execute(f"SELECT {column} FROM {table} ORDER BY id DESC LIMIT 1")
    last_row = cursor.fetchone()
    if not last_row:
        return f"{prefix}001"
    last_value = str(last_row[column])
    numeric_part = last_value[len(prefix):] if last_value.startswith(prefix) else ""
    try:
        last_id = int(numeric_part)
    except (TypeError, ValueError):
        last_id = 0
    return f"{prefix}{str(last_id + 1).zfill(3)}"

def ensure_order_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            orderID VARCHAR(10) UNIQUE NOT NULL,
            staff_id VARCHAR(10) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            total_discount DECIMAL(10,2) DEFAULT 0.00,
            final_total DECIMAL(10,2) NOT NULL,
            items_list TEXT,
            order_status ENUM('pending', 'completed', 'void') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SHOW COLUMNS FROM orders LIKE 'items_list'")
    items_list_column = cursor.fetchone()
    if not items_list_column:
        cursor.execute("ALTER TABLE orders ADD COLUMN items_list TEXT")

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

@router.get("/menu-catalog")
async def get_menu_catalog():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            # Fetch menu with current daily discounts and current stock level
            cursor.execute("""
                SELECT m.menuID, m.id, m.name, m.price, m.description, m.image_path,
                       d.discount as daily_discount,
                       COALESCE((SELECT i.current FROM inventory i WHERE i.itemName = m.name LIMIT 1), 0) as stock_qty
                FROM menu m
                LEFT JOIN daily_discounts d ON m.name = d.productName AND d.status = 'active'
            """)
            return cursor.fetchall()
    finally:
        connection.close()

@router.post("/create-order")
async def create_order(data: dict):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            ensure_order_tables(cursor)
            items = data.get('items', [])
            items_list = ', '.join([f"{item['name']} (x{item['quantity']})" for item in items])
            order_id = data.get('order_id')

            if order_id:
                cursor.execute("SELECT orderID FROM orders WHERE orderID = %s", (order_id,))
                existing_order = cursor.fetchone()
            else:
                existing_order = None

            if existing_order:
                cursor.execute("""
                    UPDATE orders
                    SET staff_id = %s,
                        subtotal = %s,
                        total_discount = %s,
                        final_total = %s,
                        items_list = %s,
                        order_status = 'pending'
                    WHERE orderID = %s
                """, (data['staff_id'], data['subtotal'], data['total_discount'], data['final_total'], items_list, order_id))
            else:
                order_id = get_next_id(cursor, "orders", "O", "orderID")
                cursor.execute("""
                    INSERT INTO orders (orderID, staff_id, subtotal, total_discount, final_total, items_list, order_status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                """, (order_id, data['staff_id'], data['subtotal'], data['total_discount'], data['final_total'], items_list))
            
            connection.commit()
            return {"message": "Order created", "orderID": order_id}
    finally:
        connection.close()

@router.post("/complete-order/{order_id}")
async def complete_order(order_id: str, data: dict):
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            ensure_order_tables(cursor)
            cursor.execute("SELECT orderID FROM orders WHERE orderID = %s", (order_id,))
            existing_order = cursor.fetchone()

            if not existing_order:
                raise HTTPException(status_code=404, detail="Order not found")

            items = data.get('items', [])
            items_list = ', '.join([f"{item['name']} (x{item['quantity']})" for item in items])

            cursor.execute("DELETE FROM order_items WHERE orderID = %s", (order_id,))

            for item in items:
                oi_id = get_next_id(cursor, "order_items", "OI", "orderItemID")
                cursor.execute("""
                    INSERT INTO order_items (orderItemID, orderID, menuID, item_name, quantity)
                    VALUES (%s, %s, %s, %s, %s)
                """, (oi_id, order_id, item['menuID'], item['name'], item['quantity']))

            # Decrease inventory stock for each ordered item
            for item in items:
                cursor.execute(
                    "UPDATE inventory SET current = GREATEST(0, current - %s) WHERE itemName = %s",
                    (item['quantity'], item['name'])
                )
                cursor.execute(
                    "SELECT current, min_qty, max_qty FROM inventory WHERE itemName = %s",
                    (item['name'],)
                )
                inv_row = cursor.fetchone()
                if inv_row:
                    c, mn, mx = inv_row['current'], inv_row['min_qty'], inv_row['max_qty']
                    new_status = "low stock" if c <= mn else ("over stock" if mx <= c else "good")
                    cursor.execute(
                        "UPDATE inventory SET status = %s WHERE itemName = %s",
                        (new_status, item['name'])
                    )

            cursor.execute("""
                UPDATE orders
                SET staff_id = %s,
                    subtotal = %s,
                    total_discount = %s,
                    final_total = %s,
                    items_list = %s,
                    order_status = 'completed'
                WHERE orderID = %s
            """, (data['staff_id'], data['subtotal'], data['total_discount'], data['final_total'], items_list, order_id))

            connection.commit()
            return {"message": "Order completed", "orderID": order_id}
    finally:
        connection.close()

@router.put("/update-order-status/{order_id}")
async def update_status(order_id: str, status: str):
    # status can be 'completed' or 'void'
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            ensure_order_tables(cursor)
            if status == 'void':
                cursor.execute("DELETE FROM order_items WHERE orderID = %s", (order_id,))
            cursor.execute("UPDATE orders SET order_status = %s WHERE orderID = %s", (status, order_id))
            connection.commit()
            return {"message": f"Order {status}"}
    finally:
        connection.close()

@router.get("/kitchen-display")
async def get_kitchen_orders():
    connection = pymysql.connect(**DB_CONFIG)
    try:
        with connection.cursor() as cursor:
            ensure_order_tables(cursor)
            cursor.execute("""
                SELECT o.*
                FROM orders o
                ORDER BY o.created_at DESC
            """)
            return cursor.fetchall()
    finally:
        connection.close()