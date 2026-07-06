const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'vandhu-ticket-routing-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
}));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// AUTH — in-memory users
// ---------------------------------------------------------------------------
let users = [];

function seedUsers() {
  const passwordHash = bcrypt.hashSync('admin123', 8);
  users.push({ id: randomUUID(), username: 'admin', name: 'Admin', passwordHash });
}
seedUsers();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

app.post('/api/auth/signup', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const existing = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }
  const passwordHash = bcrypt.hashSync(password, 8);
  const user = { id: randomUUID(), username, name: name || username, passwordHash };
  users.push(user);
  req.session.userId = user.id;
  res.status(201).json({ id: user.id, username: user.username, name: user.name });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username, name: user.name });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = users.find((u) => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ id: user.id, username: user.username, name: user.name });
});

// ---------------------------------------------------------------------------
// TEAMS
// ---------------------------------------------------------------------------
const TEAMS = {
  billing: { name: 'Billing & Payments', color: '#35C495' },
  technical: { name: 'Technical Support', color: '#4C9AFF' },
  account: { name: 'Account & Access', color: '#9B7BFF' },
  engineering: { name: 'Engineering (Bugs)', color: '#FF5C5C' },
  sales: { name: 'Sales & Pricing', color: '#F2A93B' },
  security: { name: 'Security & Abuse', color: '#FF3D81' },
  general: { name: 'General Support', color: '#8B93A7' },
};

// ---------------------------------------------------------------------------
// ROUTING ENGINE  (keyword weighted scoring — swap in an LLM/API call later)
// ---------------------------------------------------------------------------
const KEYWORD_MAP = {
  billing: ['invoice', 'payment', 'charge', 'charged', 'refund', 'billing', 'subscription',
    'price', 'card declined', 'declined', 'receipt', 'overcharged', 'auto-renew', 'plan cost'],
  technical: ['error', 'not working', 'broken', 'slow', 'crash', 'crashed', 'bug', 'loading',
    'timeout', 'installation', 'install', 'update failed', 'sync', 'performance', 'freeze', 'freezing'],
  account: ['login', 'log in', 'password', 'reset', 'locked out', 'access', 'permission',
    '2fa', 'two-factor', 'account', 'sign in', 'signin', 'username', 'verify email'],
  engineering: ['stack trace', 'exception', '500 error', 'api fail', 'null pointer', 'regression',
    'reproduce', 'console error', 'server error', 'deployment', 'production down'],
  sales: ['quote', 'demo', 'upgrade', 'enterprise', 'discount', 'purchase', 'pricing plan',
    'trial', 'contract', 'renew contract', 'sales rep'],
  security: ['hack', 'hacked', 'breach', 'phishing', 'suspicious', 'unauthorized', 'vulnerability',
    'malware', 'leaked', 'compromised', 'fraud'],
};

const URGENT_WORDS = ['urgent', 'asap', 'immediately', 'critical', 'production down', 'down',
  'losing money', 'can\'t access', 'cannot access', 'emergency', 'right now'];

function classifyTicket(subject = '', description = '') {
  const text = `${subject} ${description}`.toLowerCase();
  const scores = {};

  for (const [team, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += kw.split(' ').length > 1 ? 2 : 1;
    }
    if (score > 0) scores[team] = score;
  }

  let bestTeam = 'general';
  let bestScore = 0;
  for (const [team, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTeam = team;
    }
  }

  const totalPossible = bestScore || 1;
  const confidence = bestTeam === 'general' ? 0.4 : Math.min(0.5 + bestScore * 0.12, 0.98);

  let priority = 'Medium';
  const urgentHit = URGENT_WORDS.some((w) => text.includes(w));
  if (urgentHit) priority = 'High';
  else if (text.length < 40) priority = 'Low';

  return {
    team: bestTeam,
    teamName: TEAMS[bestTeam].name,
    teamColor: TEAMS[bestTeam].color,
    confidence: Number(confidence.toFixed(2)),
    priority,
    matchedScore: bestScore,
  };
}

// ---------------------------------------------------------------------------
// IN-MEMORY STORE
// ---------------------------------------------------------------------------
let tickets = [];

function seed() {
  const samples = [
    ['Payment charged twice this month', 'My card was billed twice for the same subscription cycle, please refund.'],
    ['App crashes on startup', 'Every time I open the app it freezes and then crashes immediately.'],
    ['Cannot log in to my account', 'I reset my password but it still says invalid credentials, locked out.'],
    ['URGENT: production down', 'Our API is returning 500 errors in production, this is critical, losing money.'],
    ['Interested in enterprise plan', 'Can someone send me a quote and demo for the enterprise upgrade?'],
    ['Suspicious login attempt', 'I got an alert about an unauthorized login from another country, possible breach.'],
  ];
  samples.forEach(([subject, description]) => {
    const routing = classifyTicket(subject, description);
    tickets.push({
      id: randomUUID(),
      subject,
      description,
      status: 'Open',
      createdAt: new Date().toISOString(),
      ...routing,
    });
  });
}
seed();

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------
app.get('/api/teams', requireAuth, (req, res) => {
  const counts = Object.keys(TEAMS).reduce((acc, key) => {
    acc[key] = tickets.filter((t) => t.team === key && t.status === 'Open').length;
    return acc;
  }, {});
  const payload = Object.entries(TEAMS).map(([key, val]) => ({
    key,
    ...val,
    openCount: counts[key],
  }));
  res.json(payload);
});

app.get('/api/tickets', requireAuth, (req, res) => {
  const { team, status } = req.query;
  let result = [...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (team && team !== 'all') result = result.filter((t) => t.team === team);
  if (status && status !== 'all') result = result.filter((t) => t.status === status);
  res.json(result);
});

app.post('/api/tickets', requireAuth, (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required.' });
  }
  const routing = classifyTicket(subject, description || '');
  const ticket = {
    id: randomUUID(),
    subject: subject.trim(),
    description: (description || '').trim(),
    status: 'Open',
    createdAt: new Date().toISOString(),
    ...routing,
  };
  tickets.unshift(ticket);
  res.status(201).json(ticket);
});

app.patch('/api/tickets/:id', requireAuth, (req, res) => {
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const { status, team } = req.body;
  if (status) ticket.status = status;
  if (team && TEAMS[team]) {
    ticket.team = team;
    ticket.teamName = TEAMS[team].name;
    ticket.teamColor = TEAMS[team].color;
    ticket.confidence = 1;
    ticket.reassigned = true;
  }
  res.json(ticket);
});

app.delete('/api/tickets/:id', requireAuth, (req, res) => {
  const before = tickets.length;
  tickets = tickets.filter((t) => t.id !== req.params.id);
  if (tickets.length === before) return res.status(404).json({ error: 'Ticket not found.' });
  res.status(204).end();
});

app.get('/api/stats', requireAuth, (req, res) => {
  res.json({
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'Open').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
    highPriority: tickets.filter((t) => t.priority === 'High' && t.status === 'Open').length,
  });
});

app.listen(PORT, () => {
  console.log(`Ticket Routing Agent running at http://localhost:${PORT}`);
});
