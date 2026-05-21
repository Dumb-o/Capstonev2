from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChallengeRequest(BaseModel):
    address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")


class ChallengeResponse(BaseModel):
    nonce: str


class LoginRequest(BaseModel):
    address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    signature: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: "UserResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    hourly_rate: Optional[float] = None
    avatar_cid: Optional[str] = None


class EmailRegisterRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=8, max_length=128)
    username: Optional[str] = None
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
    created_at: datetime

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    budget: float = Field(..., gt=0)
    category: Optional[str] = None
    skills: list[str] = []
    duration_days: Optional[int] = Field(None, gt=0)


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
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
    cover_letter: Optional[str] = None
    bid_amount: float = Field(..., gt=0)
    estimated_days: Optional[int] = Field(None, gt=0)


class ProposalResponse(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    cover_letter: Optional[str] = None
    bid_amount: float
    estimated_days: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class MilestoneDef(BaseModel):
    description: str
    amount: float
    due_date: Optional[datetime] = None


class ContractCreate(BaseModel):
    job_id: Optional[str] = None
    freelancer_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    total_amount: float = Field(..., gt=0)
    deadline: Optional[datetime] = None
    milestones: list[MilestoneDef] = Field(..., min_length=1)


class ContractResponse(BaseModel):
    id: str
    job_id: Optional[str] = None
    client_id: str
    freelancer_id: str
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
    notes: Optional[str] = None


class MilestoneReject(BaseModel):
    reason: str


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
    reason: str = Field(..., min_length=1)


class DisputeResolve(BaseModel):
    decision: str = Field(..., pattern="^(refund|release)$")
    notes: Optional[str] = None


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
    content: str = Field(..., min_length=1, max_length=5000)


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
    total_contracts: int
    total_volume_eth: float
    active_disputes: int
    platform_fees_accumulated: float


class PaginatedUsers(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    pages: int
