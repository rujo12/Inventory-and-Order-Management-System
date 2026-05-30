from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Customer, Order, Product
from app.schemas import DashboardSummary

router = APIRouter()
settings = get_settings()


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    low_stock = (
        db.query(Product)
        .filter(Product.stock_quantity <= settings.low_stock_threshold)
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    return DashboardSummary(
        total_products=db.query(Product).count(),
        total_customers=db.query(Customer).count(),
        total_orders=db.query(Order).count(),
        low_stock_products=low_stock,
    )
