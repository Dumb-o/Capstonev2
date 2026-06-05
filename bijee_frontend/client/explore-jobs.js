// ── Auth Guard ────────────────────────────────────────────────────────────────
const user = JSON.parse(sessionStorage.getItem('fl_user') || 'null');
if (!user) window.location.href = '../freeledger/login.html';

// Populate nav
(function () {
  const name = user?.name || 'User';
  const role = user?.role || 'Member';
  document.getElementById('dash-uname').textContent  = name.split(' ')[0];
  document.getElementById('dash-urole').textContent  = role;
  document.getElementById('dash-avatar').textContent = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('dash-tag').textContent    = role.toUpperCase() + ' PORTAL';
})();

// ── Job Data ──────────────────────────────────────────────────────────────────
const JOBS_KEY = 'fl_jobs';

const DEFAULT_JOBS = [
  {
    id: 1, title: 'Build a DeFi Yield Aggregator Dashboard',
    category: 'Development', type: 'Milestone',
    budget: 4500, budgetDisplay: '$4,500',
    desc: 'We need a full-stack developer to build a real-time DeFi dashboard that aggregates yield farming opportunities across multiple chains. Must integrate with Web3.js and display APY, TVL, and risk scores.',
    skills: ['React', 'Web3.js', 'Solidity', 'Node.js'],
    client: 'DeFi Labs', clientInitials: 'DL', clientColor: '#6366f1',
    applicants: 12, daysLeft: 5, posted: '2 days ago', isNew: true,
    saved: false, applied: false,
  },
  {
    id: 2, title: 'Smart Contract Audit & Security Review',
    category: 'Smart Contracts', type: 'Fixed Price',
    budget: 2800, budgetDisplay: '$2,800',
    desc: 'Looking for an experienced smart contract auditor to review our ERC-20 token and staking contracts for vulnerabilities, gas optimizations, and best practices compliance.',
    skills: ['Solidity', 'Security', 'Hardhat', 'OpenZeppelin'],
    client: 'TokenForge', clientInitials: 'TF', clientColor: '#10b981',
    applicants: 7, daysLeft: 8, posted: '1 day ago', isNew: true,
    saved: false, applied: false,
  },
  {
    id: 3, title: 'NFT Marketplace UI/UX Redesign',
    category: 'Design', type: 'Fixed Price',
    budget: 1800, budgetDisplay: '$1,800',
    desc: 'Our NFT marketplace needs a fresh redesign. We want a clean, modern aesthetic that makes browsing and listing NFTs effortless. Deliverables include Figma prototypes + final assets.',
    skills: ['Figma', 'UI/UX', 'Web3', 'Prototyping'],
    client: 'ArtChain', clientInitials: 'AC', clientColor: '#f59e0b',
    applicants: 19, daysLeft: 12, posted: '3 days ago', isNew: false,
    saved: false, applied: false,
  },
  {
    id: 4, title: 'Web3 Growth Marketing Strategy',
    category: 'Marketing', type: 'Hourly',
    budget: 95, budgetDisplay: '$95/hr',
    desc: 'Seeking an experienced Web3 marketing specialist to grow our community from 5K to 50K members. Experience with Discord, Twitter/X growth, and tokenomics-driven campaigns required.',
    skills: ['Community', 'Twitter/X', 'Discord', 'Tokenomics'],
    client: 'MetaVerse Co', clientInitials: 'MV', clientColor: '#ef4444',
    applicants: 8, daysLeft: 20, posted: '5 days ago', isNew: false,
    saved: false, applied: false,
  },
  {
    id: 5, title: 'DAO Governance Documentation & Whitepaper',
    category: 'Writing', type: 'Fixed Price',
    budget: 1200, budgetDisplay: '$1,200',
    desc: 'We need a technical writer to document our DAO governance model, voting mechanisms, and token economics. Must be comfortable writing for both technical and non-technical audiences.',
    skills: ['Technical Writing', 'DAO', 'Tokenomics', 'Research'],
    client: 'OpenGov DAO', clientInitials: 'OG', clientColor: '#8b5cf6',
    applicants: 5, daysLeft: 14, posted: '4 days ago', isNew: false,
    saved: false, applied: false,
  },
  {
    id: 6, title: 'On-chain Analytics Dashboard (Dune / Subgraph)',
    category: 'Data & Analytics', type: 'Milestone',
    budget: 3200, budgetDisplay: '$3,200',
    desc: 'Build custom on-chain analytics using The Graph subgraphs and Dune Analytics. Track protocol metrics, wallet behavior, and liquidity flows. Deliverables include live dashboard + API.',
    skills: ['The Graph', 'Dune', 'SQL', 'GraphQL', 'Python'],
    client: 'ChainMetrics', clientInitials: 'CM', clientColor: '#0ea5e9',
    applicants: 4, daysLeft: 10, posted: '1 week ago', isNew: false,
    saved: false, applied: false,
  },
  {
    id: 7, title: 'Cross-chain Bridge Frontend Integration',
    category: 'Development', type: 'Fixed Price',
    budget: 5500, budgetDisplay: '$5,500',
    desc: 'Implement a frontend for our cross-chain asset bridge supporting Ethereum, BSC, and Polygon. Must handle wallet connections, transaction status tracking, and error handling gracefully.',
    skills: ['React', 'Ethers.js', 'TypeScript', 'Wagmi'],
    client: 'BridgeProtocol', clientInitials: 'BP', clientColor: '#d97706',
    applicants: 15, daysLeft: 7, posted: '6 days ago', isNew: false,
    saved: false, applied: false,
  },
  {
    id: 8, title: 'Crypto Brand Identity & Visual System',
    category: 'Design', type: 'Fixed Price',
    budget: 2200, budgetDisplay: '$2,200',
    desc: 'Create a full brand identity for a new Layer 2 protocol — logo, color palette, typography, icon set, and brand guidelines. We want something bold, modern, and memorable.',
    skills: ['Branding', 'Illustrator', 'Logo Design', 'Typography'],
    client: 'L2 Protocol', clientInitials: 'L2', clientColor: '#14b8a6',
    applicants: 22, daysLeft: 3, posted: '2 weeks ago', isNew: false,
    saved: false, applied: false,
  },
];

// Load jobs (custom ones from localStorage merged with defaults)
function loadJobs() {
  const custom = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
  return [...DEFAULT_JOBS, ...custom];
}
function saveCustomJob(job) {
  const custom = JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
  custom.push(job);
  localStorage.setItem(JOBS_KEY, JSON.stringify(custom));
}

let allJobs = loadJobs();
let currentView = 'grid';
let savedJobs = JSON.parse(localStorage.getItem('fl_saved_jobs') || '[]');
let appliedJobs = JSON.parse(localStorage.getItem('fl_applied_jobs') || '[]');

// ── Render ────────────────────────────────────────────────────────────────────
function getCategoryClass(cat) {
  return 'cat-' + cat.toLowerCase().replace(/[^a-z]/g, '-').replace(/-+/g, '-');
}

function renderJobs(jobs) {
  const container = document.getElementById('jobs-container');
  const empty     = document.getElementById('empty-state');
  document.getElementById('job-count').textContent = jobs.length;

  if (jobs.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = jobs.map(job => {
    const isSaved   = savedJobs.includes(job.id);
    const isApplied = appliedJobs.includes(job.id);
    const listClass = currentView === 'list' ? 'list-view' : '';
    return `
      <div class="job-card ${listClass}" onclick="openJobModal(${job.id})">
        ${job.isNew ? '<span class="job-new-badge">NEW</span>' : ''}
        <div class="job-card-top">
          <span class="job-category ${getCategoryClass(job.category)}">${job.category}</span>
          <button class="job-save-btn ${isSaved ? 'saved' : ''}"
            onclick="toggleSave(event, ${job.id})" title="${isSaved ? 'Unsave' : 'Save'}">
            ${isSaved ? '★' : '☆'}
          </button>
        </div>
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-desc">${job.desc}</div>
        </div>
        <div class="job-skills">
          ${job.skills.slice(0,4).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
        <div class="job-footer">
          <div>
            <div class="job-budget">${job.budgetDisplay}</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:2px">${job.type}</div>
          </div>
          <div class="job-meta">
            <div class="job-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              ${job.applicants} applied
            </div>
            <div class="job-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${job.daysLeft}d left
            </div>
            ${isApplied ? '<span style="font-size:11px;font-weight:700;color:var(--green)">✓ Applied</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Filter ────────────────────────────────────────────────────────────────────
function filterJobs() {
  const search = document.getElementById('job-search').value.toLowerCase();
  const cat    = document.getElementById('filter-category').value;
  const budget = document.getElementById('filter-budget').value;
  const type   = document.getElementById('filter-type').value;

  const filtered = allJobs.filter(job => {
    const matchSearch = !search || job.title.toLowerCase().includes(search)
      || job.desc.toLowerCase().includes(search)
      || job.skills.some(s => s.toLowerCase().includes(search));
    const matchCat  = !cat    || job.category === cat;
    const matchType = !type   || job.type === type;
    const matchBudget = !budget || checkBudget(job.budget, budget);
    return matchSearch && matchCat && matchType && matchBudget;
  });

  renderJobs(filtered);
  renderFilterTags();
}

function checkBudget(b, range) {
  if (range === '0-500')     return b < 500;
  if (range === '500-2000')  return b >= 500 && b < 2000;
  if (range === '2000-5000') return b >= 2000 && b < 5000;
  if (range === '5000+')     return b >= 5000;
  return true;
}

function clearFilters() {
  document.getElementById('job-search').value   = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-budget').value   = '';
  document.getElementById('filter-type').value     = '';
  renderJobs(allJobs);
  renderFilterTags();
}

function renderFilterTags() {
  const cat    = document.getElementById('filter-category').value;
  const budget = document.getElementById('filter-budget').value;
  const type   = document.getElementById('filter-type').value;
  const tags = [];
  if (cat)    tags.push({ label: cat,    clear: () => { document.getElementById('filter-category').value=''; filterJobs(); } });
  if (budget) tags.push({ label: budget, clear: () => { document.getElementById('filter-budget').value='';   filterJobs(); } });
  if (type)   tags.push({ label: type,   clear: () => { document.getElementById('filter-type').value='';     filterJobs(); } });
  const el = document.getElementById('active-filters');
  el.innerHTML = tags.map((t,i) => `
    <span class="filter-tag">${t.label}
      <button onclick="clearTag(${i})">×</button>
    </span>`).join('');
  window._filterTagClearFns = tags.map(t => t.clear);
}
function clearTag(i) { window._filterTagClearFns[i](); }

// ── View Toggle ───────────────────────────────────────────────────────────────
function setView(v) {
  currentView = v;
  document.getElementById('view-grid').classList.toggle('active', v === 'grid');
  document.getElementById('view-list').classList.toggle('active', v === 'list');
  document.getElementById('jobs-container').classList.toggle('list-view', v === 'list');
  filterJobs();
}

// ── Save / Apply ──────────────────────────────────────────────────────────────
function toggleSave(e, id) {
  e.stopPropagation();
  if (savedJobs.includes(id)) savedJobs = savedJobs.filter(x => x !== id);
  else savedJobs.push(id);
  localStorage.setItem('fl_saved_jobs', JSON.stringify(savedJobs));
  filterJobs();
}

function applyToJob(id) {
  if (appliedJobs.includes(id)) { showToast('You already applied to this job.', 'ℹ️'); return; }
  appliedJobs.push(id);
  localStorage.setItem('fl_applied_jobs', JSON.stringify(appliedJobs));
  // Increment applicant count
  const job = allJobs.find(j => j.id === id);
  if (job) job.applicants++;
  filterJobs();
  closeJobModal();
  showToast('Application submitted! 🎉');
}

// ── Job Modal ─────────────────────────────────────────────────────────────────
function openJobModal(id) {
  const job = allJobs.find(j => j.id === id);
  if (!job) return;
  const isApplied = appliedJobs.includes(id);
  const isSaved   = savedJobs.includes(id);

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-cat-row">
      <span class="job-category ${getCategoryClass(job.category)}">${job.category}</span>
      <span style="font-size:12px;color:var(--text-3)">${job.posted}</span>
    </div>
    <div class="modal-title">${job.title}</div>
    <div class="modal-client">
      <div class="client-avatar" style="background:${job.clientColor}">${job.clientInitials}</div>
      <span>Posted by <strong>${job.client}</strong></span>
      <span style="color:var(--text-3)">·</span>
      <span>${job.applicants} applicants</span>
    </div>

    <div class="modal-meta-grid" style="margin-bottom:20px">
      <div class="modal-meta-box">
        <div class="lbl">Budget</div>
        <div class="val" style="color:var(--blue)">${job.budgetDisplay}</div>
      </div>
      <div class="modal-meta-box">
        <div class="lbl">Contract Type</div>
        <div class="val">${job.type}</div>
      </div>
      <div class="modal-meta-box">
        <div class="lbl">Deadline</div>
        <div class="val">${job.daysLeft} days left</div>
      </div>
      <div class="modal-meta-box">
        <div class="lbl">Category</div>
        <div class="val">${job.category}</div>
      </div>
    </div>

    <div class="modal-section">
      <h4>Project Description</h4>
      <p>${job.desc}</p>
    </div>

    <div class="modal-section">
      <h4>Required Skills</h4>
      <div class="job-skills" style="margin-top:4px">
        ${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-primary" style="flex:1"
        onclick="applyToJob(${id})" ${isApplied ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
        ${isApplied ? '✓ Already Applied' : 'Apply Now →'}
      </button>
      <button class="btn btn-outline" onclick="toggleSave(event,${id});rerenderModal(${id})"
        style="min-width:44px;justify-content:center">
        ${isSaved ? '★' : '☆'}
      </button>
    </div>
  `;
  document.getElementById('job-modal').classList.add('open');
}

function rerenderModal(id) { openJobModal(id); }
function closeJobModal() { document.getElementById('job-modal').classList.remove('open'); }
function closeModal(e) { if (e.target === e.currentTarget) closeJobModal(); }

// ── Post Project Modal ────────────────────────────────────────────────────────
function openPostModal() {
  document.getElementById('post-modal').classList.add('open');
}
function closePostModal(e) {
  if (e.target === e.currentTarget) document.getElementById('post-modal').classList.remove('open');
}
function submitPost() {
  const title  = document.getElementById('post-title').value.trim();
  const cat    = document.getElementById('post-category').value;
  const desc   = document.getElementById('post-desc').value.trim();
  const budget = parseFloat(document.getElementById('post-budget').value) || 0;
  const type   = document.getElementById('post-type').value;
  const skills = document.getElementById('post-skills').value.split(',').map(s=>s.trim()).filter(Boolean);

  if (!title || !desc) { showToast('Title and description are required.', '⚠️'); return; }

  const newJob = {
    id: Date.now(), title, category: cat, type,
    budget, budgetDisplay: budget >= 1000 ? `$${(budget/1000).toFixed(1)}K` : `$${budget}`,
    desc, skills, client: user.name, clientInitials: user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    clientColor: '#2563eb', applicants: 0, daysLeft: 30,
    posted: 'Just now', isNew: true, saved: false, applied: false,
  };

  saveCustomJob(newJob);
  allJobs = loadJobs();
  document.getElementById('post-modal').classList.remove('open');
  filterJobs();
  showToast('Project posted successfully! 🚀');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function doLogout() {
  sessionStorage.removeItem('fl_user');
  window.location.href = '../freeledger/login.html';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  t.querySelector('.toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderJobs(allJobs);
