from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_errors import raise_integrity_http
from app.models import Product
from app.schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Product SKU must be unique.",
            fk_detail="Product SKU must be unique.",
        )


@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id.desc()).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    for key, value in updates.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Product SKU must be unique.",
            fk_detail="Product SKU must be unique.",
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    try:
        db.delete(product)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise_integrity_http(
            exc,
            unique_detail="Product SKU must be unique.",
            fk_detail="Cannot delete product because it is referenced by existing orders.",
        )
    return None
