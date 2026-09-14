import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';

const IITD_IMAP = {
  host: 'mailstore.iitd.ac.in',
  port: 993,
  secure: true,
};

export interface ImapCredentials {
  user: string;
  password: string;
}

const Flow: any = ImapFlow;

export class MailClient {
  private client: any = null;

  constructor(private creds: ImapCredentials) {}

  async connect(timeoutMs = 15000) {
    this.client = new Flow({
      host: IITD_IMAP.host,
      port: IITD_IMAP.port,
      secure: IITD_IMAP.secure,
      auth: { user: this.creds.user, pass: this.creds.password },
      connectTimeout: timeoutMs,
      greetTimeout: timeoutMs,
    });
    await this.client.connect();
  }

  // IMAP servers drop idle connections; reconnect instead of failing the request.
  async ensureConnected() {
    if (!this.client?.usable) await this.connect();
  }

  async disconnect() {
    if (this.client) {
      try { await this.client.logout(); } catch {}
      this.client = null;
    }
  }

  // Number of messages in a folder, used to tell a real mailbox from an empty
  // namespace that the server happily authenticated us into.
  async messageCount(folder = 'INBOX'): Promise<number> {
    if (!this.client) throw new Error('Not connected');
    const lock = await this.client.getMailboxLock(folder, { readOnly: true });
    try {
      return this.client.mailbox?.exists ?? 0;
    } finally {
      lock.release();
    }
  }

  async listMailboxes(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');
    const mbs = await this.client.list();
    return mbs.map((mb: any) => mb.path);
  }

  async fetchMessages(folder = 'INBOX', limit = 50): Promise<any[]> {
    if (!this.client) throw new Error('Not connected');
    // Lock rather than open/close: one client serves concurrent requests.
    const lock = await this.client.getMailboxLock(folder, { readOnly: true });
    try {
      const count = this.client.mailbox?.exists ?? 0;
      console.log(`[fetch] ${folder}: exists=${count}`);
      if (count === 0) return [];
      const seqStart = Math.max(1, count - limit + 1);
      const mails: any[] = [];
      // No `uid` option: the range is sequence numbers, not UIDs.
      for await (const msg of this.client.fetch(`${seqStart}:${count}`, { uid: true, envelope: true, flags: true })) {
        const env = msg.envelope;
        if (!env) continue;
        const fromArr = env.from as Array<{ address?: string; name?: string }> | undefined;
        mails.push({
          uid: msg.uid,
          from: fromArr?.length ? (fromArr[0].name || fromArr[0].address || '') : '',
          fromEmail: fromArr?.length ? (fromArr[0].address || '') : '',
          subject: env.subject || '(no subject)',
          date: env.date || new Date(),
          text: '', // body fetched lazily
          flags: Array.from(msg.flags ?? []),
        });
      }
      console.log(`[fetch] ${folder}: returned=${mails.length}`);
      return mails.reverse(); // newest first
    } finally {
      lock.release();
    }
  }

  async fetchMessageBody(folder: string, uid: number): Promise<string> {
    if (!this.client) throw new Error('Not connected');
    const lock = await this.client.getMailboxLock(folder, { readOnly: true });
    try {
      const msg = await this.client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
      if (!msg) return '';
      const part = findTextPart(msg.bodyStructure);
      // download() decodes transfer-encoding and converts charset to UTF-8.
      const dl = await this.client.download(String(uid), part.id, { uid: true });
      if (!dl?.content) return '';
      const chunks: Buffer[] = [];
      for await (const chunk of dl.content) chunks.push(chunk as Buffer);
      const text = Buffer.concat(chunks).toString('utf-8').trim();
      return part.isHtml ? htmlToText(text) : text;
    } finally {
      lock.release();
    }
  }
}

// Pick the part to show: plain text if the message has one, else HTML.
function findTextPart(node: any): { id: string; isHtml: boolean } {
  const fallback = { id: '1', isHtml: false };
  if (!node) return fallback;

  const flat: any[] = [];
  const walk = (n: any) => {
    if (!n) return;
    flat.push(n);
    (n.childNodes ?? []).forEach(walk);
  };
  walk(node);

  const pick = (type: string) =>
    flat.find(n => n.type === type && n.disposition !== 'attachment');

  const plain = pick('text/plain');
  if (plain) return { id: plain.part || '1', isHtml: false };

  const html = pick('text/html');
  if (html) return { id: html.part || '1', isHtml: true };

  return fallback;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function createSmtpTransporter(creds: ImapCredentials) {
  return nodemailer.createTransport({
    host: 'smtp.iitd.ac.in',
    port: 465,
    secure: true,
    auth: { user: creds.user, pass: creds.password },
  });
}
