import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Loading from '../components/shared/Loading';
import api from '../services/api';

export default function ExploreJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/jobs', { params: { status: 'open', limit: 50 } });
        setJobs(data.jobs || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const filtered = jobs.filter((j) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          <div className="page-header">
            <h2>Explore Jobs</h2>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No jobs available right now.</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {filtered.map((job) => (
                <div key={job.id} className="job-card">
                  <h3>{job.title}</h3>
                  <p className="job-desc">{job.description?.slice(0, 200)}</p>
                  <div className="job-meta">
                    <span className="job-budget">{job.budget} ETH</span>
                    {job.category && <span className="job-category">{job.category}</span>}
                    {job.duration_days && <span>{job.duration_days} days</span>}
                  </div>
                  {job.skills?.length > 0 && (
                    <div className="job-skills">
                      {job.skills.map((s) => (
                        <span key={s} className="skill-tag">{s}</span>
                      ))}
                    </div>
                  )}
                  <Link to={`/jobs/${job.id}`} className="btn btn-sm btn-outline">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
