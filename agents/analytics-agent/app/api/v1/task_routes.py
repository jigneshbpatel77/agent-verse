from fastapi import APIRouter
router = APIRouter()
@router.post('/')
def run_task(): return {'task_id': 'placeholder'}