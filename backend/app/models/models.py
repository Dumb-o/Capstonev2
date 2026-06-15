import enum
import uuid

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, Enum, DateTime,
    ForeignKey, UniqueConstraint, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def generate_pseudonymous_id(prefix="usr"):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class UserRole(str, enum.Enum):
    client = "client"
    freelancer = "freelancer"
    admin = "admin"


class ExperienceLevel(str, enum.Enum):
    junior = "junior"
    mid = "mid"
    senior = "senior"
    lead = "lead"


class AuthMethod(str, enum.Enum):
    wallet = "wallet"
    email = "email"


class ContractStatus(str, enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    pending_signatures = "pending_signatures"
    pending_funding = "pending_funding"
    active = "active"
    delivered = "delivered"
    revision_requested = "revision_requested"
    completed = "completed"
    cancelled = "cancelled"
    disputed = "disputed"


class MilestoneStatus(str, enum.Enum):
    pending = "pending"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"


class DisputeStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"


class DisputeDecision(str, enum.Enum):
    refund = "refund"
    release = "release"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_pseudonymous_id)
    username = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    auth_method = Column(String(20), default=AuthMethod.wallet.value, nullable=False)
    wallet_address = Column(String(42), unique=True, nullable=True, index=True)
    role = Column(Enum(UserRole), default=UserRole.freelancer)
    bio = Column(Text, nullable=True)
    skills = Column(JSON, default=list)
    hourly_rate = Column(Float, default=0.0)
    rating = Column(Float, default=0.0)
    avatar_cid = Column(String, nullable=True)
    headline = Column(String(200), nullable=True)
    experience_level = Column(String(20), default=ExperienceLevel.mid.value)
    industries = Column(JSON, default=list)
    is_available = Column(Boolean, default=True)
    portfolio_cids = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    jobs = relationship("Job", back_populates="client", foreign_keys="Job.client_id")
    proposals = relationship("Proposal", back_populates="freelancer", foreign_keys="Proposal.freelancer_id")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("job"))
    client_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Float, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    skills = Column(JSON, default=list)
    duration_days = Column(Integer, nullable=True)
    status = Column(String(20), default="open", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("User", back_populates="jobs", foreign_keys=[client_id])
    proposals = relationship("Proposal", back_populates="job", cascade="all, delete-orphan")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("prop"))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    freelancer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    cover_letter = Column(Text, nullable=True)
    bid_amount = Column(Float, nullable=False)
    estimated_days = Column(Integer, nullable=True)
    status = Column(String(20), default="pending", index=True)
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="proposals")
    freelancer = relationship("User", back_populates="proposals", foreign_keys=[freelancer_id])

    __table_args__ = (
        UniqueConstraint("job_id", "freelancer_id", name="uq_job_freelancer"),
    )


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("ct"))
    job_id = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)
    client_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    freelancer_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    total_amount = Column(Float, nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=True)
    terms_cid = Column(String, nullable=True)
    on_chain_id = Column(Integer, nullable=True)
    contract_address = Column(String(42), nullable=True)
    status = Column(Enum(ContractStatus), default=ContractStatus.draft, index=True)
    client_signed = Column(Boolean, default=False)
    freelancer_signed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    milestones_rel = relationship("ContractMilestone", back_populates="contract", cascade="all, delete-orphan",
                                  order_by="ContractMilestone.index")
    dispute = relationship("Dispute", back_populates="contract", uselist=False)


class ContractMilestone(Base):
    __tablename__ = "contract_milestones"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("ms"))
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=False, index=True)
    index = Column(Integer, nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    deliverable_cid = Column(String, nullable=True)
    submission_notes = Column(Text, nullable=True)
    status = Column(Enum(MilestoneStatus), default=MilestoneStatus.pending)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    contract = relationship("Contract", back_populates="milestones_rel")

    __table_args__ = (
        UniqueConstraint("contract_id", "index", name="uq_contract_milestone_index"),
    )


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("dp"))
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=False, unique=True, index=True)
    raised_by = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.open, index=True)
    decision = Column(Enum(DisputeDecision), nullable=True)
    resolved_by = Column(String, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    contract = relationship("Contract", back_populates="dispute")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: generate_pseudonymous_id("msg"))
    sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])

    __table_args__ = (
        Index("idx_messages_conversation", "sender_id", "receiver_id"),
    )


class AdminAccount(Base):
    __tablename__ = "admin_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    role = Column(String(50), default="admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
