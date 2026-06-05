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

const CONTACTS = {
  defilabs:    { name:'DeFi Labs',    role:'Client · E-commerce Project',   initials:'DL', color:'#6366f1', online:true,  contract:'E-commerce UI Redesign' },
  tokenforge:  { name:'TokenForge',   role:'Client · Smart Contract Audit',  initials:'TF', color:'#10b981', online:true,  contract:'Smart Contract Audit' },
  artchain:    { name:'ArtChain',     role:'Client · Brand Guidelines',      initials:'AC', color:'#f59e0b', online:false, contract:'Brand Guidelines' },
  chainmetrics:{ name:'ChainMetrics', role:'Client · Analytics Dashboard',   initials:'CM', color:'#0ea5e9', online:false, contract:'Analytics Dashboard' },
};

const DEFAULT_MSGS = {
  defilabs: [
    { from:'defilabs', text:"Hey! Looking forward to working with you on the UI redesign. When can you start?", time:'10:00 AM', date:'Yesterday' },
    { from:'me',       text:"Hi! I can start immediately. I've reviewed the requirements and have some initial ideas.", time:'10:20 AM', date:'Yesterday' },
    { from:'defilabs', text:"Perfect! I'll send the full brief today. Budget is confirmed as $3,200.", time:'10:22 AM', date:'Yesterday' },
    { from:'system',   text:'📄 Contract signed. Escrow of $3,200 locked via smart contract.', date:'Yesterday' },
    { from:'me',       text:"Great, I received the brief. Starting with research & wireframes this week.", time:'2:00 PM', date:'Today' },
    { from:'defilabs', text:"Sounds great. Keep me updated!", time:'2:05 PM', date:'Today' },
  ],
  tokenforge: [
    { from:'tokenforge', text:"We need the audit completed by end of month. Is that feasible?", time:'9:00 AM', date:'Today' },
    { from:'me',         text:"Yes, absolutely. I'll have the static analysis done by Thursday and the full report by month end.", time:'9:30 AM', date:'Today' },
    { from:'tokenforge', text:"Perfect. Please flag any critical vulnerabilities immediately.", time:'9:32 AM', date:'Today' },
  ],
  artchain: [
    { from:'artchain', text:"Hi! We loved your portfolio. Are you available for our brand project?", time:'3:00 PM', date:'Mon' },
    { from:'me',       text:"Thank you! Yes I'm available. Can you share more about the scope?", time:'3:30 PM', date:'Mon' },
  ],
  chainmetrics: [
    { from:'chainmetrics', text:"The dashboard looks great! When will the API integration be ready?", time:'11:00 AM', date:'Tue' },
    { from:'me',           text:"API integration is on track for Friday.", time:'11:15 AM', date:'Tue' },
  ],
};

const MSGS_KEY = 'fl_msgs_freelancer';
const UNREAD   = { defilabs:0, tokenforge:1, artchain:0, chainmetrics:1 };

function loadMsgs(id)    { return JSON.parse(localStorage.getItem(`${MSGS_KEY}_${id}`) || 'null') || DEFAULT_MSGS[id] || []; }
function saveMsgs(id, m) { localStorage.setItem(`${MSGS_KEY}_${id}`, JSON.stringify(m)); }

let activeConv = null;
let unread     = JSON.parse(localStorage.getItem('fl_unread_fl') || JSON.stringify(UNREAD));

function renderConvList(filter='') {
  const list  = document.getElementById('conv-list');
  const total = Object.values(unread).reduce((s,n)=>s+n, 0);
  const badge = document.getElementById('nav-unread');
  badge.textContent   = total > 0 ? total : '';
  badge.style.display = total > 0 ? 'inline-flex' : 'none';

  const ids = Object.keys(CONTACTS).filter(id =>
    !filter || CONTACTS[id].name.toLowerCase().includes(filter.toLowerCase())
  );

  list.innerHTML = ids.map(id => {
    const c    = CONTACTS[id];
    const msgs = loadMsgs(id);
    const last = msgs.filter(m=>m.from!=='system').at(-1);
    const u    = unread[id] || 0;
    return `
      <div class="conv-item ${activeConv===id?'active':''} ${u>0?'unread':''}" onclick="openConv('${id}')">
        <div class="conv-avatar" style="background:${c.color}">
          ${c.initials}
          ${c.online ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="conv-body">
          <div class="conv-row">
            <span class="conv-name">${c.name}</span>
            <span class="conv-time">${last?.time||last?.date||''}</span>
          </div>
          <div class="conv-preview">${last?(last.from==='me'?'You: ':'')+last.text:'No messages'}</div>
        </div>
        ${u>0?`<div class="unread-badge">${u}</div>`:''}
      </div>`;
  }).join('');
}

function openConv(id) {
  activeConv = id;
  unread[id] = 0;
  localStorage.setItem('fl_unread_fl', JSON.stringify(unread));

  const c = CONTACTS[id];
  document.getElementById('chat-av').textContent    = c.initials;
  document.getElementById('chat-av').style.background = c.color;
  document.getElementById('chat-name').textContent  = c.name;
  document.getElementById('chat-status').textContent= c.online ? '● Online' : '● Away';
  document.getElementById('chat-status').style.color= c.online ? 'var(--accent)' : 'var(--text-3)';

  const cb = document.getElementById('chat-contract');
  if (c.contract) { cb.style.display='inline-flex'; document.getElementById('chat-contract-name').textContent=c.contract; }
  else              cb.style.display='none';

  document.getElementById('chat-empty').style.display  = 'none';
  const ac = document.getElementById('active-chat');
  ac.style.display = 'flex';

  document.getElementById('chat-panel').classList.add('open');
  renderMessages(id);
  renderConvList();
}

function renderMessages(id) {
  const msgs = loadMsgs(id);
  const c    = CONTACTS[id];
  const el   = document.getElementById('chat-messages');
  let lastDate = '';

  el.innerHTML = msgs.map(m => {
    let html = '';
    if (m.date && m.date !== lastDate) { html += `<div class="date-divider">${m.date}</div>`; lastDate=m.date; }
    if (m.from === 'system') return html + `<div class="msg-system">${m.text}</div>`;
    const isMe = m.from === 'me';
    return html + `
      <div class="msg ${isMe?'out':'in'}">
        ${!isMe?`<div class="msg-av" style="background:${c.color}">${c.initials}</div>`:''}
        <div>
          <div class="msg-bubble">${esc(m.text)}</div>
          <div class="msg-time">${m.time||''}</div>
        </div>
      </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function sendMessage() {
  if (!activeConv) return;
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  const msgs = loadMsgs(activeConv);
  msgs.push({ from:'me', text, time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), date:'Today' });
  saveMsgs(activeConv, msgs);
  input.value = '';
  renderMessages(activeConv);
  renderConvList();
  if (CONTACTS[activeConv].online) {
    showTyping();
    setTimeout(() => {
      hideTyping();
      const reply = REPLIES[activeConv]?.[Math.floor(Math.random()*REPLIES[activeConv].length)] || 'Got it!';
      const m2 = loadMsgs(activeConv);
      m2.push({ from:activeConv, text:reply, time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), date:'Today' });
      saveMsgs(activeConv, m2);
      renderMessages(activeConv);
      renderConvList();
    }, 1200 + Math.random()*1600);
  }
}

const REPLIES = {
  defilabs:    ["Looks great, thanks!","Perfect, keep it up!","Can you send me a preview?","Sounds good, I'll review it."],
  tokenforge:  ["Understood. Please flag any critical issues.","Great, looking forward to the report.","Thanks for the update."],
  artchain:    ["Exciting! Looking forward to the concepts.","Thanks for getting back to me."],
  chainmetrics:["Perfect timing.","Great progress!","Let me know if you need access to anything."],
};

function showTyping() {
  const el  = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.id = 'typing';
  div.className = 'typing-indicator';
  div.innerHTML = `<div class="msg-av" style="background:${CONTACTS[activeConv].color}">${CONTACTS[activeConv].initials}</div><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  el.appendChild(div); el.scrollTop = el.scrollHeight;
}
function hideTyping() { document.getElementById('typing')?.remove(); }

function searchConvs(q)  { renderConvList(q); }
function closeChat()     { document.getElementById('chat-panel').classList.remove('open'); }
function openNewMsg()    { document.getElementById('new-msg-modal').classList.add('open'); }
function startConv() {
  const to   = document.getElementById('nm-to').value;
  const body = document.getElementById('nm-body').value.trim();
  if (!body) { showToast('Enter a message.','⚠️'); return; }
  document.getElementById('new-msg-modal').classList.remove('open');
  document.getElementById('nm-body').value = '';
  const msgs = loadMsgs(to);
  msgs.push({ from:'me', text:body, time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), date:'Today' });
  saveMsgs(to, msgs);
  openConv(to);
  showToast('Message sent!');
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

renderConvList();
