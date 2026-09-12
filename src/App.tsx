import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import Login from './components/Login';
import type { Email, Folder } from './data/types';
import './index.css';

const FOLDER_LIST = [
  { id: 'inbox' as Folder, label: 'Inbox', icon: 'inbox' },
  { id: 'sent' as Folder, label: 'Sent', icon: 'send' },
  { id: 'drafts' as Folder, label: 'Drafts', icon: 'draft' },
  { id: 'archive' as Folder, label: 'Archive', icon: 'archive' },
  { id: 'trash' as Folder, label: 'Trash', icon: 'delete' },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const apiFolder = useCallback((f: Folder) => f === 'inbox' ? 'INBOX' : f.toUpperCase(), []);

  const fetchEmails = useCallback(async (folder: Folder) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emails?folder=${apiFolder(folder)}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const mapped = (data.emails || []).map((m: any) => ({
          id: String(m.uid),
          from: m.from,
          fromEmail: m.from,
          subject: m.subject || '(no subject)',
          body: m.text || '',
          timestamp: m.date ? new Date(m.date) : new Date(),
          folder: folder,
          read: m.flags?.includes('\\Seen') ?? false,
          starred: false,
          category: 'personal' as const,
          hasAttachment: false,
        }));
        setEmails(mapped);
        setUnreadCount(mapped.filter((e: Email) => !e.read).length);
      }
    } catch (err) {
      console.error('fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFolder]);

  const emailsRef = useRef(emails);
  emailsRef.current = emails;

  const handleSelectEmail = useCallback((id: string) => {
    const found = emailsRef.current.find(e => e.id === id);
    if (found) setSelectedEmail(found);
  }, []);

  // Check session on mount
  useEffect(() => {
    fetch('/api/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setAuthenticated(true);
          fetchEmails('inbox');
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [fetchEmails]);

  // Fetch on folder change
  useEffect(() => {
    if (authenticated) fetchEmails(activeFolder);
  }, [authenticated, activeFolder, fetchEmails]);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
    setEmails([]);
    setSelectedEmail(null);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAF6F0]">
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-[#FF5722] animate-spin">progress_activity</span>
          <p className="font-headline text-[14px] font-bold text-[#52525B] mt-3">Connecting…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLogin={() => { setAuthenticated(true); fetchEmails('inbox'); }} />;
  }

  return (
    <div className="flex h-screen bg-[#FAF6F0] overflow-hidden">
      <Sidebar
        folders={FOLDER_LIST.map(f => ({
          ...f,
          count: f.id === 'inbox' ? unreadCount : 0,
        }))}
        active={activeFolder}
        onSelect={(id) => { setActiveFolder(id); setSelectedEmail(null); }}
        onLogout={handleLogout}
      />
      <EmailList
        emails={emails}
        activeId={selectedEmail?.id ?? null}
        onSelect={handleSelectEmail}
        loading={loading}
      />
      {selectedEmail ? (
        <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#FAF6F0]">
          <div className="text-center">
            <span className="material-symbols-outlined text-[64px] text-[#dcd9dd]">mail</span>
            <p className="font-headline text-[16px] font-bold text-[#52525B] mt-3">Select an email</p>
          </div>
        </div>
      )}
    </div>
  );
}
