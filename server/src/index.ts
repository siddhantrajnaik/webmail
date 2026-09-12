import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { MailClient, createSmtpTransporter } from './mail/imap.js';

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory session store (ponytail: single-user desktop app, replace with Redis if needed)
// ponytail: per-user IMAP connections, global Map is fine for <50 users
const connections = new Map<string, MailClient>();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
  name: 'iitd.session',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// --- Auth ---

app.post('/api/login', async (req, res) => {
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
    req.session.user = username;
    req.session.connected = true;
    connections.set(username, client);
    res.json({ success: true, user: username });
  } catch (err: any) {
    res.status(401).json({ error: `Authentication failed: ${err.message}` });
  }
});

app.post('/api/logout', async (req, res) => {
  const username = req.session.user as string | undefined;
  if (username && connections.has(username)) {
    const client = connections.get(username)!;
    await client.disconnect().catch(() => {});
    connections.delete(username);
  }
  req.session.destroy(() => {});
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({ authenticated: !!(req.session as any).connected });
});

// --- Folders ---

app.get('/api/folders', async (req, res) => {
  try {
    const client = getClient(req);
    const folders = await client.listFolders();
    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Emails ---

app.get('/api/emails', async (req, res) => {
  try {
    const client = getClient(req);
    const folder = (req.query.folder as string) || 'INBOX';
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = parseInt((req.query.offset as string) || '0');
    const mails = await client.fetchEmails(folder, limit, offset);
    res.json({ emails: mails });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Send ---

app.post('/api/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body required' });
    }
    const creds = { user: (req.session.user as string) + '@iitd.ac.in', password: '' };
    // Use SMTP transporter for sending
    const transporter = createSmtpTransporter(creds);
    await transporter.sendMail({
      from: `${req.session.user}@iitd.ac.in`,
      to,
      subject,
      text: body,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Helpers ---

function getClient(req: any): MailClient {
  const username = req.session.user;
  if (!username || !connections.has(username)) {
    throw new Error('Not authenticated');
  }
  return connections.get(username)!;
}

app.listen(PORT, () => {
  console.log(`Mail server running on http://localhost:${PORT}`);
});
