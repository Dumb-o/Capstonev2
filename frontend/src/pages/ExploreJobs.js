import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/shared/Navbar';
import Loading from '../components/shared/Loading';
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

export default function ExploreJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = { status: 'open', limit: 50 };
        if (category) params.category = category;
        if (search) params.search = search;
        const { data } = await api.get('/jobs', { params });
        setJobs(data.jobs || []);
      } catch {}
      setLoading(false);
    }
    load();
  }, [category, search]);

  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <main className="main-content" style={{ padding: 0 }}>
          <div className="page-body">
            <div className="page-header">
              <div>
                <h1 className="page-title">Explore Jobs</h1>
                <p className="page-sub">Find the perfect opportunity — <span>{jobs.length} jobs available</span></p>
              </div>
            </div>

            <div className="filters-bar">
              <div className="search-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input className="search-input" type="text" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {Object.keys(catColors).map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
              </select>
            </div>

            {loading ? (
              <Loading />
            ) : jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No jobs found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="jobs-grid">
                {jobs.map((job) => (
                  <Link to={`/jobs/${job.id}`} key={job.id} className="job-card" style={{ textDecoration: 'none' }}>
                    <div className="job-card-top">
                      {job.category && (
                        <span className={`job-category ${catColors[job.category] || 'cat-development'}`}>
                          {job.category}
                        </span>
                      )}
                    </div>
                    <div className="job-title">{job.title}</div>
                    <div className="job-desc">{job.description?.slice(0, 200)}</div>
                    {job.skills?.length > 0 && (
                      <div className="job-skills">
                        {job.skills.slice(0, 4).map((s) => (
                          <span key={s} className="skill-tag">{s}</span>
                        ))}
                        {job.skills.length > 4 && <span className="skill-tag">+{job.skills.length - 4}</span>}
                      </div>
                    )}
                    <div className="job-footer">
                      <span className="job-budget">{job.budget} ETH</span>
                      <div className="job-meta">
                        <span className="job-meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {job.duration_days ? `${job.duration_days}d` : 'Flexible'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
