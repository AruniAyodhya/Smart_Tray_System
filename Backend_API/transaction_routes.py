from fastapi import APIRouter, HTTPException, Depends
import pymysql
import os

router = APIRouter()

def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password=os.getenv('DB_PASSWORD', 'admin123'),
        database='smart_tray',
        cursorclass=pymysql.cursors.DictCursor
    )

@router.post("/complete-transaction")
async def complete_transaction(data: dict):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Ensure items_summary column exists (safe migration, MySQL-compatible)
            cursor.execute("SHOW COLUMNS FROM transactions LIKE 'items_summary'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE transactions ADD COLUMN items_summary TEXT")

            # Generate P001, P002 style ID
            cursor.execute("SELECT paymentID FROM transactions ORDER BY id DESC LIMIT 1")
            last = cursor.fetchone()
            new_id = "P001"
            if last:
                num = int(last['paymentID'][1:]) + 1
                new_id = f"P{num:03d}"

            items_summary = data.get('items_summary', '')

            cursor.execute("""
                INSERT INTO transactions (paymentID, orderID, payment_method, discount, total, payment_status, items_summary)
                VALUES (%s, %s, %s, %s, %s, 'complete', %s)
            """, (new_id, data['orderID'], data['paymentMethod'], data['discount'], data['total'], items_summary))
            
            # Update original order status to completed
            cursor.execute("UPDATE orders SET order_status = 'completed' WHERE orderID = %s", (data['orderID'],))
            
            conn.commit()
            return {"status": "success", "paymentID": new_id}
    finally:
        conn.close()

@router.get("/transaction-stats")
async def get_stats():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count, SUM(total) as revenue FROM transactions WHERE payment_status = 'complete'")
            res = cursor.fetchone()
            count = res['count'] or 0
            rev = float(res['revenue'] or 0)
            avg = rev / count if count > 0 else 0

            # Card vs cash breakdown per day (last 14 days)
            cursor.execute("""
                SELECT DATE(created_at) as day,
                       SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END) as card_rev,
                       SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END) as cash_rev
                FROM transactions
                WHERE payment_status = 'complete'
                  AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
                GROUP BY day
                ORDER BY day
            """)
            trends = cursor.fetchall()
            # Ensure dates are strings
            for t in trends:
                t['day'] = str(t['day'])
                t['card_rev'] = float(t['card_rev'] or 0)
                t['cash_rev'] = float(t['cash_rev'] or 0)

            return {"count": count, "revenue": rev, "average": avg, "trends": trends}
    finally:
        conn.close()

@router.get("/transactions")
async def list_transactions(start_date: str = None, end_date: str = None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = "SELECT * FROM transactions WHERE 1=1"
            params = []
            if start_date:
                sql += " AND DATE(created_at) >= %s"
                params.append(start_date)
            if end_date:
                sql += " AND DATE(created_at) <= %s"
                params.append(end_date)
            sql += " ORDER BY created_at DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            for r in rows:
                r['created_at'] = str(r['created_at'])
                r['total'] = float(r['total'] or 0)
                r['discount'] = float(r['discount'] or 0)
            return rows
    finally:
        conn.close()

@router.put("/refund-transaction/{orderID}")
async def refund(orderID: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT payment_status FROM transactions WHERE orderID = %s", (orderID,))
            trx = cursor.fetchone()
            if not trx:
                raise HTTPException(status_code=404, detail="Transaction not found")

            cursor.execute("""
                ALTER TABLE orders
                MODIFY COLUMN order_status ENUM('pending', 'completed', 'void', 'refunded') DEFAULT 'pending'
            """)

            # Keep order row, mark as refunded, and clear order items.
            # Restore inventory stock for each refunded item before clearing order_items.
            cursor.execute("SELECT item_name, quantity FROM order_items WHERE orderID = %s", (orderID,))
            refunded_items = cursor.fetchall()
            for oi in refunded_items:
                cursor.execute(
                    "UPDATE inventory SET current = current + %s WHERE itemName = %s",
                    (oi['quantity'], oi['item_name'])
                )
                cursor.execute(
                    "SELECT current, min_qty, max_qty FROM inventory WHERE itemName = %s",
                    (oi['item_name'],)
                )
                inv_row = cursor.fetchone()
                if inv_row:
                    c, mn, mx = inv_row['current'], inv_row['min_qty'], inv_row['max_qty']
                    new_status = "low stock" if c <= mn else ("over stock" if mx <= c else "good")
                    cursor.execute(
                        "UPDATE inventory SET status = %s WHERE itemName = %s",
                        (new_status, oi['item_name'])
                    )

            # Keep order row, mark as refunded, and clear order items.
            cursor.execute("UPDATE transactions SET payment_status = 'refund' WHERE orderID = %s", (orderID,))
            cursor.execute("UPDATE orders SET order_status = 'refunded' WHERE orderID = %s", (orderID,))
            cursor.execute("DELETE FROM order_items WHERE orderID = %s", (orderID,))
            conn.commit()
            return {"message": "Refunded"}
    finally:
        conn.close()

@router.delete("/delete-transaction/{orderID}")
async def delete_trx(orderID: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT orderID FROM transactions WHERE orderID = %s", (orderID,))
            trx = cursor.fetchone()
            if not trx:
                raise HTTPException(status_code=404, detail="Transaction not found")

            # Remove only the selected transaction and its related order records.
            cursor.execute("DELETE FROM transactions WHERE orderID = %s", (orderID,))
            cursor.execute("DELETE FROM order_items WHERE orderID = %s", (orderID,))
            cursor.execute("DELETE FROM orders WHERE orderID = %s", (orderID,))
            conn.commit()
            return {"message": "Deleted"}
    finally:
        conn.close()