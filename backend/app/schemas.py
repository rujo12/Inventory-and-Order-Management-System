from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(gt=0)
    stock_quantity: int = Field(ge=0)
    description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sku: Optional[str] = Field(default=None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(default=None, gt=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    description: Optional[str] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CustomerBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone_number: str = Field(min_length=5, max_length=50)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(default=None, min_length=5, max_length=50)


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CustomerMiniOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str
    phone_number: str


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    customer_id: int = Field(gt=0)
    items: List[OrderItemCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def ensure_unique_products(self):
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Duplicate product_id values are not allowed in one order.")
        return self


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product: ProductOut


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer: CustomerMiniOut
    total_amount: Decimal
    status: str
    items: List[OrderItemOut]


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: list[ProductOut]
