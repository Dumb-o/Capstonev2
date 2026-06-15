// auth.js — shared by client/ and freelancer/ pages
// Place this file in the ROOT folder alongside index.html

const AUTH = {
  TOKEN_KEY: 'fl_token',
  USER_KEY:  'fl_user',

  getUser() {
    return JSON.parse(sessionStorage.getItem(this.USER_KEY) || 'null')
        || JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  // Validate a pseudo-JWT token (exp stored in ms from our login.js generator)
  validateToken(token) {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now()) { this.clear(); return null; }
      return payload;
    } catch(_) { return null; }
  },

  // Store session after login
  persist(user, token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  },

  // Guard: call at top of every protected page
  // role = 'Client' | 'Freelancer' | null (allow any)
  guard(requiredRole) {
    const user = this.getUser();
    const token = this.getToken();
    if (!user || !this.validateToken(token)) {
      this.clear();
      window.location.href = '../freeledger/login.html';
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      // Wrong portal — redirect to correct one
      window.location.href = user.role === 'Freelancer'
        ? '../freelancer/dashboard.html'
        : '../client/dashboard.html';
      return null;
    }
    return user;
  },

  logout() {
    this.clear();
    window.location.href = '../freeledger/login.html';
  },

  // Populate nav user chip
  populateNav(user) {
    const name     = user.name || 'User';
    const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const el_name  = document.getElementById('nav-uname');
    const el_init  = document.getElementById('nav-avatar');
    const el_role  = document.getElementById('nav-urole');
    if (el_name)  el_name.textContent  = name.split(' ')[0];
    if (el_init)  el_init.textContent  = initials;
    if (el_role)  el_role.textContent  = user.role || 'Member';
  },

  // Session countdown timer
  startTimer(badgeId) {
    const token = this.getToken();
    let expMs = Date.now() + 2 * 60 * 60 * 1000;
    if (token) {
      try { const p = JSON.parse(atob(token.split('.')[1])); expMs = p.exp > 1e10 ? p.exp : p.exp * 1000; } catch(_) {}
    }
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    function update() {
      const rem = expMs - Date.now();
      if (rem <= 0) { AUTH.logout(); return; }
      const h = Math.floor(rem/3600000), m = Math.floor((rem%3600000)/60000), s = Math.floor((rem%60000)/1000);
      badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> ${h>0?h+'h ':''}${m}m ${s}s`;
    }
    update(); setInterval(update, 1000);
  }
};

// Toast utility
function showToast(msg, icon='✅') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.querySelector('.toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 3000);
}
