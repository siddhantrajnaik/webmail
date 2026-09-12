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

// ponytail: imapflow v1 types are incomplete, use any cast
const Flow: any = ImapFlow;

export class MailClient {
  private client: any = null;

  constructor(private creds: ImapCredentials) {}

  async connect() {
    this.client = new Flow({
      host: IITD_IMAP.host,
      port: IITD_IMAP.port,
      secure: IITD_IMAP.secure,
      auth: { user: this.creds.user, pass: this.creds.password },
    });
    await this.client.connect();
  }

  async disconnect() {
    if (this.client) {
      await this.client.logout();
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
      const seqStart = Math.max(1, count - limit + 1);
      const mails: any[] = [];
      for await (const msg of this.client.fetch(`${seqStart}:${count}`, { envelope: true, flags: true, bodyParts: ['1'] }, { uid: true })) {
        const env = msg.envelope;
        if (!env) continue;
        const fromArr = env.from as Array<{ address?: string }> | undefined;
        const text = msg.bodyParts?.get('1');
        mails.push({
          uid: msg.uid,
          from: fromArr?.length ? (fromArr[0].address || '') : '',
          subject: env.subject || '(no subject)',
          date: env.date || new Date(),
          text: text ? text.toString('utf-8') : '',
          flags: Array.from(msg.flags ?? []),
        });
      }
      return mails;
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
