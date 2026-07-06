const API = '/api';

const els = {
  form: document.getElementById('ticketForm'),
  subject: document.getElementById('subject'),
  description: document.getElementById('description'),
  submitBtn: document.getElementById('submitBtn'),
  railTrack: document.getElementById('railTrack'),
  ticketBody: document.getElementById('ticketBody'),
  emptyState: document.getElementById('emptyState'),
  filterTeam: document.getElementById('filterTeam'),
  filterStatus: document.getElementById('filterStatus'),
  toast: document.getElementById('toast'),
  statTotal: document.getElementById('statTotal'),
  statOpen: document.getElementById('statOpen'),
  statResolved: document.getElementById('statResolved'),
  statHigh: document.getElementById('statHigh'),
  userChip: document.getElementById('userChip'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  logoutBtn: document.getElementById('logoutBtn'),
};

async function checkAuth() {
  const res = await fetch(`${API}/auth/me`);
  if (!res.ok) {
    window.location.href = 'login.html';
    return null;
  }
  const user = await res.json();
  els.userChip.hidden = false;
  els.userName.textContent = user.name || user.username;
  els.userAvatar.textContent = (user.name || user.username).slice(0, 2).toUpperCase();
  return user;
}

els.logoutBtn.addEventListener('click', async () => {
  await fetch(`${API}/auth/logout`, { method: 'POST' });
  window.location.href = 'login.html';
});

let teams = [];

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2400);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function loadTeams() {
  const res = await fetch(`${API}/teams`);
  teams = await res.json();

  els.filterTeam.innerHTML = '<option value="all">All teams</option>' +
    teams.map((t) => `<option value="${t.key}">${t.name}</option>`).join('');

  els.railTrack.innerHTML = teams.map((t) => `
    <div class="rail-lane" data-team="${t.key}">
      <span class="dot" style="background:${t.color}"></span>
      <span class="lane-name">${t.name}</span>
      <span class="lane-count">${t.openCount}</span>
    </div>
  `).join('');
}

async function loadStats() {
  const res = await fetch(`${API}/stats`);
  const stats = await res.json();
  els.statTotal.textContent = stats.total;
  els.statOpen.textContent = stats.open;
  els.statResolved.textContent = stats.resolved;
  els.statHigh.textContent = stats.highPriority;
}

async function loadTickets() {
  const team = els.filterTeam.value;
  const status = els.filterStatus.value;
  const params = new URLSearchParams({ team, status });
  const res = await fetch(`${API}/tickets?${params}`);
  const tickets = await res.json();
  renderTickets(tickets);
}

function renderTickets(tickets) {
  if (!tickets.length) {
    els.ticketBody.innerHTML = '';
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  els.ticketBody.innerHTML = tickets.map((t) => `
    <tr data-id="${t.id}">
      <td>
        <div class="ticket-subject">${escapeHtml(t.subject)}</div>
        <div class="ticket-desc">${escapeHtml(t.description || 'No description provided.')}</div>
        <div class="ticket-id">#${t.id.slice(0, 8)} · ${timeAgo(t.createdAt)}</div>
      </td>
      <td>
        <span class="badge" style="color:${t.teamColor}; background:${t.teamColor}1a;">
          <span class="dot" style="background:${t.teamColor}"></span>${t.teamName}
        </span>
      </td>
      <td>
        <div class="confidence-bar">
          <div class="confidence-track"><div class="confidence-fill" style="width:${Math.round(t.confidence * 100)}%"></div></div>
          <span class="confidence-pct">${Math.round(t.confidence * 100)}%</span>
        </div>
      </td>
      <td><span class="badge priority-${t.priority}">${t.priority}</span></td>
      <td><span class="status-pill status-${t.status}">${t.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="toggle-status">${t.status === 'Open' ? 'Resolve' : 'Reopen'}</button>
          <button class="danger delete-ticket">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function lightRail(teamKey) {
  const lane = els.railTrack.querySelector(`.rail-lane[data-team="${teamKey}"]`);
  if (!lane) return;
  lane.classList.add('lit');
  setTimeout(() => lane.classList.remove('lit'), 1000);
}

async function refreshAll() {
  await Promise.all([loadTeams(), loadStats(), loadTickets()]);
}

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject = els.subject.value.trim();
  const description = els.description.value.trim();
  if (!subject) return;

  els.submitBtn.disabled = true;
  els.submitBtn.querySelector('.btn-label').textContent = 'Routing…';

  try {
    const res = await fetch(`${API}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, description }),
    });
    if (!res.ok) throw new Error('Failed to create ticket');
    const ticket = await res.json();

    els.form.reset();
    await refreshAll();
    lightRail(ticket.team);
    showToast(`Routed to ${ticket.teamName} · ${Math.round(ticket.confidence * 100)}% confidence`);
  } catch (err) {
    showToast('Something went wrong. Please try again.');
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.querySelector('.btn-label').textContent = 'Route ticket';
  }
});

els.ticketBody.addEventListener('click', async (e) => {
  const row = e.target.closest('tr');
  if (!row) return;
  const id = row.dataset.id;

  if (e.target.classList.contains('toggle-status')) {
    const isOpen = e.target.textContent.trim() === 'Resolve';
    await fetch(`${API}/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isOpen ? 'Resolved' : 'Open' }),
    });
    showToast(isOpen ? 'Ticket resolved' : 'Ticket reopened');
    await refreshAll();
  }

  if (e.target.classList.contains('delete-ticket')) {
    await fetch(`${API}/tickets/${id}`, { method: 'DELETE' });
    showToast('Ticket deleted');
    await refreshAll();
  }
});

els.filterTeam.addEventListener('change', loadTickets);
els.filterStatus.addEventListener('change', loadTickets);

(async function init() {
  const user = await checkAuth();
  if (user) refreshAll();
})();
