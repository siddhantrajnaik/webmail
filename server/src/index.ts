import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MailClient, createSmtpTransporter } from './mail/imap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001');
const FRONTEND_DIST = join(__dirname, '..', '..', 'dist');

// ponytail: in-memory session store, fine for single-user desktop app
const connections = new Map<string, MailClient>();
// ponytail: store passwords per session for SMTP send
const passwords = new Map<string, string>();

const corsOrigin = process.env.CORS_ORIGIN || true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.use(session({
  name: 'iitd.session',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/api', async (req, res, next) => {
  // API routes
  if (req.method === 'POST' && req.path === '/login') {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    try {
      const client = new MailClient({
        user: `${username}@iitd.ac.in`,
        password,
      });
      await client.connect();
      (req.session as any).user = username;
      (req.session as any).connected = true;
      connections.set(username, client);
      passwords.set(username, password);
      res.json({ success: true, user: username });
    } catch (err: any) {
      res.status(401).json({ error: `Authentication failed: ${err.message}` });
    }
    return;
  }
  if (req.method === 'POST' && req.path === '/logout') {
    const username = (req.session as any).user;
    if (username && connections.has(username)) {
      const client = connections.get(username)!;
      await client.disconnect().catch(() => {});
      connections.delete(username);
      passwords.delete(username);
    }
    req.session.destroy(() => {});
    res.json({ success: true });
    return;
  }
  if (req.method === 'GET' && req.path === '/status') {
    res.json({ authenticated: !!(req.session as any).connected });
    return;
  }
  next();
});

// ponytail: serve static frontend from root dist/
app.use(express.static(FRONTEND_DIST));

// No-cache for HTML so stale SPA shells don't stick
app.get('*.html', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.get('/api/folders', async (req, res) => {
  try {
    const client = getClient(req);
    const folders = await client.listMailboxes();
    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/emails', async (req, res) => {
  try {
    const client = getClient(req);
    const limit = parseInt((req.query.limit as string) || '50');
    const mails = await client.fetchMessages(limit);
    res.json({ emails: mails });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body required' });
    }
    const username = (req.session as any).user as string;
    const password = passwords.get(username);
    if (!password) return res.status(401).json({ error: 'Session expired' });

    const transporter = createSmtpTransporter({ user: `${username}@iitd.ac.in`, password });
    await transporter.sendMail({
      from: `${username}@iitd.ac.in`,
      to,
      subject,
      text: body,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(FRONTEND_DIST, 'index.html'));
});

function getClient(req: any): MailClient {
  const username = req.session.user;
  if (!username || !connections.has(username)) {
    throw new Error('Not authenticated');
  }
  return connections.get(username)!;
}

app.listen(PORT, () => {
  console.log(`Mail server running on port ${PORT}`);
});

