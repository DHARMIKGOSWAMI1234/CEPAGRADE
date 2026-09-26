from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.result import OnionResultResponse
from app.services.inspection_service import inspection_service

router = APIRouter(prefix="/results", tags=["Results"])


@router.get(
    "/{inspection_id}",
    response_model=List[OnionResultResponse],
    summary="Retrieve onion-level results by inspection ID",
)
def get_results_by_inspection_id(
    inspection_id: str,
    db: Session = Depends(get_db),
) -> List[OnionResultResponse]:
    """Convenience endpoint returning individual onion inspection results."""
    return inspection_service.get_inspection_results(db=db, inspection_id=inspection_id)
