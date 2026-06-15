// ── Auth Guard ────────────────────────────────────────────────────────────────
const user = JSON.parse(sessionStorage.getItem('fl_user') || 'null');
if (!user) window.location.href = '../freeledger/login.html';

(function () {
  const name = user?.name || 'User';
  const role = user?.role || 'Member';
  document.getElementById('dash-uname').textContent  = name.split(' ')[0];
  document.getElementById('dash-urole').textContent  = role;
  document.getElementById('dash-avatar').textContent = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('dash-tag').textContent    = role.toUpperCase() + ' PORTAL';
})();

// ── Contract Data ─────────────────────────────────────────────────────────────
const CONTRACTS_KEY = 'fl_contracts';

const DEFAULT_CONTRACTS = [
  {
    id: 1,
    title: 'E-commerce UI Redesign',
    freelancer: 'Alex Rivera', freelancerInitials: 'AR', freelancerColor: '#6366f1',
    freelancerRole: 'UI/UX Designer',
    value: 3200, status: 'active',
    startDate: '2024-01-10', dueDate: '2024-02-28',
    milestones: [
      { label: 'Research & Discovery', amount: 600, status: 'done' },
      { label: 'Wireframes', amount: 800, status: 'done' },
      { label: 'High-Fidelity Designs', amount: 1000, status: 'active' },
      { label: 'Dev Handoff & Assets', amount: 800, status: 'pending' },
    ],
    txHash: '0xabc123...def456',
    notes: 'Alex is delivering excellent work. High-fidelity designs are in review.',
  },
  {
    id: 2,
    title: 'Mobile App Development (React Native)',
    freelancer: 'Sarah Chen', freelancerInitials: 'SC', freelancerColor: '#10b981',
    freelancerRole: 'Full Stack Dev',
    value: 6500, status: 'active',
    startDate: '2024-01-15', dueDate: '2024-03-15',
    milestones: [
      { label: 'Project Setup & Architecture', amount: 1000, status: 'done' },
      { label: 'Backend Integration', amount: 2000, status: 'active' },
      { label: 'UI Components', amount: 2000, status: 'pending' },
      { label: 'Testing & Launch', amount: 1500, status: 'pending' },
    ],
    txHash: '0xdef789...abc012',
    notes: 'Backend integration is underway. On track.',
  },
  {
    id: 3,
    title: 'Brand Guidelines & Assets',
    freelancer: 'Maya Patel', freelancerInitials: 'MP', freelancerColor: '#ef4444',
    freelancerRole: 'Graphic Designer',
    value: 1800, status: 'pending',
    startDate: '2024-02-01', dueDate: '2024-02-20',
    milestones: [
      { label: 'Mood Boards & Concepts', amount: 400, status: 'pending' },
      { label: 'Logo & Identity', amount: 800, status: 'pending' },
      { label: 'Brand Guidelines PDF', amount: 600, status: 'pending' },
    ],
    txHash: null,
    notes: 'Awaiting Maya\'s signature to begin.',
  },
  {
    id: 4,
    title: 'SEO & Content Strategy',
    freelancer: 'Jordan Smith', freelancerInitials: 'JS', freelancerColor: '#f59e0b',
    freelancerRole: 'Marketing',
    value: 2400, status: 'completed',
    startDate: '2023-11-01', dueDate: '2023-12-31',
    milestones: [
      { label: 'Keyword Research', amount: 600, status: 'done' },
      { label: 'Content Plan', amount: 800, status: 'done' },
      { label: 'On-Page Optimisation', amount: 1000, status: 'done' },
    ],
    txHash: '0x111aaa...222bbb',
    notes: 'Completed ahead of schedule. Great results.',
  },
  {
    id: 5,
    title: 'Smart Contract Audit Draft',
    freelancer: 'TBD', freelancerInitials: '?', freelancerColor: '#94a3b8',
    freelancerRole: 'Security Researcher',
    value: 3500, status: 'draft',
    startDate: null, dueDate: null,
    milestones: [
      { label: 'Static Analysis', amount: 1000, status: 'pending' },
      { label: 'Manual Review', amount: 1500, status: 'pending' },
      { label: 'Report & Remediation', amount: 1000, status: 'pending' },
    ],
    txHash: null,
    notes: 'Draft — awaiting freelancer selection.',
  },
];

function loadContracts() {
  const custom = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || '[]');
  return [...DEFAULT_CONTRACTS, ...custom];
}
function saveCustomContract(c) {
  const list = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || '[]');
  list.push(c);
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list));
}

let allContracts  = loadContracts();
let currentFilter = 'all';

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  const active    = allContracts.filter(c => c.status === 'active');
  const completed = allContracts.filter(c => c.status === 'completed');
  const locked    = active.reduce((s, c) => s + c.value, 0);

  document.getElementById('stat-total').textContent     = allContracts.length;
  document.getElementById('stat-active').textContent    = active.length;
  document.getElementById('stat-locked').textContent    = '$' + locked.toLocaleString();
  document.getElementById('stat-completed').textContent = completed.length;
  document.getElementById('stat-completed-sub').textContent = completed.length > 0
    ? `$${completed.reduce((s,c)=>s+c.value,0).toLocaleString()} paid out` : '—';
  document.getElementById('stat-active-badge').textContent = active.length > 0 ? 'In progress' : 'None active';
}

// ── Render ────────────────────────────────────────────────────────────────────
function getProgress(milestones) {
  const done = milestones.filter(m => m.status === 'done').length;
  return Math.round((done / milestones.length) * 100);
}

function renderContracts(contracts) {
  const list  = document.getElementById('contracts-list');
  const empty = document.getElementById('contracts-empty');
  if (contracts.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.innerHTML = contracts.map(c => {
    const progress = getProgress(c.milestones);
    const doneMs   = c.milestones.filter(m => m.status === 'done').length;
    return `
      <div class="contract-card" onclick="openContractModal(${c.id})">
        <div class="contract-main">
          <div class="contract-header">
            <span class="contract-title">${c.title}</span>
            <span class="status-badge status-${c.status}">${statusLabel(c.status)}</span>
          </div>
          <div class="contract-meta">
            <span class="contract-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
              ${c.freelancer}
            </span>
            ${c.startDate ? `<span class="contract-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Due ${c.dueDate}
            </span>` : ''}
            <span class="contract-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              ${doneMs}/${c.milestones.length} milestones
            </span>
          </div>
          <div class="milestones">
            ${c.milestones.slice(0,3).map(m => `
              <div class="milestone-row">
                <div class="ms-dot ms-${m.status}"></div>
                <span class="ms-label">${m.label}</span>
                <span class="ms-amount">$${m.amount.toLocaleString()}</span>
              </div>
            `).join('')}
            ${c.milestones.length > 3 ? `<div style="font-size:12px;color:var(--text-3);margin-left:18px">+${c.milestones.length-3} more</div>` : ''}
          </div>
          ${c.status === 'active' ? `
            <div class="contract-progress">
              <div class="cp-label"><span>Overall Progress</span><span>${progress}%</span></div>
              <div class="cp-bar"><div class="cp-fill" style="width:${progress}%"></div></div>
            </div>` : ''}
        </div>
        <div class="contract-right">
          <div class="contract-value">$${c.value.toLocaleString()}</div>
          <div class="contract-value-sub">Contract value</div>
          <div class="contract-actions">
            ${c.status === 'active' ? `
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();releasePayment(${c.id})">Release Payment</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openContractModal(${c.id})">View Details</button>
            ` : c.status === 'pending' ? `
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();signContract(${c.id})">Sign Contract</button>
            ` : c.status === 'draft' ? `
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendForSignature(${c.id})">Send for Signature</button>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openContractModal(${c.id})">Edit Draft</button>
            ` : `
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openContractModal(${c.id})">View Details</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function statusLabel(s) {
  return { active: '● Active', pending: '◐ Pending Signature', draft: '○ Draft', completed: '✓ Completed', disputed: '⚠ Disputed' }[s] || s;
}

// ── Filter by Status ──────────────────────────────────────────────────────────
function filterByStatus(status, btn) {
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = status;
  const filtered = status === 'all' ? allContracts : allContracts.filter(c => c.status === status);
  renderContracts(filtered);
}

// ── Actions ───────────────────────────────────────────────────────────────────
function releasePayment(id) {
  showToast('Payment release initiated via smart contract 🔒', '💸');
}
function signContract(id) {
  const c = allContracts.find(x => x.id === id);
  if (c) { c.status = 'active'; c.txHash = '0x' + Math.random().toString(16).slice(2,12) + '...'; }
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(allContracts.filter(c => c.id > 100)));
  renderContracts(allContracts);
  updateStats();
  showToast('Contract signed & escrowed on-chain! ✍️');
}
function sendForSignature(id) {
  const c = allContracts.find(x => x.id === id);
  if (c) c.status = 'pending';
  renderContracts(currentFilter === 'all' ? allContracts : allContracts.filter(c => c.status === currentFilter));
  updateStats();
  showToast('Contract sent for signature 📤');
}

// ── Contract Modal ────────────────────────────────────────────────────────────
function openContractModal(id) {
  const c = allContracts.find(x => x.id === id);
  if (!c) return;
  const progress = getProgress(c.milestones);

  document.getElementById('contract-modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span class="status-badge status-${c.status}">${statusLabel(c.status)}</span>
      ${c.txHash ? `<span style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace">${c.txHash}</span>` : ''}
    </div>
    <h2 style="font-size:20px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px">${c.title}</h2>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div class="cf-avatar" style="background:${c.freelancerColor}">${c.freelancerInitials}</div>
      <div>
        <div style="font-size:13px;font-weight:700">${c.freelancer}</div>
        <div style="font-size:12px;color:var(--text-3)">${c.freelancerRole}</div>
      </div>
    </div>

    <div class="escrow-box">
      <h4>Total Escrow Amount</h4>
      <div class="escrow-amount">$${c.value.toLocaleString()}</div>
      <div class="escrow-sub">Locked via smart contract · Released per milestone</div>
    </div>

    ${c.status === 'active' ? `
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:6px">
        <span>Overall Progress</span><span>${progress}%</span>
      </div>
      <div class="cp-bar"><div class="cp-fill" style="width:${progress}%"></div></div>
    </div>` : ''}

    <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin-bottom:12px">Milestones</h4>
    <div class="timeline">
      ${c.milestones.map(m => `
        <div class="timeline-item">
          <div class="tl-icon tl-${m.status}">${m.status==='done'?'✓':m.status==='active'?'▶':'○'}</div>
          <div class="tl-body">
            <div class="tl-title">${m.label}</div>
            <div class="tl-amount">$${m.amount.toLocaleString()}</div>
            <div class="tl-status">${m.status==='done'?'Completed & paid':m.status==='active'?'In progress':'Pending'}</div>
          </div>
        </div>
      `).join('')}
    </div>

    ${c.notes ? `
    <div style="margin-top:20px;padding:14px;background:var(--surface);border-radius:10px;border:1px solid var(--border)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin-bottom:6px">Notes</div>
      <div style="font-size:13px;color:var(--text-2)">${c.notes}</div>
    </div>` : ''}

    <div style="display:flex;gap:10px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">
      ${c.status==='active' ? `<button class="btn btn-primary" style="flex:1" onclick="releasePayment(${c.id})">Release Next Payment</button>` : ''}
      ${c.status==='pending' ? `<button class="btn btn-primary" style="flex:1" onclick="signContract(${c.id})">Sign & Activate Contract</button>` : ''}
      <button class="btn btn-outline" style="flex:1" onclick="document.getElementById('contract-modal').classList.remove('open')">Close</button>
    </div>
  `;
  document.getElementById('contract-modal').classList.add('open');
}

function closeContractModal(e) {
  if (e.target === e.currentTarget) document.getElementById('contract-modal').classList.remove('open');
}

// ── New Contract Modal ────────────────────────────────────────────────────────
function openNewContract() {
  document.getElementById('new-contract-modal').classList.add('open');
}
function closeNewModal(e) {
  if (e.target === e.currentTarget) document.getElementById('new-contract-modal').classList.remove('open');
}
function saveDraft() {
  createContract('draft');
}
function sendContract() {
  createContract('pending');
}
function createContract(status) {
  const title      = document.getElementById('nc-title').value.trim();
  const freelancer = document.getElementById('nc-freelancer').value.trim() || 'TBD';
  const value      = parseFloat(document.getElementById('nc-value').value) || 0;
  const due        = document.getElementById('nc-due').value;
  const msRaw      = document.getElementById('nc-milestones').value;

  if (!title) { showToast('Project title is required.', '⚠️'); return; }

  const milestones = msRaw.split('\n').filter(Boolean).map(line => {
    const parts = line.split('—');
    const amt   = parseFloat((parts[1] || '0').replace(/[^0-9.]/g,'')) || 0;
    return { label: parts[0].replace(/^Milestone \d+:\s*/,'').trim(), amount: amt, status: 'pending' };
  });

  const c = {
    id: Date.now(), title, freelancer, freelancerInitials: freelancer.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    freelancerColor: '#94a3b8', freelancerRole: '', value, status,
    startDate: status === 'active' ? new Date().toISOString().split('T')[0] : null,
    dueDate: due || null, milestones: milestones.length ? milestones : [{label:'Delivery', amount: value, status:'pending'}],
    txHash: null, notes: '',
  };

  saveCustomContract(c);
  allContracts = loadContracts();
  document.getElementById('new-contract-modal').classList.remove('open');
  filterByStatus(currentFilter, document.querySelector('.ctab.active'));
  updateStats();
  showToast(status === 'draft' ? 'Draft saved.' : 'Contract sent for signature! 📤');
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
updateStats();
renderContracts(allContracts);
