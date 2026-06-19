import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Loading from '../components/shared/Loading';
import { useApp } from '../context/AppContext';
import ProposalForm from '../components/proposals/ProposalForm';
import api from '../services/api';

const catColors = {
  'web-dev': 'cat-development',
  'blockchain': 'cat-smart-contracts',
  'mobile': 'cat-development',
  'design': 'cat-design',
  'writing': 'cat-writing',
  'marketing': 'cat-marketing',
  'data-science': 'cat-data-analytics',
  'devops': 'cat-development',
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const user = state.user;
  const isFreelancer = user?.role === 'freelancer';
  const isOwner = job && user && job.client_id === user.id;
  const canApply = isFreelancer && !isOwner && !alreadyApplied;

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data);
      } catch {
        navigate('/jobs');
      }
      setLoading(false);
    }
    load();
  }, [id, navigate]);

  const handleProposalResult = (result) => {
    setShowForm(false);
    if (result === 'submitted') {
      setSubmitted(true);
    } else if (result === 'already_applied') {
      setAlreadyApplied(true);
    }
  };

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            {loading ? (
              <Loading />
            ) : !job ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Job not found</h3>
                <p>The job you're looking for doesn't exist.</p>
                <Link to="/jobs" className="btn btn-primary">Browse Jobs</Link>
              </div>
            ) : (
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">{job.title}</h1>
                    <p className="page-sub" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {job.category && (
                        <span className={`job-category ${catColors[job.category] || 'cat-development'}`}>
                          {job.category}
                        </span>
                      )}
                      <span>{job.status}</span>
                    </p>
                  </div>
                  <Link to="/jobs" className="btn btn-outline btn-sm">← Back</Link>
                </div>

                <div className="two-col">
                  <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header"><h3>Description</h3></div>
                      <div className="card-body">
                        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                          {job.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {job.skills?.length > 0 && (
                      <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>Skills Required</h3></div>
                        <div className="card-body">
                          <div className="job-skills">
                            {job.skills.map(s => (
                              <span key={s} className="skill-tag">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header"><h3>Job Details</h3></div>
                      <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Budget</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>{job.budget} ETH</div>
                          </div>
                          <div className="prog-bar" style={{ height: 1, background: 'var(--border)' }}></div>
                          {job.duration_days && (
                            <div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Duration</div>
                              <div style={{ fontSize: 16, fontWeight: 700 }}>{job.duration_days} days</div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Status</div>
                            <span className={`badge ${job.status === 'open' ? 'badge-active' : 'badge-completed'}`}>{job.status}</span>
                          </div>
                          {job.created_at && (
                            <div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>Posted</div>
                              <div style={{ fontSize: 14 }}>{new Date(job.created_at).toLocaleDateString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {submitted ? (
                      <div className="card" style={{ border: '2px solid var(--green)', background: '#f0fdf4' }}>
                        <div className="card-body" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                          <h4 style={{ marginBottom: 4 }}>Proposal Submitted!</h4>
                          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>The client will review your proposal. Check your dashboard for updates.</p>
                          <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                            Go to Dashboard
                          </Link>
                        </div>
                      </div>
                    ) : isOwner ? (
                      <div className="card" style={{ background: 'var(--surface)' }}>
                        <div className="card-body" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                          <h4 style={{ marginBottom: 4 }}>Your Job Posting</h4>
                          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>This is your job listing. Track proposals from your dashboard.</p>
                          <Link to="/dashboard" className="btn btn-outline btn-sm">View Proposals</Link>
                        </div>
                      </div>
                    ) : alreadyApplied ? (
                      <div className="card" style={{ border: '2px solid var(--amber)' }}>
                        <div className="card-body" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>📨</div>
                          <h4 style={{ marginBottom: 4 }}>Already Applied</h4>
                          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You've already submitted a proposal for this job. Check your dashboard for the status.</p>
                          <Link to="/dashboard" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                            My Proposals
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="hire-card">
                        <div className="hc-icon" style={{ fontSize: 22, marginBottom: 8 }}>💼</div>
                        <h4>Interested in this job?</h4>
                        <p>Submit a proposal to start working on this project.</p>
                        <button className="btn-hire" onClick={() => setShowForm(true)}>Apply Now</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showForm && (
        <ProposalForm
          jobId={id}
          jobTitle={job?.title}
          onClose={() => setShowForm(false)}
          onSuccess={handleProposalResult}
        />
      )}
    </div>
  );
}
