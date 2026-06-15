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

// ── Contacts / Conversation data ──────────────────────────────────────────────
const CONTACTS = {
  alex:   { name: 'Alex Rivera',  role: 'UI/UX Designer',    initials: 'AR', color: '#6366f1', online: true,  contract: 'E-commerce UI Redesign' },
  sarah:  { name: 'Sarah Chen',   role: 'Full Stack Dev',     initials: 'SC', color: '#10b981', online: true,  contract: 'Mobile App Development' },
  jordan: { name: 'Jordan Smith', role: 'Marketing',          initials: 'JS', color: '#f59e0b', online: false, contract: null },
  maya:   { name: 'Maya Patel',   role: 'Graphic Designer',   initials: 'MP', color: '#ef4444', online: false, contract: 'Brand Guidelines & Assets' },
};

const DEFAULT_MESSAGES = {
  alex: [
    { from: 'alex',  text: "Hey! I've finished the wireframes for the homepage. Let me know what you think.", time: '10:14 AM', date: 'Yesterday' },
    { from: 'me',    text: "Looks great, Alex! The navigation structure is exactly what we were going for.", time: '10:32 AM', date: 'Yesterday' },
    { from: 'alex',  text: "Thanks! I'll start on the product listing pages next. Should have them ready by Thursday.", time: '10:35 AM', date: 'Yesterday' },
    { from: 'system', text: '📄 Milestone "Wireframes" marked as complete. Payment of $800 released via escrow.', date: 'Yesterday' },
    { from: 'me',    text: "Perfect. Also can we schedule a quick call to discuss the checkout flow?", time: '2:10 PM', date: 'Yesterday' },
    { from: 'alex',  text: "Absolutely. I'm free tomorrow 2–4 PM or Friday morning. Which works better?", time: '2:22 PM', date: 'Yesterday' },
    { from: 'me',    text: "Friday morning works great for me.", time: '2:25 PM', date: 'Yesterday' },
    { from: 'alex',  text: "Confirmed! I'll send a calendar invite. See you then 👍", time: '2:26 PM', date: 'Today' },
  ],
  sarah: [
    { from: 'sarah', text: "Hi! Just pushed the latest backend API endpoints to the repo. All endpoints for auth and user management are done.", time: '9:00 AM', date: 'Today' },
    { from: 'me',    text: "Excellent work Sarah! I'll have the QA team review it today.", time: '9:15 AM', date: 'Today' },
    { from: 'sarah', text: "Great. I'll start on the product and order APIs this afternoon. ETA tomorrow EOD.", time: '9:17 AM', date: 'Today' },
    { from: 'system', text: '🔗 Pull Request #42 opened: "Backend API v1.0" — awaiting review.', date: 'Today' },
  ],
  jordan: [
    { from: 'jordan', text: "Hey, just checking in on the project brief. When do you need the strategy deck?", time: '3:00 PM', date: 'Mon' },
    { from: 'me',     text: "Hi Jordan! We'd need it by next Friday ideally.", time: '3:45 PM', date: 'Mon' },
    { from: 'jordan', text: "No problem. I'll have a draft ready by Wednesday for your feedback.", time: '3:50 PM', date: 'Mon' },
  ],
  maya: [
    { from: 'maya', text: "Here are the initial logo concepts! Excited to hear your thoughts 🎨", time: '11:00 AM', date: 'Tue' },
    { from: 'me',   text: "These are fantastic! I really like concept 2. Can we explore a darker version?", time: '11:30 AM', date: 'Tue' },
    { from: 'maya', text: "Of course! I'll have 3 dark variants ready by tomorrow morning.", time: '11:35 AM', date: 'Tue' },
  ],
};

// Unread counts
const UNREAD = { alex: 0, sarah: 2, jordan: 0, maya: 1 };

const MSGS_KEY = 'fl_messages';

function loadMessages(convId) {
  const stored = JSON.parse(localStorage.getItem(`${MSGS_KEY}_${convId}`) || 'null');
  return stored || DEFAULT_MESSAGES[convId] || [];
}
function saveMessages(convId, msgs) {
  localStorage.setItem(`${MSGS_KEY}_${convId}`, JSON.stringify(msgs));
}

// ── State ─────────────────────────────────────────────────────────────────────
let activeConv    = null;
let allConvIds    = Object.keys(CONTACTS);
let unreadCounts  = JSON.parse(localStorage.getItem('fl_unread') || JSON.stringify(UNREAD));

// ── Render Conversation List ──────────────────────────────────────────────────
function renderConvList(filter = '') {
  const list = document.getElementById('conv-list');
  const ids  = allConvIds.filter(id => {
    if (!filter) return true;
    return CONTACTS[id].name.toLowerCase().includes(filter.toLowerCase());
  });

  list.innerHTML = ids.map(id => {
    const c     = CONTACTS[id];
    const msgs  = loadMessages(id);
    const last  = msgs.filter(m => m.from !== 'system').at(-1);
    const unread = unreadCounts[id] || 0;
    return `
      <div class="conv-item ${activeConv===id?'active':''} ${unread>0?'unread':''}"
           onclick="openConv('${id}')">
        <div class="conv-avatar" style="background:${c.color}">
          ${c.initials}
          ${c.online ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="conv-body">
          <div class="conv-row">
            <span class="conv-name">${c.name}</span>
            <span class="conv-time">${last?.time || last?.date || ''}</span>
          </div>
          <div class="conv-preview">
            ${last ? (last.from==='me' ? 'You: ' : '') + last.text : 'No messages yet'}
          </div>
        </div>
        ${unread > 0 ? `<div class="unread-badge">${unread}</div>` : ''}
      </div>
    `;
  }).join('');

  // Update nav badge
  const total = Object.values(unreadCounts).reduce((s,n)=>s+n,0);
  const badge = document.getElementById('nav-unread');
  badge.textContent = total > 0 ? total : '';
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
}

// ── Open Conversation ─────────────────────────────────────────────────────────
function openConv(id) {
  activeConv = id;
  unreadCounts[id] = 0;
  localStorage.setItem('fl_unread', JSON.stringify(unreadCounts));

  const c = CONTACTS[id];
  document.getElementById('chat-avatar-el').textContent = c.initials;
  document.getElementById('chat-avatar-el').style.background = c.color;
  document.getElementById('chat-name-el').textContent   = c.name;
  document.getElementById('chat-status-el').textContent = c.online ? '● Online' : '● Away';
  document.getElementById('chat-status-el').style.color = c.online ? 'var(--green)' : 'var(--text-3)';

  const contractBadge = document.getElementById('chat-contract-badge');
  if (c.contract) {
    contractBadge.style.display = 'inline-flex';
    document.getElementById('chat-contract-name').textContent = c.contract;
  } else {
    contractBadge.style.display = 'none';
  }

  document.getElementById('chat-empty').style.display  = 'none';
  document.getElementById('active-chat').style.display = 'flex';

  // Mobile
  document.getElementById('chat-panel').classList.add('mobile-open');

  renderMessages(id);
  renderConvList();
}

// ── Render Messages ───────────────────────────────────────────────────────────
function renderMessages(id) {
  const msgs = loadMessages(id);
  const c    = CONTACTS[id];
  const el   = document.getElementById('chat-messages');

  let lastDate = '';
  el.innerHTML = msgs.map(m => {
    let html = '';

    if (m.date && m.date !== lastDate) {
      html += `<div class="date-divider">${m.date}</div>`;
      lastDate = m.date;
    }

    if (m.from === 'system') {
      return html + `<div class="msg-system">${m.text}</div>`;
    }

    const isMe = m.from === 'me';
    return html + `
      <div class="msg ${isMe ? 'outgoing' : 'incoming'}">
        ${!isMe ? `<div class="msg-avatar" style="background:${c.color}">${c.initials}</div>` : ''}
        <div>
          <div class="msg-bubble">${escapeHtml(m.text)}</div>
          <div class="msg-time">${m.time || ''}</div>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  el.scrollTop = el.scrollHeight;
}

// ── Send Message ──────────────────────────────────────────────────────────────
function sendMessage() {
  if (!activeConv) return;
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  const msgs = loadMessages(activeConv);
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgs.push({ from: 'me', text, time, date: 'Today' });
  saveMessages(activeConv, msgs);
  input.value = '';
  renderMessages(activeConv);
  renderConvList();

  // Simulate auto-reply after 1–3s
  if (CONTACTS[activeConv]?.online) {
    showTyping();
    const delay = 1200 + Math.random() * 1800;
    setTimeout(() => {
      hideTyping();
      const reply = getAutoReply(activeConv, text);
      const msgs2 = loadMessages(activeConv);
      msgs2.push({ from: activeConv, text: reply, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), date: 'Today' });
      saveMessages(activeConv, msgs2);
      renderMessages(activeConv);
      renderConvList();
    }, delay);
  }
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function insertEmoji() {
  const emojis = ['👍','✅','🔥','💡','🎉','🙌','👀','💪'];
  document.getElementById('chat-input').value += emojis[Math.floor(Math.random()*emojis.length)];
  document.getElementById('chat-input').focus();
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function showTyping() {
  const el = document.getElementById('chat-messages');
  const existing = document.getElementById('typing-indicator');
  if (existing) return;
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar" style="background:${CONTACTS[activeConv].color}">${CONTACTS[activeConv].initials}</div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
function hideTyping() {
  document.getElementById('typing-indicator')?.remove();
}

// ── Auto Reply ────────────────────────────────────────────────────────────────
const REPLIES = {
  alex:   ["Got it! I'll get right on that.", "Sounds good, I'll update you shortly.", "Sure thing! Working on it now.", "Perfect, thanks for the heads up!", "Will do! I'll have an update for you soon."],
  sarah:  ["On it! I'll push the changes shortly.", "Great, will do!", "Makes sense. I'll take care of it.", "Perfect. I'll update the PR.", "Noted! Let me check and get back to you."],
  jordan: ["Sure, I'll have that ready for you.", "Noted! Working on the strategy now.", "Great idea, I'll incorporate that feedback.", "Understood, I'll adjust the plan.", "Perfect timing, I was just about to start on that."],
  maya:   ["Love the direction! I'll refine it now.", "On it! New concepts coming your way.", "Perfect! I'll start that revision.", "Great feedback, thanks! I'll update the designs.", "Sure! Working on some new variations."],
};
function getAutoReply(id, input) {
  const pool = REPLIES[id] || ["Got it, thanks!"];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Search ────────────────────────────────────────────────────────────────────
function searchConvs(q) { renderConvList(q); }

// ── Mobile back ───────────────────────────────────────────────────────────────
function closeChat() {
  document.getElementById('chat-panel').classList.remove('mobile-open');
}

// ── New Message Modal ─────────────────────────────────────────────────────────
function openNewMessage() {
  document.getElementById('new-msg-modal').classList.add('open');
}
function closeNewMsgModal(e) {
  if (e.target === e.currentTarget) document.getElementById('new-msg-modal').classList.remove('open');
}
function startNewConversation() {
  const to   = document.getElementById('nm-to').value;
  const body = document.getElementById('nm-body').value.trim();
  if (!body) { showToast('Please enter a message.', '⚠️'); return; }
  document.getElementById('new-msg-modal').classList.remove('open');
  document.getElementById('nm-body').value = '';

  const msgs = loadMessages(to);
  msgs.push({ from: 'me', text: body, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), date: 'Today' });
  saveMessages(to, msgs);
  openConv(to);
  showToast('Message sent!');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function doLogout() {
  sessionStorage.removeItem('fl_user');
  window.location.href = '../freeledger/login.html';
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function showToast(msg, icon = '✅') {
  const t = document.getElementById('toast');
  t.querySelector('.toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderConvList();
