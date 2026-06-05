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

// ── Stats ──────────────────────────────────────────────────────────────────────
const PROFILE_KEY   = 'fl_freelancer_profile';
const CONTRACTS_KEY = 'fl_my_contracts';

const profile   = JSON.parse(localStorage.getItem(PROFILE_KEY)   || '{}');
const contracts = JSON.parse(localStorage.getItem(CONTRACTS_KEY) || '[]');
const applied   = JSON.parse(localStorage.getItem('fl_applied_jobs') || '[]').length;

const active    = contracts.filter(c=>c.status==='active');
const completed = contracts.filter(c=>c.status==='completed');
const earned    = completed.reduce((s,c)=>s+(c.value||0),0);

document.getElementById('stat-contracts').textContent = active.length;
document.getElementById('stat-applied').textContent   = applied;
document.getElementById('stat-earned').textContent    = earned>0?'$'+earned.toLocaleString():'$0';

// ── Active contracts list ──────────────────────────────────────────────────────
const el = document.getElementById('active-contracts');
if (active.length > 0) {
  el.innerHTML = active.map(c => {
    const pct = c.milestones ? Math.round(c.milestones.filter(m=>m.status==='done').length/c.milestones.length*100) : 0;
    return `
      <div class="project-row" onclick="location.href='contracts.html'" style="cursor:pointer">
        <div class="project-row-top">
          <span class="project-name">${c.title}</span>
          <span class="project-pct">${pct}%</span>
        </div>
        <div class="milestone-label">Client: ${c.client||'—'} · $${(c.value||0).toLocaleString()}</div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

// ── Skill match bars ───────────────────────────────────────────────────────────
const skills     = profile.skills || [];
const profilePct = Math.min(100, [profile.bio?20:0, profile.title?20:0, skills.length>0?20:0, profile.hourlyRate?20:0, profile.availability?20:0].reduce((a,b)=>a+b,0));
const skillPct   = Math.min(100, skills.length * 10);
const matchPct   = skills.length > 0 ? Math.min(95, 40 + skills.length * 8) : 0;

setTimeout(() => {
  document.getElementById('sm-profile').style.width = profilePct+'%';
  document.getElementById('sm-profile-pct').textContent = profilePct+'%';
  document.getElementById('sm-skills').style.width  = skillPct+'%';
  document.getElementById('sm-skills-pct').textContent  = skillPct+'%';
  document.getElementById('sm-match').style.width   = matchPct+'%';
  document.getElementById('sm-match-pct').textContent   = matchPct+'%';
}, 200);

// ── Reputation ─────────────────────────────────────────────────────────────────
document.getElementById('rep-score').textContent = completed.length > 0
  ? (3.5 + completed.length * 0.3).toFixed(1) + ' / 5.0' : 'New';

// ── Recommended jobs ───────────────────────────────────────────────────────────
const JOBS = [
  { id:1, title:'Build a DeFi Yield Aggregator', category:'Development', budget:'$4,500', skills:['React','Web3.js','Solidity'] },
  { id:2, title:'Smart Contract Audit', category:'Smart Contracts', budget:'$2,800', skills:['Solidity','Security'] },
  { id:3, title:'NFT Marketplace Redesign', category:'Design', budget:'$1,800', skills:['Figma','UI/UX'] },
  { id:4, title:'Web3 Growth Marketing', category:'Marketing', budget:'$95/hr', skills:['Community','Twitter'] },
];

const mySkills = skills.map(s=>s.toLowerCase());
const recEl    = document.getElementById('recommended-jobs');

if (mySkills.length > 0) {
  const scored = JOBS
    .map(j=>({ ...j, matches: j.skills.filter(s=>mySkills.includes(s.toLowerCase())).length }))
    .sort((a,b)=>b.matches-a.matches).slice(0,3);

  const catClass = cat => 'cat-' + cat.toLowerCase().replace(/[^a-z]/g,'-').replace(/-+/g,'-');
  recEl.innerHTML = scored.map(j => `
    <div class="fl-item" style="cursor:pointer" onclick="location.href='jobs.html'">
      <div class="fl-left" style="gap:10px">
        <span class="job-category ${catClass(j.category)}">${j.category}</span>
        <span style="font-size:13px;font-weight:700">${j.title}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:13px;font-weight:800;color:var(--accent)">${j.budget}</span>
        <span class="fl-arrow">›</span>
      </div>
    </div>`).join('');
}
