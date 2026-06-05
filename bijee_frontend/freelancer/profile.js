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

const PROFILE_KEY = 'fl_freelancer_profile';
let profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
if (!profile.fullName) profile.fullName = user.name || '';

// ── Load into form ────────────────────────────────────────────────────────────
function loadForm() {
  document.getElementById('input-name').value        = profile.fullName    || '';
  document.getElementById('input-title').value       = profile.title       || '';
  document.getElementById('input-bio').value         = profile.bio         || '';
  document.getElementById('input-location').value    = profile.location    || '';
  document.getElementById('input-github').value      = profile.github      || '';
  document.getElementById('input-portfolio').value   = profile.portfolio   || '';
  document.getElementById('input-linkedin').value    = profile.linkedin    || '';
  document.getElementById('hourly-rate').value       = profile.hourlyRate  || '';
  if (profile.experience)  document.getElementById('input-experience').value = profile.experience;
  if (profile.availability) document.getElementById('availability').value   = profile.availability;

  renderCard();
  renderSkills();
  updateStats();
  renderWallet();
  updateAvailBadge();
}

// ── Profile card ──────────────────────────────────────────────────────────────
function renderCard() {
  const name = profile.fullName || user.name || 'Unnamed';
  document.getElementById('profile-avatar').textContent        = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('profile-name-display').textContent  = name;
  document.getElementById('profile-title-display').textContent = profile.title || 'Add your title';
}

function updateAvailBadge() {
  const val   = document.getElementById('availability').value;
  const badge = document.getElementById('avail-badge');
  const map   = { available:['✅ Available','var(--accent-pale)','var(--accent)','var(--accent-border)'], busy:['🔴 Busy','#fef2f2','#dc2626','#fecaca'], part:['🟡 Part-time','#fffbeb','#d97706','#fde68a'] };
  const [label, bg, color, border] = map[val] || map.available;
  badge.textContent = label;
  badge.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${bg};color:${color};border:1px solid ${border};margin-bottom:16px`;
}

function updateStats() {
  const contracts = JSON.parse(localStorage.getItem('fl_my_contracts') || '[]');
  const completed = contracts.filter(c=>c.status==='completed');
  const earned    = completed.reduce((s,c)=>s+(c.value||0),0);
  document.getElementById('pstat-contracts').textContent = contracts.length;
  document.getElementById('pstat-earned').textContent    = earned>0?'$'+earned.toLocaleString():'$0';
  document.getElementById('pstat-skills').textContent    = (profile.skills||[]).length;
  document.getElementById('pstat-rating').textContent    = completed.length>0?(3.5+completed.length*0.3).toFixed(1):'—';
}

// ── Skills ────────────────────────────────────────────────────────────────────
function renderSkills() {
  const skills = profile.skills || [];
  const el     = document.getElementById('skills-list');
  if (!skills.length) { el.innerHTML='<span style="font-size:13px;color:var(--text-3)">No skills yet — add some below.</span>'; return; }
  el.innerHTML = skills.map(s=>`
    <span class="skill-pill">${s}
      <button onclick="removeSkill('${s}')" title="Remove">×</button>
    </span>`).join('');
  document.getElementById('pstat-skills').textContent = skills.length;
}

function addSkill() {
  const input = document.getElementById('skill-input');
  const val   = input.value.trim();
  if (!val) return;
  profile.skills = profile.skills || [];
  if (!profile.skills.map(s=>s.toLowerCase()).includes(val.toLowerCase())) {
    profile.skills.push(val); renderSkills();
  }
  input.value = '';
}

function addSkillQuick(skill) {
  profile.skills = profile.skills || [];
  if (!profile.skills.map(s=>s.toLowerCase()).includes(skill.toLowerCase())) {
    profile.skills.push(skill); renderSkills();
  }
}

function removeSkill(skill) {
  profile.skills = (profile.skills||[]).filter(s=>s!==skill);
  renderSkills();
}

// ── Wallet ────────────────────────────────────────────────────────────────────
function renderWallet() {
  const wallet = profile.wallet;
  document.getElementById('profile-wallet-display').textContent = wallet
    ? wallet.slice(0,8)+'…'+wallet.slice(-6) : 'No wallet connected';

  const box = document.getElementById('wallet-status-box');
  box.innerHTML = wallet
    ? `<div style="display:flex;align-items:center;gap:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--accent)"></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--accent)">Wallet Connected</div>
          <div style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace">${wallet}</div>
        </div>
      </div>`
    : '<div style="font-size:13px;color:var(--text-3)">No wallet connected</div>';
}

async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      profile.wallet = accounts[0];
      renderWallet();
      showToast(`Wallet connected: ${accounts[0].slice(0,6)}…${accounts[0].slice(-4)}`);
    } catch(_) { showToast('MetaMask cancelled.', '❌'); }
  } else {
    showToast('MetaMask not found. Install at metamask.io', '⚠️');
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
function saveProfile() {
  profile.fullName     = document.getElementById('input-name').value.trim()       || profile.fullName;
  profile.title        = document.getElementById('input-title').value.trim();
  profile.bio          = document.getElementById('input-bio').value.trim();
  profile.location     = document.getElementById('input-location').value.trim();
  profile.github       = document.getElementById('input-github').value.trim();
  profile.portfolio    = document.getElementById('input-portfolio').value.trim();
  profile.linkedin     = document.getElementById('input-linkedin').value.trim();
  profile.hourlyRate   = document.getElementById('hourly-rate').value;
  profile.experience   = document.getElementById('input-experience').value;
  profile.availability = document.getElementById('availability').value;

  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // Sync name back to session
  if (profile.fullName) {
    user.name = profile.fullName;
    sessionStorage.setItem('fl_user', JSON.stringify(user));
    AUTH.populateNav(user);
  }

  renderCard();
  showToast('Profile saved! ✨');
}

loadForm();
