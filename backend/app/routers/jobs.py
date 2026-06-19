from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, RoleRequire
from app.models.models import Job, User
from app.schemas.schemas import (
    JobCreate,
    JobResponse,
    JobUpdate,
    PaginatedJobs,
)
from app.utils.error_codes import ErrorCodes
from app.utils.exceptions import AuthorizationError, NotFoundError
from app.utils.helpers import pagination_params

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=201)
@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(
    data: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(RoleRequire("client")),
):
    job = Job(
        client_id=current_user.id,
        title=data.title,
        description=data.description,
        budget=data.budget,
        category=data.category,
        skills=data.skills,
        duration_days=data.duration_days,
    )
    db.add(job)
    await db.flush()
    return JobResponse.model_validate(job)


@router.get("", response_model=PaginatedJobs)
@router.get("/", response_model=PaginatedJobs)
async def list_jobs(
    category: str | None = Query(None),
    skill: str | None = Query(None),
    min_budget: float | None = Query(None),
    max_budget: float | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            Job.title.ilike(pattern) | Job.description.ilike(pattern)
        )
    if category:
        query = query.where(Job.category == category)
    if skill:
        query = query.where(Job.skills.any(skill))
    if min_budget is not None:
        query = query.where(Job.budget >= min_budget)
    if max_budget is not None:
        query = query.where(Job.budget <= max_budget)
    if status:
        query = query.where(Job.status == status)

    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar()

    offset, limit = pagination_params(page, limit)
    query = query.order_by(Job.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return PaginatedJobs(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        pages=(total + limit - 1) // limit if total > 0 else 1,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    return JobResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    data: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can update", code=ErrorCodes.AUTHZ_JOB_POSTER)

    if data.title is not None:
        job.title = data.title
    if data.description is not None:
        job.description = data.description
    if data.budget is not None:
        job.budget = data.budget
    if data.status is not None:
        job.status = data.status

    await db.flush()
    return JobResponse.model_validate(job)


@router.delete("/{job_id}")
async def close_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundError("Job not found", code=ErrorCodes.NOT_FOUND_JOB)
    if job.client_id != current_user.id:
        raise AuthorizationError("Only the job poster can close", code=ErrorCodes.AUTHZ_JOB_POSTER)

    job.status = "closed"
    await db.flush()
    return {"message": "closed"}
