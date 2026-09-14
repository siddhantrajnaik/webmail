import { useState, useEffect, useCallback } from 'react';
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

// Colour the avatar by who sent it, so the category palette carries meaning.
function categorize(address: string): Email['category'] {
  const a = (address || '').toLowerCase();
  if (/(cse|ee|maths|phy|chem|civil|mech|am|textile)\./.test(a)) return 'course';
  if (/(hostel|warden|kailash|karakoram|nilgiri|aravali|jwala|himadri|vindy|zanskar)/.test(a)) return 'hostel';
  if (/(admin|academics|registrar|accounts|placement|library)/.test(a)) return 'admin';
  if (/(irdunit|research|lab|project|conf)/.test(a)) return 'research';
  return 'personal';
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState('');
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const apiFolder = useCallback((f: Folder) => f === 'inbox' ? 'INBOX' : f.toUpperCase(), []);

  const api = (path: string) => path;

  const fetchEmails = useCallback(async (folder: Folder) => {
    setLoading(true);
    try {
      const res = await fetch(api(`/api/emails?folder=${apiFolder(folder)}`), { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const mapped = (data.emails || []).map((m: any) => ({
          id: String(m.uid),
          from: m.from,
          fromEmail: m.fromEmail || m.from,
          subject: m.subject || '(no subject)',
          body: m.text || '',
          timestamp: m.date ? new Date(m.date) : new Date(),
          folder: folder,
          read: m.flags?.includes('\\Seen') ?? false,
          starred: m.flags?.includes('\\Flagged') ?? false,
          category: categorize(m.fromEmail || m.from),
          hasAttachment: false,
        }));
        setEmails(mapped);
      }
    } catch (err) {
      console.error('fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFolder]);

  // Selection is derived from the list, so a mail can't go stale against it.
  const selectedEmail = emails.find(e => e.id === selectedId) ?? null;
  const unreadCount = emails.filter(e => !e.read).length;

  const visibleEmails = query.trim()
    ? emails.filter(e => {
        const q = query.toLowerCase();
        return e.subject.toLowerCase().includes(q)
          || e.from.toLowerCase().includes(q)
          || e.fromEmail.toLowerCase().includes(q);
      })
    : emails;

  // Opening a mail marks it read, so the unread badge actually moves.
  const handleSelectEmail = useCallback((id: string) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => (e.id === id ? { ...e, read: true } : e)));
  }, []);

  // Check session on mount
  useEffect(() => {
    fetch(api('/api/status'), { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setAuthenticated(true);
          setUser(data.user || '');
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
    setSelectedId(null);
    setUser('');
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
    return <Login onLogin={(u) => { setAuthenticated(true); setUser(u); fetchEmails('inbox'); }} />;
  }

  return (
    <div className="flex h-screen bg-[#FAF6F0] overflow-hidden">
      {/* Sidebar: a column on desktop, a slide-over drawer on phones */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-[232px] transition-transform duration-200 ease-out
          md:static md:z-auto md:translate-x-0 md:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar
          folders={FOLDER_LIST.map(f => ({
            ...f,
            count: f.id === 'inbox' ? unreadCount : 0,
          }))}
          active={activeFolder}
          user={user}
          onSelect={(id) => { setActiveFolder(id); setSelectedId(null); setSidebarOpen(false); }}
          onLogout={handleLogout}
        />
      </div>
      {sidebarOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* List: full width on phones, fixed column beside the reader on desktop */}
      <div
        className={`h-full w-full md:w-[360px] md:shrink-0 md:border-r-[2.5px] md:border-black
          ${selectedEmail ? 'hidden md:block' : 'block'}`}
      >
        <EmailList
          emails={visibleEmails}
          activeId={selectedId}
          onSelect={handleSelectEmail}
          loading={loading}
          title={FOLDER_LIST.find(f => f.id === activeFolder)?.label ?? 'Inbox'}
          query={query}
          onQueryChange={setQuery}
          onOpenMenu={() => setSidebarOpen(true)}
        />
      </div>

      {/* Reader: takes over the screen on phones once a mail is open */}
      <div className={`h-full flex-1 min-w-0 ${selectedEmail ? 'block' : 'hidden md:block'}`}>
        {selectedEmail ? (
          <EmailDetail email={selectedEmail} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="h-full flex items-center justify-center bg-[#FAF6F0]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border-[2.5px] border-black shadow-[4px_4px_0px_#18181B] flex items-center justify-center rotate-[-3deg]">
                <span className="material-symbols-outlined text-[32px] text-[#52525B]">mail</span>
              </div>
              <p className="font-headline text-[15px] font-bold text-black mt-4">Nothing open</p>
              <p className="font-body text-[13px] text-[#52525B] mt-1">Pick a message to read it here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
