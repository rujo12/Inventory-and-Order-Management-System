from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError


def raise_integrity_http(
    exc: IntegrityError,
    *,
    unique_detail: str,
    fk_detail: str,
) -> None:
    pgcode = getattr(getattr(exc, "orig", None), "pgcode", None)
    if pgcode == "23505":
        raise HTTPException(status_code=409, detail=unique_detail)
    if pgcode == "23503":
        raise HTTPException(status_code=409, detail=fk_detail)
    raise HTTPException(status_code=409, detail="Operation conflicts with existing data.")
