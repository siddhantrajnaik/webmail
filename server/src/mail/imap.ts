import { ImapFlow } from 'imapflow';
import type { ImapFlowOptions } from 'imapflow';

export interface ImapCredentials {
  user: string;
  password: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

const IITD_IMAP = {
  host: 'mailstore.iitd.ac.in',
  port: 993,
  secure: true,
};

export class MailClient {
  private client: ImapFlow | null = null;
  private creds: ImapCredentials;

  constructor(creds: ImapCredentials) {
    this.creds = {
      ...IITD_IMAP,
      ...creds,
    };
  }

  async connect() {
    this.client = new ImapFlow(this.creds);
    await this.client.connect();
  }

  async disconnect() {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }

  async listFolders() {
    if (!this.client) throw new Error('Not connected');
    const folders: string[] = [];
    for await (const mailbox of this.client.listMailboxes()) {
      folders.push(mailbox.name);
    }
    return folders;
  }

  async fetchEmails(folder: string = 'INBOX', limit = 50, offset = 0) {
    if (!this.client) throw new Error('Not connected');
    const lock = await this.client.getMailboxLock(folder);
    try {
      const mails: any[] = [];
      const uids = await this.client.search('ALL', { uid: true });
      const page = uids.slice(-(offset + limit), uids.length - offset);
      for (const uid of page.reverse()) {
        const mail = await this.client.download(uid, { uid: true });
        mails.push({
          uid: mail.uid,
          from: mail.from?.text || '',
          to: mail.to?.text || '',
          subject: mail.subject || '(no subject)',
          date: mail.date,
          text: await mail.getText(),
          flags: await mail.flags.get(),
        });
      }
      return mails;
    } finally {
      lock.release();
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!this.client) throw new Error('Not connected');
    const creds = this.creds;
    await this.client.mailBox('Sent', { create: true });
    const msg = `From: ${creds.user}
To: ${to}
Subject: ${subject}
Content-Type: text/plain; charset=utf-8

${body}`;
    await this.client.append(msg, { flags: ['\\Seen'], uid: true });
    return { success: true };
  }
}

// SMTP for sending (separate from IMAP)
import nodemailer from 'nodemailer';

export function createSmtpTransporter(creds: ImapCredentials) {
  return nodemailer.createTransport({
    host: 'smtp.iitd.ac.in',
    port: 465,
    secure: true,
    auth: { user: creds.user, pass: creds.password },
  });
}
