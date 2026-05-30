# Inventory & Order Management System

A full-stack inventory and order management system 

## Features
- Product management with unique SKU validation
- Customer management with unique email validation
- Order creation with automatic stock reduction
- Order cancellation/deletion with stock restoration
- Dashboard summary with low-stock alerts
- React frontend with responsive UI
- FastAPI backend
- PostgreSQL database
- Docker + Docker Compose setup

## Tech Stack
- Frontend: React + Vite
- Backend: FastAPI
- Database: PostgreSQL
- Containerization: Docker, Docker Compose

## Local Development

### Backend
```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Docker Compose
From the project root:
```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Health: http://localhost:8000/api/health

## API Endpoints

### Products
- `POST /api/products`
- `GET /api/products`
- `GET /api/products/{id}`
- `PUT /api/products/{id}`
- `DELETE /api/products/{id}`

### Customers
- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/{id}`
- `DELETE /api/customers/{id}`

### Orders
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/{id}`
- `DELETE /api/orders/{id}`

### Dashboard
- `GET /api/dashboard/summary`

## Business Rules
- SKU must be unique
- Customer email must be unique
- Quantity in stock cannot be negative
- Orders cannot be created if stock is insufficient
- Stock is reduced automatically when an order is placed
- Total amount is calculated automatically by the backend

## Deployment
Use:
- Backend: Render / Railway / Fly.io
- Frontend: Vercel / Netlify
- Database: Neon / Supabase / Railway Postgres

Set environment variables in each platform and point the frontend to the deployed backend API URL.

## Submission
Add your:
- GitHub repository URL
- Docker Hub image URL
- Live frontend URL
- Live backend URL
