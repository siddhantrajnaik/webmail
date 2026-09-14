import type { Email } from '../data/types';
import { initialsOf } from '../data/format';

interface EmailListProps {
  emails: Email[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  title: string;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenMenu: () => void;
}

const categoryColors: Record<string, string> = {
  course: '#2DD4BF',
  admin: '#3B82F6',
  hostel: '#FFD233',
  research: '#FF5722',
  personal: '#FF7597',
};

function fmtTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function EmailList({ emails, activeId, onSelect, loading, title, query, onQueryChange, onOpenMenu }: EmailListProps) {
  const unread = emails.filter(e => !e.read).length;
  return (
    <div className="flex flex-col h-full bg-[#FAF6F0]">
      <div className="p-4 border-b-[2.5px] border-black">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="md:hidden p-1.5 -ml-1 rounded-lg border-2 border-black bg-white shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
          <h2 className="font-headline text-[18px] font-extrabold uppercase tracking-tight">{title}</h2>
          {unread > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#FF5722] text-white font-code text-[10px] font-extrabold">
              {unread}
            </span>
          )}
        </div>
        <div className="mt-3 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#52525B] pointer-events-none">search</span>
          <input
            type="search"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Search mail…"
            aria-label="Search mail"
            className="neo-input w-full pl-10"
            style={{ fontSize: '13px' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-[32px] text-[#dcd9dd] animate-spin">progress_activity</span>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#dcd9dd]">{query ? 'search_off' : 'inbox'}</span>
            <p className="font-headline text-[13px] font-bold text-[#52525B] mt-2">
              {query ? 'No matches' : 'No emails'}
            </p>
            {query && <p className="font-body text-[12px] text-[#52525B] mt-1">Nothing here matches “{query}”.</p>}
          </div>
        ) : emails.map(email => (
          <button key={email.id} onClick={() => onSelect(email.id)}
            className={`w-full text-left px-4 py-3 border-b-2 border-black/10 flex gap-3 transition-all hover:bg-white ${activeId === email.id ? 'bg-white border-r-4 border-r-[#FF5722] shadow-sm' : ''} ${!email.read ? 'bg-white/60' : ''}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-lg border-2 border-black flex items-center justify-center"
                style={{ backgroundColor: categoryColors[email.category] || '#eae7eb' }}>
                <span className="font-headline text-[11px] font-extrabold text-white">
                  {initialsOf(email.from)}
                </span>
              </div>
              {!email.read && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF5722] border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-headline text-[12px] font-bold truncate ${!email.read ? 'text-black' : 'text-[#5b4039]'}`}>
                  {email.from}
                </span>
                <span className="font-code text-[10px] text-[#52525B] shrink-0">{fmtTime(email.timestamp)}</span>
              </div>
              <p className={`text-[13px] truncate mt-0.5 ${!email.read ? 'font-bold text-black' : 'font-medium text-[#3b302a]'}`}>
                {email.subject}
              </p>
              {/* Bodies load lazily, so only show a preview once one has arrived. */}
              {email.body && (
                <p className="text-[12px] text-[#52525B] truncate mt-0.5">{email.body.split('\n')[0].slice(0, 80)}</p>
              )}
              <div className="flex gap-1.5 mt-1.5 flex-wrap empty:mt-0">
                {email.labels?.map(l => (
                  <span key={l} className="neo-chip" style={{ fontSize: '9px', padding: '0 6px', lineHeight: '16px' }}>{l}</span>
                ))}
                {email.hasAttachment && (
                  <span className="neo-chip" style={{ fontSize: '9px', padding: '0 6px', lineHeight: '16px', background: '#FFD233' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>attach_file</span>
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
