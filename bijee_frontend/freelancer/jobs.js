// const user = AUTH.guard('Freelancer');
// if (!user) throw new Error('Not authenticated');
// Comment these out:
// const user = AUTH.guard('Freelancer');
// if (!user) throw new Error('Not authenticated');

// Add this temporary "Fake" user so the page doesn't crash:
const user = {
  name: "Developer Mode",
  role: "Freelancer",
  avatar: "D"
};

AUTH.populateNav(user);
AUTH.startTimer('session-timer');
document.getElementById('greeting-name').textContent = user.name.split(' ')[0];

const JOBS = [
  { id:1, title:'Build a DeFi Yield Aggregator Dashboard', category:'Development', type:'Milestone', budget:4500, budgetDisplay:'$4,500', desc:'We need a full-stack developer to build a real-time DeFi dashboard aggregating yield farming opportunities across multiple chains. Must integrate with Web3.js and display APY, TVL, and risk scores.', skills:['React','Web3.js','Solidity','Node.js'], client:'DeFi Labs', clientInitials:'DL', clientColor:'#6366f1', applicants:12, daysLeft:5, posted:'2 days ago', isNew:true },
  { id:2, title:'Smart Contract Audit & Security Review', category:'Smart Contracts', type:'Fixed Price', budget:2800, budgetDisplay:'$2,800', desc:'Looking for an experienced smart contract auditor to review our ERC-20 token and staking contracts for vulnerabilities, gas optimizations, and best practices compliance.', skills:['Solidity','Security','Hardhat','OpenZeppelin'], client:'TokenForge', clientInitials:'TF', clientColor:'#10b981', applicants:7, daysLeft:8, posted:'1 day ago', isNew:true },
  { id:3, title:'NFT Marketplace UI/UX Redesign', category:'Design', type:'Fixed Price', budget:1800, budgetDisplay:'$1,800', desc:'Our NFT marketplace needs a fresh redesign. Deliverables include Figma prototypes and final production-ready assets.', skills:['Figma','UI/UX','Web3','Prototyping'], client:'ArtChain', clientInitials:'AC', clientColor:'#f59e0b', applicants:19, daysLeft:12, posted:'3 days ago', isNew:false },
  { id:4, title:'Web3 Growth Marketing Strategy', category:'Marketing', type:'Hourly', budget:95, budgetDisplay:'$95/hr', desc:'Seeking an experienced Web3 marketing specialist to grow our community from 5K to 50K members. Discord, Twitter/X and tokenomics campaign experience required.', skills:['Community','Twitter/X','Discord','Tokenomics'], client:'MetaVerse Co', clientInitials:'MV', clientColor:'#ef4444', applicants:8, daysLeft:20, posted:'5 days ago', isNew:false },
  { id:5, title:'DAO Governance Documentation & Whitepaper', category:'Writing', type:'Fixed Price', budget:1200, budgetDisplay:'$1,200', desc:'We need a technical writer to document our DAO governance model, voting mechanisms, and token economics for both technical and non-technical audiences.', skills:['Technical Writing','DAO','Tokenomics','Research'], client:'OpenGov DAO', clientInitials:'OG', clientColor:'#8b5cf6', applicants:5, daysLeft:14, posted:'4 days ago', isNew:false },
  { id:6, title:'On-chain Analytics Dashboard', category:'Data & Analytics', type:'Milestone', budget:3200, budgetDisplay:'$3,200', desc:'Build custom on-chain analytics using The Graph subgraphs and Dune Analytics. Track protocol metrics, wallet behavior, and liquidity flows.', skills:['The Graph','Dune','SQL','GraphQL','Python'], client:'ChainMetrics', clientInitials:'CM', clientColor:'#0ea5e9', applicants:4, daysLeft:10, posted:'1 week ago', isNew:false },
  { id:7, title:'Cross-chain Bridge Frontend Integration', category:'Development', type:'Fixed Price', budget:5500, budgetDisplay:'$5,500', desc:'Implement a frontend for our cross-chain asset bridge supporting Ethereum, BSC, and Polygon with wallet connections and transaction status tracking.', skills:['React','Ethers.js','TypeScript','Wagmi'], client:'BridgeProtocol', clientInitials:'BP', clientColor:'#d97706', applicants:15, daysLeft:7, posted:'6 days ago', isNew:false },
  { id:8, title:'Crypto Brand Identity & Visual System', category:'Design', type:'Fixed Price', budget:2200, budgetDisplay:'$2,200', desc:'Create a full brand identity for a new Layer 2 protocol — logo, palette, typography, icon set, and brand guidelines.', skills:['Branding','Illustrator','Logo Design','Typography'], client:'L2 Protocol', clientInitials:'L2', clientColor:'#14b8a6', applicants:22, daysLeft:3, posted:'2 weeks ago', isNew:false },
];

let appliedJobs = JSON.parse(localStorage.getItem('fl_applied_jobs') || '[]');
let savedJobs   = JSON.parse(localStorage.getItem('fl_saved_jobs_fl') || '[]');
let mySkills    = (JSON.parse(localStorage.getItem('fl_freelancer_profile') || '{}').skills || []).map(s => s.toLowerCase());
let currentView = 'grid';

function catClass(cat) { return 'cat-' + cat.toLowerCase().replace(/[^a-z]/g,'-').replace(/-+/g,'-'); }
function matchCount(job) { return job.skills.filter(s => mySkills.includes(s.toLowerCase())).length; }
function matchPct(job) { return mySkills.length > 0 ? Math.round(matchCount(job)/job.skills.length*100) : 0; }

function renderJobs(jobs) {
  const grid  = document.getElementById('jobs-grid');
  const empty = document.getElementById('empty-state');
  document.getElementById('job-count').textContent = jobs.length;

  if (!jobs.length) { grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  grid.className = 'jobs-grid' + (currentView==='list' ? ' list-view' : '');

  grid.innerHTML = jobs.map(job => {
    const isApplied = appliedJobs.includes(job.id);
    const isSaved   = savedJobs.includes(job.id);
    const mp        = matchPct(job);

    return `
      <div class="job-card ${isApplied?'applied':''} ${currentView==='list'?'list-card':''}" onclick="openModal(${job.id})">
        ${job.isNew ? '<span class="new-tag">NEW</span>' : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <span class="job-category ${catClass(job.category)}">${job.category}</span>
          <div style="display:flex;align-items:center;gap:6px">
            ${mp>0 ? `<span class="match-badge">${mp}% match</span>` : ''}
            ${isApplied ? `<span class="applied-badge">✓ Applied</span>` : ''}
            <button class="job-save-btn ${isSaved?'saved':''}" onclick="toggleSave(event,${job.id})">${isSaved?'★':'☆'}</button>
          </div>
        </div>
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-desc" style="margin-top:6px">${job.desc}</div>
        </div>
        <div class="job-skills">
          ${job.skills.map(s=>`<span class="skill-tag ${mySkills.includes(s.toLowerCase())?'match':''}">${s}</span>`).join('')}
        </div>
        <div class="job-footer">
          <div>
            <div class="job-budget">${job.budgetDisplay}</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:2px">${job.type}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:12px;color:var(--text-3)">👥 ${job.applicants}</span>
            <span style="font-size:12px;color:var(--text-3)">⏱ ${job.daysLeft}d left</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterJobs() {
  const q      = document.getElementById('search').value.toLowerCase();
  const cat    = document.getElementById('f-cat').value;
  const budget = document.getElementById('f-budget').value;
  const match  = document.getElementById('f-match').value;

  const out = JOBS.filter(j => {
    if (q && !j.title.toLowerCase().includes(q) && !j.skills.some(s=>s.toLowerCase().includes(q))) return false;
    if (cat && j.category !== cat) return false;
    if (budget === '0-500'     && j.budget >= 500)                        return false;
    if (budget === '500-2000'  && (j.budget<500||j.budget>=2000))         return false;
    if (budget === '2000-5000' && (j.budget<2000||j.budget>=5000))        return false;
    if (budget === '5000+'     && j.budget < 5000)                         return false;
    if (match === 'match'   && matchCount(j) === 0)                        return false;
    if (match === 'saved'   && !savedJobs.includes(j.id))                  return false;
    if (match === 'applied' && !appliedJobs.includes(j.id))                return false;
    return true;
  });
  renderJobs(out);
}

function clearFilters() {
  ['search','f-cat','f-budget','f-match'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
  });
  renderJobs(JOBS);
}

function setView(v) {
  currentView = v;
  document.getElementById('btn-grid').classList.toggle('active', v==='grid');
  document.getElementById('btn-list').classList.toggle('active', v==='list');
  filterJobs();
}

function toggleSave(e, id) {
  e.stopPropagation();
  savedJobs = savedJobs.includes(id) ? savedJobs.filter(x=>x!==id) : [...savedJobs, id];
  localStorage.setItem('fl_saved_jobs_fl', JSON.stringify(savedJobs));
  filterJobs();
}

function applyToJob(id) {
  if (appliedJobs.includes(id)) { showToast('Already applied!','ℹ️'); return; }
  appliedJobs.push(id);
  localStorage.setItem('fl_applied_jobs', JSON.stringify(appliedJobs));
  closeModal();
  filterJobs();
  showToast('Application submitted! 🎉');
}

function openModal(id) {
  const job     = JOBS.find(j=>j.id===id);
  if (!job) return;
  const isApplied = appliedJobs.includes(id);
  const mp        = matchPct(job);

  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span class="job-category ${catClass(job.category)}">${job.category}</span>
      ${mp>0?`<span class="match-badge">${mp}% skill match</span>`:''}
      <span style="font-size:12px;color:var(--text-3)">${job.posted}</span>
    </div>
    <div style="font-size:20px;font-weight:800;letter-spacing:-.5px;margin-bottom:10px">${job.title}</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:28px;height:28px;border-radius:50%;background:${job.clientColor};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${job.clientInitials}</div>
      <span style="font-size:13px;color:var(--text-2)">Posted by <strong>${job.client}</strong> · ${job.applicants} applicants</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:4px">Budget</div>
        <div style="font-size:18px;font-weight:800;color:var(--accent)">${job.budgetDisplay}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:4px">Type</div>
        <div style="font-size:16px;font-weight:800">${job.type}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:4px">Deadline</div>
        <div style="font-size:16px;font-weight:800">${job.daysLeft} days left</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:4px">Your Match</div>
        <div style="font-size:16px;font-weight:800;color:${mp>0?'var(--accent)':'var(--text-3)'}">${mp>0?mp+'%':'—'}</div>
      </div>
    </div>
    <div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin-bottom:8px">Description</div>
      <p style="font-size:14px;color:var(--text-2);line-height:1.7">${job.desc}</p>
    </div>
    <div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin-bottom:8px">Required Skills</div>
      <div class="job-skills">${job.skills.map(s=>`<span class="skill-tag ${mySkills.includes(s.toLowerCase())?'match':''}">${s}</span>`).join('')}</div>
    </div>
    <div style="display:flex;gap:10px;padding-top:20px;border-top:1px solid var(--border)">
      <button class="btn btn-primary" style="flex:1" onclick="applyToJob(${id})" ${isApplied?'disabled style="opacity:.5;cursor:not-allowed"':''}>
        ${isApplied ? '✓ Already Applied' : 'Apply Now →'}
      </button>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('job-modal').classList.add('open');
}
function closeModal() { document.getElementById('job-modal').classList.remove('open'); }

// Init — refresh skills in case profile was just updated
mySkills = (JSON.parse(localStorage.getItem('fl_freelancer_profile') || '{}').skills || []).map(s => s.toLowerCase());
renderJobs(JOBS);
