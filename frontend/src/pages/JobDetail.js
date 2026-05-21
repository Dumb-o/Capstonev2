import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import api from '../services/api';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          {loading ? (
            <Loading />
          ) : !job ? (
            <div className="empty-state">
              <p>Job not found.</p>
              <Link to="/jobs" className="btn btn-primary btn-sm">Browse Jobs</Link>
            </div>
          ) : (
            <div className="contract-detail">
              <div className="detail-header">
                <div>
                  <h2>{job.title}</h2>
                  {job.category && <span className="job-category">{job.category}</span>}
                </div>
                <div className="detail-actions">
                  <Link to="/jobs" className="btn btn-sm btn-outline">← Back</Link>
                </div>
              </div>

              <div className="detail-meta">
                <div><strong>Budget</strong><br />{job.budget} ETH</div>
                {job.duration_days && <div><strong>Duration</strong><br />{job.duration_days} days</div>}
                <div><strong>Status</strong><br />{job.status}</div>
              </div>

              <div className="detail-description">
                <h3>Description</h3>
                <p>{job.description || 'No description provided.'}</p>
              </div>

              {job.skills?.length > 0 && (
                <div className="dashboard-section">
                  <h3>Skills</h3>
                  <div className="job-skills">
                    {job.skills.map(s => (
                      <span key={s} className="skill-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
