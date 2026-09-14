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

app.get('/api/folders', async (req, res) => {
  try {
    const client = await getClient(req);
    const folders = await client.listMailboxes();
    res.json({ folders });
  } catch (err: any) {
    fail(res, err);
  }
});

app.get('/api/emails', async (req, res) => {
  try {
    const client = await getClient(req);
    const folder = (req.query.folder as string) || 'INBOX';
    const limit = parseInt((req.query.limit as string) || '50');
    const mails = await client.fetchMessages(folder, limit);
    res.json({ emails: mails });
  } catch (err: any) {
    fail(res, err);
  }
});

app.get('/api/emails/:uid/body', async (req, res) => {
  try {
    const client = await getClient(req);
    const folder = (req.query.folder as string) || 'INBOX';
    const uid = parseInt(req.params.uid);
    const text = await client.fetchMessageBody(folder, uid);
    res.json({ body: text });
  } catch (err: any) {
    fail(res, err);
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
    fail(res, err);
  }
});

// Unknown API routes must 404 as JSON, not fall through to the SPA shell.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// No-cache for HTML so stale SPA shells don't stick. Must precede static.
app.get('*.html', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// ponytail: serve static frontend from root dist/
app.use(express.static(FRONTEND_DIST));

// SPA fallback
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(join(FRONTEND_DIST, 'index.html'));
});

// A dead session is a 401, not a server error - the client needs to tell them apart.
function fail(res: any, err: any) {
  const msg = err?.message || 'Request failed';
  res.status(msg === 'Not authenticated' ? 401 : 500).json({ error: msg });
}

async function getClient(req: any): Promise<MailClient> {
  const username = req.session.user;
  if (!username || !connections.has(username)) {
    throw new Error('Not authenticated');
  }
  const client = connections.get(username)!;
  await client.ensureConnected();
  return client;
}

app.listen(PORT, () => {
  console.log(`Mail server running on port ${PORT}`);
});

