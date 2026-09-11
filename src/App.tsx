import { useState } from 'react';
import Sidebar from './components/Sidebar';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import Login from './components/Login';
import { demoEmails } from './data/emails';
import type { Folder } from './data/types';
import './index.css';

const folders: { id: Folder; label: string; icon: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'sent', label: 'Sent', icon: 'send' },
  { id: 'drafts', label: 'Drafts', icon: 'draft' },
  { id: 'archive', label: 'Archive', icon: 'archive' },
  { id: 'trash', label: 'Trash', icon: 'delete' },
];

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  const filtered = demoEmails.filter(e => e.folder === activeFolder);
  const selected = demoEmails.find(e => e.id === selectedEmailId) ?? null;
  const unreadCount = demoEmails.filter(e => e.folder === 'inbox' && !e.read).length;

  return (
    <div className="flex h-screen bg-[#FAF6F0] overflow-hidden">
      <Sidebar
        folders={folders.map(f => ({
          ...f,
          count: f.id === 'inbox' ? unreadCount : 0
        }))}
        active={activeFolder}
        onSelect={setActiveFolder}
      />
      <EmailList
        emails={filtered}
        activeId={selectedEmailId}
        onSelect={setSelectedEmailId}
      />
      {selected ? (
        <EmailDetail email={selected} />
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
