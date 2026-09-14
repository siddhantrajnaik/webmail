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

// Departmental mailboxes live on subdomains (e.g. bioschool.iitd.ac.in), so a
// hardcoded @iitd.ac.in locks those users out. A bare kerberos ID is tried
// against each domain in turn; a full address is used exactly as typed.
const MAIL_DOMAINS = (process.env.MAIL_DOMAINS || 'iitd.ac.in,bioschool.iitd.ac.in')
  .split(',').map(d => d.trim()).filter(Boolean);

// Dovecot here accepts any domain but resolves each to its own namespace, so a
// domain-qualified login can land in an empty mailbox. The bare kerberos ID is
// the canonical username, so try it first and fall back to the domains.
const candidateAddresses = (username: string) =>
  username.includes('@')
    ? [username]
    : [username, ...MAIL_DOMAINS.map(d => `${username}@${d}`)];

// Resolved address per user, so SMTP sends from the domain that actually authenticated.
const addresses = new Map<string, string>();

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
    // Several candidates may authenticate while only one holds the real mail,
    // so prefer the first with a non-empty INBOX; keep the first that merely
    // authenticated as a fallback.
    let client: MailClient | null = null;
    let address = '';
    let fallback: MailClient | null = null;
    let fallbackAddress = '';
    let lastErr: any = null;

    for (const candidate of candidateAddresses(username)) {
      const attempt = new MailClient({ user: candidate, password });
      try {
        await attempt.connect();
        const count = await attempt.messageCount('INBOX').catch(() => 0);
        console.log(`[login] ${candidate}: authenticated, INBOX=${count}`);
        if (count > 0) {
          client = attempt;
          address = candidate;
          break;
        }
        if (!fallback) {
          fallback = attempt;
          fallbackAddress = candidate;
        } else {
          await attempt.disconnect().catch(() => {});
        }
      } catch (err: any) {
        lastErr = err;
        console.log(`[login] ${candidate}: failed - ${err.message}`);
        await attempt.disconnect().catch(() => {});
      }
    }

    if (!client && fallback) {
      client = fallback;
      address = fallbackAddress;
    } else if (fallback && fallback !== client) {
      await fallback.disconnect().catch(() => {});
    }

    if (!client) {
      return res.status(401).json({ error: `Authentication failed: ${lastErr?.message ?? 'unknown error'}` });
    }
    console.log(`[login] using ${address}`);

    (req.session as any).user = username;
    (req.session as any).address = address;
    (req.session as any).connected = true;
    connections.set(username, client);
    passwords.set(username, password);
    addresses.set(username, address);
    res.json({ success: true, user: username, address });
    return;
  }
  if (req.method === 'POST' && req.path === '/logout') {
    const username = (req.session as any).user;
    if (username && connections.has(username)) {
      const client = connections.get(username)!;
      await client.disconnect().catch(() => {});
      connections.delete(username);
      passwords.delete(username);
      addresses.delete(username);
    }
    req.session.destroy(() => {});
    res.json({ success: true });
    return;
  }
  if (req.method === 'GET' && req.path === '/status') {
    // The session cookie outlives the process, but `connections` does not. A
    // cookie alone is not a usable session: report it honestly so the client
    // shows the login form instead of an inbox that can never load.
    const u = (req.session as any).user ?? null;
    const live = !!(req.session as any).connected && !!u && connections.has(u);
    if ((req.session as any).connected && !live) {
      console.log(`[status] session for ${u} has no live connection (restart?); re-login required`);
    }
    res.json({
      authenticated: live,
      user: live ? u : null,
      address: live ? (req.session as any).address ?? null : null,
    });
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

    const from = (req.session as any).address || addresses.get(username) || username;
    const transporter = createSmtpTransporter({ user: from, password });
    await transporter.sendMail({
      from,
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

