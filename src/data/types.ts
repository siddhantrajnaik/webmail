export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  timestamp: Date;
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
  read: boolean;
  starred: boolean;
  category: 'course' | 'admin' | 'hostel' | 'research' | 'personal';
  hasAttachment?: boolean;
  labels?: string[];
}

export type Folder = Email['folder'];
