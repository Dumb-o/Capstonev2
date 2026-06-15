from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.utils.sanitizer import SanitizedStr, SanitizedOptionalStr


class ChallengeRequest(BaseModel):
    address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")


class ChallengeResponse(BaseModel):
    nonce: str


class LoginRequest(BaseModel):
    address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    signature: str
    role: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    username: SanitizedOptionalStr = None
    bio: SanitizedOptionalStr = None
    skills: Optional[list[str]] = None
    hourly_rate: Optional[float] = None
    avatar_cid: Optional[str] = None
    headline: SanitizedOptionalStr = None
    experience_level: Optional[str] = None
    industries: Optional[list[str]] = None
    is_available: Optional[bool] = None
    portfolio_cids: Optional[list[str]] = None


class EmailRegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=8, max_length=128)
    username: SanitizedOptionalStr = None
    role: Optional[str] = None


class EmailLoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: Optional[str] = None
    email: Optional[str] = None
    role: str
    auth_method: str
    wallet_address: Optional[str] = None
    bio: Optional[str] = None
    skills: list[str] = []
    hourly_rate: float = 0.0
    rating: float = 0.0
    avatar_cid: Optional[str] = None
    headline: Optional[str] = None
    experience_level: str = "mid"
    industries: list[str] = []
    is_available: bool = True
    portfolio_cids: list[str] = []
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    title: SanitizedStr = Field(..., min_length=1, max_length=200)
    description: SanitizedOptionalStr = None
    budget: float = Field(..., gt=0)
    category: Optional[str] = None
    skills: list[str] = []
    duration_days: Optional[int] = Field(None, gt=0)


class JobUpdate(BaseModel):
    title: SanitizedOptionalStr = None
    description: SanitizedOptionalStr = None
    budget: Optional[float] = None
    status: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    client_id: str
    title: str
    description: Optional[str] = None
    budget: float
    category: Optional[str] = None
    skills: list[str] = []
    duration_days: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedJobs(BaseModel):
    jobs: list[JobResponse]
    total: int
    page: int
    pages: int


class ProposalCreate(BaseModel):
    cover_letter: SanitizedOptionalStr = None
    bid_amount: float = Field(..., gt=0)
    estimated_days: Optional[int] = Field(None, gt=0)


class ProposalResponse(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    job_title: Optional[str] = None
    freelancer_name: Optional[str] = None
    cover_letter: Optional[str] = None
    bid_amount: float
    estimated_days: Optional[int] = None
    status: str
    contract_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MilestoneDef(BaseModel):
    description: SanitizedStr
    amount: float
    due_date: Optional[datetime] = None


class ContractCreate(BaseModel):
    job_id: Optional[str] = None
    freelancer_id: str
    title: SanitizedStr = Field(..., min_length=1, max_length=200)
    description: SanitizedOptionalStr = None
    total_amount: float = Field(..., gt=0)
    deadline: Optional[datetime] = None
    milestones: list[MilestoneDef] = Field(..., min_length=1)


class ContractResponse(BaseModel):
    id: str
    job_id: Optional[str] = None
    client_id: str
    freelancer_id: str
    client_name: Optional[str] = None
    freelancer_name: Optional[str] = None
    job_title: Optional[str] = None
    title: str
    description: Optional[str] = None
    total_amount: float
    deadline: Optional[datetime] = None
    terms_cid: Optional[str] = None
    on_chain_id: Optional[int] = None
    contract_address: Optional[str] = None
    status: str
    client_signed: bool
    freelancer_signed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ContractDetail(BaseModel):
    contract: ContractResponse
    milestones: list["MilestoneResponse"]
    dispute: Optional["DisputeResponse"] = None


class MilestoneSubmit(BaseModel):
    deliverable_cid: str = Field(..., min_length=1)
    notes: SanitizedOptionalStr = None


class MilestoneReject(BaseModel):
    reason: SanitizedStr


class MilestoneResponse(BaseModel):
    id: str
    contract_id: str
    index: int
    description: str
    amount: float
    due_date: Optional[datetime] = None
    deliverable_cid: Optional[str] = None
    submission_notes: Optional[str] = None
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DisputeCreate(BaseModel):
    raised_by: str = Field(..., pattern="^(client|freelancer)$")
    reason: SanitizedStr = Field(..., min_length=1)


class DisputeResolve(BaseModel):
    decision: str = Field(..., pattern="^(refund|release)$")
    notes: SanitizedOptionalStr = None


class DisputeResponse(BaseModel):
    id: str
    contract_id: str
    raised_by: str
    reason: str
    status: str
    decision: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageSend(BaseModel):
    receiver_id: str
    content: SanitizedStr = Field(..., min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Conversation(BaseModel):
    user: UserResponse
    last_message: MessageResponse
    unread: int


class IPFSUploadResponse(BaseModel):
    cid: str
    size: int
    mime_type: str


class JobRecommendation(BaseModel):
    job: JobResponse
    match_score: float
    match_reasons: list[str]


class FreelancerRecommendation(BaseModel):
    freelancer: UserResponse
    match_score: float
    match_reasons: list[str]


class PaginatedContracts(BaseModel):
    contracts: list[ContractResponse]
    total: int
    page: int
    pages: int


class PaginatedDisputes(BaseModel):
    disputes: list[DisputeResponse]
    total: int
    page: int
    pages: int


class AdminStats(BaseModel):
    total_users: int
    total_jobs: int
    total_proposals: int
    total_contracts: int
    total_volume_eth: float
    active_disputes: int
    platform_fees_accumulated: float
    role_counts: dict[str, int] = {}


class AdminUserCreate(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=6)
    username: SanitizedOptionalStr = None
    role: str = "freelancer"
    hourly_rate: float = 0.0

class AdminJobCreate(BaseModel):
    client_id: str
    title: SanitizedStr = Field(..., min_length=1, max_length=200)
    description: SanitizedOptionalStr = None
    budget: float = Field(..., gt=0)
    category: Optional[str] = None
    skills: list[str] = []
    duration_days: Optional[int] = Field(None, gt=0)
    status: Optional[str] = "open"

class AdminProposalCreate(BaseModel):
    job_id: str
    freelancer_id: str
    cover_letter: SanitizedOptionalStr = None
    bid_amount: float = Field(..., gt=0)
    estimated_days: Optional[int] = Field(None, gt=0)

class AdminContractCreate(BaseModel):
    job_id: Optional[str] = None
    client_id: str
    freelancer_id: str
    title: SanitizedStr = Field(..., min_length=1, max_length=200)
    description: SanitizedOptionalStr = None
    total_amount: float = Field(..., gt=0)
    deadline: Optional[datetime] = None
    status: Optional[str] = "pending_signatures"

class AdminDisputeCreate(BaseModel):
    contract_id: str
    raised_by: str = Field(..., pattern="^(client|freelancer)$")
    reason: SanitizedStr = Field(..., min_length=1)

class PaginatedUsers(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    pages: int
