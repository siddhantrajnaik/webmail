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

  async disconnect() {
    if (this.client) {
      try { await this.client.logout(); } catch {}
      this.client = null;
    }
  }

  async listMailboxes(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');
    const mbs = await this.client.list();
    return mbs.map((mb: any) => mb.path);
  }

  async fetchMessages(folder = 'INBOX', limit = 50): Promise<any[]> {
    if (!this.client) throw new Error('Not connected');
    await this.client.mailboxOpen(folder, { readOnly: true });
    try {
      const status = await this.client.status(folder, { messages: true });
      const count = status.messages ?? 0;
      if (count === 0) return [];
      const seqStart = Math.max(1, count - limit + 1);
      const mails: any[] = [];
      for await (const msg of this.client.fetch(`${seqStart}:${count}`, { envelope: true, flags: true }, { uid: true })) {
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
      return mails;
    } finally {
      await this.client.mailboxClose();
    }
  }

  async fetchMessageBody(folder: string, uid: number): Promise<string> {
    if (!this.client) throw new Error('Not connected');
    await this.client.mailboxOpen(folder, { readOnly: true });
    try {
      const msg = await this.client.fetchOne(uid, { bodyParts: ['1'] }, { uid: true, source: true });
      const text = msg.source?.toString('utf-8');
      // Strip headers to get plain text body
      if (text) {
        const lines = text.split('\n');
        const bodyStart = lines.findIndex((l: string) => l.trim() === '');
        if (bodyStart >= 0) {
          return lines.slice(bodyStart + 1).join('\n').trim();
        }
      }
      return text || '';
    } finally {
      await this.client.mailboxClose();
    }
  }
}

export function createSmtpTransporter(creds: ImapCredentials) {
  return nodemailer.createTransport({
    host: 'smtp.iitd.ac.in',
    port: 465,
    secure: true,
    auth: { user: creds.user, pass: creds.password },
  });
}
