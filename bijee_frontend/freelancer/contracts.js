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

const KEY = 'fl_my_contracts';
const DEFAULT_CONTRACTS = [
  { id:1, title:'E-commerce UI Redesign', client:'DeFi Labs', clientColor:'#6366f1', value:3200, status:'active', dueDate:'2024-02-28', milestones:[{label:'Research & Discovery',amount:600,status:'done'},{label:'Wireframes',amount:800,status:'done'},{label:'High-Fidelity Designs',amount:1000,status:'active'},{label:'Dev Handoff',amount:800,status:'pending'}], deliverables:[], txHash:'0xabc123...def456' },
  { id:2, title:'Smart Contract Audit', client:'TokenForge', clientColor:'#10b981', value:2800, status:'active', dueDate:'2024-03-10', milestones:[{label:'Static Analysis',amount:1000,status:'done'},{label:'Manual Review',amount:1500,status:'active'},{label:'Audit Report',amount:300,status:'pending'}], deliverables:[], txHash:'0xdef789...' },
  { id:3, title:'Brand Guidelines', client:'ArtChain', clientColor:'#f59e0b', value:1800, status:'pending', dueDate:'2024-02-20', milestones:[{label:'Mood Boards',amount:600,status:'pending'},{label:'Logo & Identity',amount:800,status:'pending'},{label:'Guidelines PDF',amount:400,status:'pending'}], deliverables:[], txHash:null },
  { id:4, title:'DeFi Dashboard Design', client:'ChainMetrics', clientColor:'#0ea5e9', value:2200, status:'completed', dueDate:'2024-01-15', milestones:[{label:'Research',amount:500,status:'done'},{label:'Design',amount:1200,status:'done'},{label:'Handoff',amount:500,status:'done'}], deliverables:[{name:'final-design.zip',cid:'QmXyzABCDEF',date:'Jan 15'}], txHash:'0x111aaa...' },
];

function load() {
  const custom = JSON.parse(localStorage.getItem(KEY) || '[]');
  return [...DEFAULT_CONTRACTS, ...custom];
}
function save(custom) { localStorage.setItem(KEY, JSON.stringify(custom)); }

let all = load();
let currentTab = 'all';
let activeId   = null;

function updateStats() {
  const active    = all.filter(c=>c.status==='active');
  const completed = all.filter(c=>c.status==='completed');
  const earned    = completed.reduce((s,c)=>s+(c.value||0),0);
  document.getElementById('st-total').textContent  = all.length;
  document.getElementById('st-active').textContent = active.length;
  document.getElementById('st-earned').textContent = earned>0?'$'+earned.toLocaleString():'$0';
  document.getElementById('st-done').textContent   = completed.length;
  document.getElementById('st-done-sub').textContent = completed.length>0?'$'+earned.toLocaleString()+' paid':'–';
}

function pct(ms) { return Math.round(ms.filter(m=>m.status==='done').length/ms.length*100); }
function statusLabel(s) { return {active:'● Active',pending:'◐ Pending',completed:'✓ Completed',draft:'○ Draft'}[s]||s; }

function renderList(list) {
  const el    = document.getElementById('contracts-list');
  const empty = document.getElementById('contracts-empty');
  if (!list.length) { el.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  el.innerHTML = list.map(c => {
    const p    = pct(c.milestones);
    const done = c.milestones.filter(m=>m.status==='done').length;
    return `
      <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:22px;box-shadow:var(--shadow);margin-bottom:14px;cursor:pointer;transition:all .2s;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start" onclick="openDetail(${c.id})" onmouseover="this.style.borderColor='var(--accent-border)'" onmouseout="this.style.borderColor='var(--border)'">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <span style="font-size:16px;font-weight:700">${c.title}</span>
            <span class="badge badge-${c.status}">${statusLabel(c.status)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:var(--text-3);margin-bottom:12px;flex-wrap:wrap">
            <span>👤 ${c.client}</span>
            ${c.dueDate?`<span>📅 Due ${c.dueDate}</span>`:''}
            <span>✓ ${done}/${c.milestones.length} milestones</span>
            ${c.txHash?`<span style="font-family:'DM Mono',monospace">🔗 ${c.txHash.slice(0,14)}…</span>`:''}
          </div>
          ${c.status==='active'?`
            <div style="font-size:12px;color:var(--text-3);margin-bottom:5px">Progress: ${p}%</div>
            <div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div>
          `:''}
          ${c.deliverables.length>0?`<div style="font-size:12px;color:var(--accent);margin-top:8px;font-weight:600">📦 ${c.deliverables.length} deliverable${c.deliverables.length>1?'s':''} submitted</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:800;color:var(--accent)">$${c.value.toLocaleString()}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">Contract value</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
            ${c.status==='active'?`<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openDeliver(${c.id})">Submit Work</button>`:''}
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openDetail(${c.id})">Details</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterTab(status, btn) {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = status;
  renderList(status==='all' ? all : all.filter(c=>c.status===status));
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function openDetail(id) {
  const c = all.find(x=>x.id===id);
  if (!c) return;
  const p = pct(c.milestones);

  document.getElementById('detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span class="badge badge-${c.status}">${statusLabel(c.status)}</span>
      ${c.txHash?`<span style="font-size:11px;color:var(--text-3);font-family:'DM Mono',monospace">${c.txHash}</span>`:''}
    </div>
    <h2 style="font-size:20px;font-weight:800;margin-bottom:12px">${c.title}</h2>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <div style="width:32px;height:32px;border-radius:50%;background:${c.clientColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff">${c.client.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div>
        <div style="font-size:13px;font-weight:700">${c.client}</div>
        <div style="font-size:11px;color:var(--text-3)">Client</div>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;padding:20px;color:#fff;margin-bottom:20px">
      <div style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;font-weight:600;text-transform:uppercase">Escrow Amount</div>
      <div style="font-size:28px;font-weight:800;color:#6ee7b7">$${c.value.toLocaleString()}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-top:2px">Released per milestone</div>
    </div>
    ${c.status==='active'?`
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-bottom:5px"><span>Overall Progress</span><span>${p}%</span></div>
        <div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div>
      </div>`:''}
    <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin-bottom:10px">Milestones</h4>
    ${c.milestones.map(m=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border);margin-bottom:8px">
        <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;${m.status==='done'?'background:#ecfdf5;border:2px solid var(--accent);color:var(--accent)':m.status==='active'?'background:var(--accent-pale);border:2px solid var(--accent);color:var(--accent)':'background:var(--surface);border:2px solid var(--border);color:var(--text-3)'}">${m.status==='done'?'✓':m.status==='active'?'▶':'○'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${m.label}</div>
          <div style="font-size:12px;color:var(--text-3)">${m.status==='done'?'Completed & paid':m.status==='active'?'In progress':'Pending'}</div>
        </div>
        <div style="font-size:14px;font-weight:800;color:var(--accent)">$${m.amount.toLocaleString()}</div>
      </div>`).join('')}
    ${c.deliverables.length>0?`
      <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-3);margin:16px 0 10px">Submitted Deliverables</h4>
      ${c.deliverables.map(d=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--accent-pale);border:1px solid var(--accent-border);border-radius:8px;margin-bottom:8px">
          <span style="font-size:18px">📦</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700">${d.name}</div>
            <div style="font-size:11px;color:var(--accent);font-family:'DM Mono',monospace">CID: ${d.cid}</div>
            ${d.notes?`<div style="font-size:12px;color:var(--text-2);margin-top:3px">${d.notes}</div>`:''}
          </div>
          <span style="font-size:12px;color:var(--text-3)">${d.date}</span>
        </div>`).join('')}`:''}
    <div style="display:flex;gap:10px;padding-top:20px;border-top:1px solid var(--border);margin-top:20px">
      ${c.status==='active'?`<button class="btn btn-primary" style="flex:1" onclick="document.getElementById('detail-modal').classList.remove('open');openDeliver(${c.id})">Submit Deliverable</button>`:''}
      <button class="btn btn-outline" style="flex:1" onclick="document.getElementById('detail-modal').classList.remove('open')">Close</button>
    </div>`;
  document.getElementById('detail-modal').classList.add('open');
}

// ── Deliver Modal ─────────────────────────────────────────────────────────────
function openDeliver(id) {
  activeId = id;
  document.getElementById('file-info').style.display='none';
  document.getElementById('deliver-notes').value='';
  document.getElementById('file-input').value='';
  document.getElementById('deliver-modal').classList.add('open');
}

function onFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const el = document.getElementById('file-info');
  el.style.display='block';
  el.textContent = `📎 ${file.name} (${(file.size/1024).toFixed(1)} KB) — Ready`;
}

function submitDeliverable() {
  const file = document.getElementById('file-input').files[0];
  if (!file) { showToast('Please select a file.','⚠️'); return; }

  // Simulated IPFS CID — replace with real Kubo upload when backend is ready
  const cid   = 'Qm' + Math.random().toString(36).slice(2,14).toUpperCase() + Math.random().toString(36).slice(2,8).toUpperCase();
  const notes = document.getElementById('deliver-notes').value;
  const today = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});

  const c = all.find(x=>x.id===activeId);
  if (c) {
    c.deliverables.push({ name:file.name, cid, date:today, notes });
    const custom = all.filter(x=>x.id>100);
    save(custom);
  }

  document.getElementById('deliver-modal').classList.remove('open');
  renderList(currentTab==='all'?all:all.filter(c=>c.status===currentTab));
  showToast(`Deliverable submitted! CID: ${cid.slice(0,12)}…`,'📦');
}

updateStats();
renderList(all);
