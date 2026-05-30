from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.db_errors import raise_integrity_http
from app.models import Customer, Order, OrderItem, Product
from app.schemas import OrderCreate, OrderOut

router = APIRouter()


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    products = {}
    for item in payload.items:
        product = db.get(Product, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found.")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for product '{product.name}'. Available: {product.stock_quantity}. Requested: {item.quantity}.",
            )
        products[item.product_id] = product

    order = Order(customer_id=payload.customer_id, total_amount=Decimal("0.00"), status="created")
    db.add(order)
    db.flush()

    total_amount = Decimal("0.00")
    for item in payload.items:
        product = products[item.product_id]
        product.stock_quantity -= item.quantity
        line_total = Decimal(str(product.price)) * item.quantity
        total_amount += line_total
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price,
            )
        )

    order.total_amount = total_amount.quantize(Decimal("0.01"))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Order conflicts with existing data.",
            fk_detail="Insufficient stock or invalid product reference.",
        )
    db.refresh(order)
    return (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .one()
    )


@router.get("", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .all()
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock_quantity += item.quantity

    db.delete(order)
    db.commit()
    return None
