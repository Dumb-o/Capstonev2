const user = AUTH.guard('Client');
if (!user) throw new Error('Not authenticated');

AUTH.populateNav(user);
AUTH.startTimer('session-badge');

loadDashboardStats();

// ─── Live Stats ───────────────────────────────────────────────────────────────
function loadDashboardStats() {
  const defaultContracts = [
    { status: 'active',    value: 3200, title: 'E-commerce UI Redesign',              milestones: [{status:'done'},{status:'done'},{status:'active'},{status:'pending'}] },
    { status: 'active',    value: 6500, title: 'Mobile App Development (React Native)',milestones: [{status:'done'},{status:'active'},{status:'pending'},{status:'pending'}] },
    { status: 'pending',   value: 1800, title: 'Brand Guidelines & Assets',           milestones: [{status:'pending'},{status:'pending'},{status:'pending'}] },
    { status: 'completed', value: 2400 },
    { status: 'draft',     value: 3500 },
  ];
  const customContracts = JSON.parse(localStorage.getItem('fl_contracts') || '[]');
  const allContracts    = [...defaultContracts, ...customContracts];

  const active  = allContracts.filter(c => c.status === 'active').length;
  const signed  = allContracts.filter(c => c.status === 'active' || c.status === 'completed').length;
  const pending = allContracts.filter(c => c.status === 'pending').length;
  const drafts  = allContracts.filter(c => c.status === 'draft').length;
  const locked  = allContracts.filter(c => c.status === 'active').reduce((s, c) => s + (c.value || 0), 0);
  const applied = JSON.parse(localStorage.getItem('fl_applied_jobs') || '[]').length;

  document.querySelector('.stats-grid .stat-card:nth-child(2) .s-val').textContent = active;
  document.querySelector('.stats-grid .stat-card:nth-child(3) .s-val').textContent = applied;
  document.querySelector('.stats-grid .stat-card:nth-child(4) .s-val').textContent = locked > 0 ? '$' + locked.toLocaleString() : '$0';

  document.querySelector('.cs-box.green .cs-val').textContent = signed;
  document.querySelector('.cs-box.amber .cs-val').textContent = pending;
  document.querySelector('.cs-box.gray  .cs-val').textContent = drafts;

  // Update progress bars from live contract data
  const activeWithMs = allContracts.filter(c => c.status === 'active' && c.milestones);
  const rows = document.querySelectorAll('.project-row');
  rows.forEach((row, i) => {
    const c = activeWithMs[i];
    if (!c) return;
    const pct   = Math.round(c.milestones.filter(m => m.status === 'done').length / c.milestones.length * 100);
    const nameEl = row.querySelector('.project-name');
    const fillEl = row.querySelector('.prog-fill');
    const pctEl  = row.querySelector('.project-pct');
    if (c.title && nameEl) nameEl.textContent = c.title;
    if (fillEl)            fillEl.style.width = pct + '%';
    if (pctEl)             pctEl.textContent  = pct + '%';
  });
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function doLogout() {
  AUTH.logout();
  showToast('You have been logged out.', '👋');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  t.querySelector('.toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}