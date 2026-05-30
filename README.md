# Inventory & Order Management System

A full-stack Inventory & Order Management System built using FastAPI, React, PostgreSQL, Docker, and Docker Compose. The application enables users to manage products, customers, and orders while enforcing inventory validation and maintaining accurate stock levels.

## Features

### Product Management

* Create products
* View products
* Update products
* Delete products
* Unique SKU validation
* Inventory tracking

### Customer Management

* Create customers
* View customers
* Update customers
* Delete customers
* Unique email validation

### Order Management

* Create orders
* Automatic inventory deduction
* Order total calculation
* Inventory validation before order creation
* Prevention of orders with insufficient stock

### Dashboard

* Total products
* Total customers
* Total orders
* Low-stock monitoring
* Inventory overview

---

## Business Rules

### Unique Product SKU

Every product must have a unique SKU.

### Unique Customer Email

Every customer must have a unique email address.

### Inventory Validation

Orders cannot be placed if requested quantity exceeds available inventory.

### Automatic Stock Reduction

Successful orders automatically reduce product inventory.

### Atomic Order Processing

Order creation is transaction-safe:

* All items are validated before inventory updates.
* No partial stock deductions occur.
* No partial order creation occurs.
* Orders with insufficient stock are rejected immediately.

---

## Technology Stack

### Frontend

* React
* Vite
* JavaScript

### Backend

* FastAPI
* SQLAlchemy
* Pydantic
* Uvicorn

### Database

* PostgreSQL

### DevOps

* Docker
* Docker Compose

### Deployment

* Vercel
* Render
* Docker Hub

---

## Project Structure

```text
Inventory-and-Order-Management-System
│
├── backend
│   ├── app
│   │   ├── routers
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend
│   ├── src
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

```env
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=inventory_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

APP_NAME=Inventory & Order Management API
```

---

## Running Locally

### Start Services

```bash
docker compose up --build
```

### Frontend

```text
http://localhost:3000
```

### Backend

```text
http://localhost:8000
```

### API Documentation

```text
http://localhost:8000/docs
```

### Stop Services

```bash
docker compose down
```

---

## Docker

Build and run the complete application:

```bash
docker compose up --build
```

Pull backend image:

```bash
docker pull rushiljoshi12/inventory-backend:latest
```

---

## API Endpoints

### Products

```http
GET    /api/products
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
```

### Customers

```http
GET    /api/customers
POST   /api/customers
PUT    /api/customers/{id}
DELETE /api/customers/{id}
```

### Orders

```http
GET    /api/orders
POST   /api/orders
```

### Dashboard

```http
GET /api/dashboard
```

### Health Check

```http
GET /api/health
```

---
