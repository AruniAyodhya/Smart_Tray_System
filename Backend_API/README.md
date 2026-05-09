# Smart Tray System Backend API

This is the backend API for the Smart Tray System, built with Python and FastAPI.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the root directory with the following:
   ```
   DB_PASSWORD=admin123
   ```

3. Make sure MySQL is running and the database `smart_tray` exists.

4. Start the server:
   ```bash
   python main.py
   ```

   Or use the batch file:
   ```bash
   run_server.bat
   ```

   Or with uvicorn:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 5000
   ```

## API Endpoints

- `GET /` - Welcome message
- `GET /test-db` - Test database connection
- `POST /login` - Login with username and password
  - Body: `{"username": "user1", "password": "@user001"}`
  - Response: `{"id": 1, "username": "user1", "role": "Order Manager"}`
- `POST /create-tables` - Create database tables and seed users (for development)

## Database

The application automatically creates the `users` table and seeds initial users on startup.

### Users

- user1: @user001 (Order Manager)
- user2: @user002 (Promotion Manager)
- user3: @user003 (Food Master)
- user4: @user004 (Inventory Controller)
- user5: @user005 (System Admin)
- user6: @user006 (Finance Officer)

## Frontend Integration

The frontend (React app) calls the `/login` endpoint for authentication. Make sure both servers are running:
- Backend: http://localhost:5000
- Frontend: http://localhost:5174

## API Documentation

When the server is running, visit `http://localhost:5000/docs` for interactive API documentation provided by FastAPI.