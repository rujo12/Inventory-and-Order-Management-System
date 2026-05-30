from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_errors import raise_integrity_http
from app.models import Customer
from app.schemas import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter()


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Customer email must be unique.",
            fk_detail="Customer email must be unique.",
        )


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.id.desc()).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    for key, value in updates.items():
        setattr(customer, key, value)

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Customer email must be unique.",
            fk_detail="Customer email must be unique.",
        )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    try:
        db.delete(customer)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Customer email must be unique.",
            fk_detail="Cannot delete customer because they have existing orders.",
        )
    return None
