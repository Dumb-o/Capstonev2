// ── Token Auth ────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'fl_token';
const USER_KEY  = 'fl_user';
const TOKEN_TTL = 2 * 60 * 60 * 1000; // 2 hours

function generateToken(user) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub:  user.email,
    name: user.name,
    role: user.role,
    iat:  Date.now(),
    exp:  Date.now() + TOKEN_TTL,
  }));
  const sig = btoa(`${header}.${payload}.freeledger_secret`).slice(0, 32);
  return `${header}.${payload}.${sig}`;
}

function validateToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp < Date.now()) { clearSession(); return null; }
    return payload;
  } catch(_) { return null; }
}

function persistSession(user, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem('fl_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem('fl_user');
}

// ── Role-based redirect ───────────────────────────────────────────────────────
// login.html lives in the ROOT of the Freeledger folder.
// client/ and freelancer/ are subfolders inside it.
function redirectToDashboard(role) {
  if (role === 'Freelancer') {
    window.location.href = '../freelancer/dashboard.html';
  } else {
    window.location.href = '../client/dashboard.html';
  }
}

// ── Demo users ────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'bijeedangol@gmail.com', password: 'bijee123',  name: 'Bijee Dangol', role: 'Client'     },
  { email: 'freelancer@demo.com',   password: 'demo1234',  name: 'Alex Rivera',  role: 'Freelancer' },
];

function loadUsers()      { try { return JSON.parse(localStorage.getItem('fl_users') || '[]'); } catch(_) { return []; } }
function saveUsers(users) { localStorage.setItem('fl_users', JSON.stringify(users)); }
function getAllUsers()     { return [...DEMO_USERS, ...loadUsers()]; }

// ── Tab switcher ──────────────────────────────────────────────────────────────
function showTab(tab) {
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('form-login').classList.toggle('active',   tab === 'login');
  document.getElementById('form-register').classList.toggle('active',tab === 'register');
  document.getElementById('left-login-content').classList.toggle('active',    tab === 'login');
  document.getElementById('left-register-content').classList.toggle('active', tab === 'register');
  document.getElementById('left-bottom-text').textContent = tab === 'login'
    ? 'Protected by blockchain cryptography — no central server can be breached.'
    : 'Over 2,400 projects successfully completed on FreeLedger.';
}

// ── Login ─────────────────────────────────────────────────────────────────────
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  clearErrors('login-email-err', 'login-pass-err');
  let ok = true;
  if (!email || !email.includes('@')) { showError('login-email-err'); ok = false; }
  if (!pass)                           { showError('login-pass-err', 'Password is required.'); ok = false; }
  if (!ok) return;
  const user = getAllUsers().find(u => u.email === email && u.password === pass);
  if (!user) { showError('login-pass-err', 'Invalid email or password.'); return; }
  const token = generateToken(user);
  persistSession(user, token);
  showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`);
  setTimeout(() => redirectToDashboard(user.role), 800);
}

// ── Register ──────────────────────────────────────────────────────────────────
function doRegister() {
  const first = document.getElementById('reg-firstname').value.trim();
  const last  = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const role  = document.querySelector('input[name="reg-role"]:checked')?.value || 'Freelancer';
  clearErrors('reg-email-err', 'reg-pass-err');
  let ok = true;
  if (!first)                         { showToast('First name is required.', '⚠️'); ok = false; }
  if (!email || !email.includes('@')) { showError('reg-email-err'); ok = false; }
  if (pass.length < 8)                { showError('reg-pass-err'); ok = false; }
  if (!ok) return;
  if (getAllUsers().find(u => u.email === email)) {
    showError('reg-email-err', 'This email is already registered.');
    return;
  }
  const name    = first + (last ? ' ' + last : '');
  const newUser = { email, password: pass, name, role };
  const stored  = loadUsers();
  stored.push(newUser);
  saveUsers(stored);
  const token = generateToken(newUser);
  persistSession(newUser, token);
  showToast(`Welcome, ${first}! 🎉`);
  setTimeout(() => redirectToDashboard(role), 800);
}

// ── MetaMask ──────────────────────────────────────────────────────────────────
async function doMetaMask() {
  const role = document.querySelector('input[name="reg-role"]:checked')?.value || 'Freelancer';
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr  = accounts[0];
      const short = addr.slice(0, 6) + '…' + addr.slice(-4);
      const user  = { name: short, email: addr, role };
      persistSession(user, generateToken(user));
      showToast(`Wallet connected: ${short}`);
      setTimeout(() => redirectToDashboard(role), 800);
    } catch(_) { showToast('MetaMask cancelled.', '❌'); }
  } else {
    showToast('MetaMask not found. Install at metamask.io', '⚠️');
  }
}

// ── Demo fill ─────────────────────────────────────────────────────────────────
function fillDemo() {
  document.getElementById('login-email').value    = 'bijeedangol@gmail.com';
  document.getElementById('login-password').value = 'bijee123';
  showToast('Demo client credentials filled — click Sign In!', '💡');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  t.querySelector('.toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}
function clearErrors(...ids) { ids.forEach(id => document.getElementById(id)?.classList.remove('visible')); }
function showError(id, msg)  { const el = document.getElementById(id); if (!el) return; if (msg) el.textContent = msg; el.classList.add('visible'); }

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('form-login').classList.contains('active')) doLogin();
  else doRegister();
});

// ── Init: redirect if already logged in ──────────────────────────────────────
(function init() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (validateToken(token)) {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (u) { redirectToDashboard(u.role); return; }
  }
  if (window.location.hash === '#register') showTab('register');
})();
