from fastapi import APIRouter
from .kpi import router as kpi_router

router = APIRouter()
router.include_router(kpi_router, prefix="/kpi", tags=["kpi"])


