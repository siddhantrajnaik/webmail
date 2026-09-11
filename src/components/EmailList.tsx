import type { Email } from '../data/types';

interface EmailListProps {
  emails: Email[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  course: '#2DD4BF',
  admin: '#3B82F6',
  hostel: '#FFD233',
  research: '#FF5722',
  personal: '#FF7597',
};

function formatTime(d: Date) {
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return d.toLocaleString('en-IN', { weekday: 'short' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function EmailList({ emails, activeId, onSelect }: EmailListProps) {
  return (
    <div className="flex flex-col h-full bg-[#FAF6F0]">
      {/* Header */}
      <div className="p-4 border-b-[2.5px] border-black">
        <div className="flex items-center gap-2.5">
          <h2 className="font-headline text-[18px] font-extrabold uppercase tracking-tight">Inbox</h2>
          <span className="px-2 py-0.5 rounded-full bg-[#FF5722] text-white font-code text-[10px] font-extrabold">
            {emails.filter(e => !e.read).length}
          </span>
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#52525B]">search</span>
          <input
            type="text"
            placeholder="Search mail…"
            className="neo-input w-full pl-9 !text-[13px]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <button
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={`
              w-full text-left px-4 py-3 border-b-[2px] border-black/10
              flex gap-3 transition-all
              hover:bg-white
              ${activeId === email.id ? 'bg-white border-r-[4px] border-r-[#FF5722] shadow-sm' : ''}
              ${!email.read ? 'bg-white/60' : ''}
            `}
          >
            {/* Avatar / category dot */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className="w-9 h-9 rounded-lg border-2 border-black flex items-center justify-center"
                style={{ backgroundColor: categoryColors[email.category] || '#eae7eb' }}
              >
                <span className="font-headline text-[11px] font-extrabold text-white drop-shadow">
                  {email.from.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
              </div>
              {!email.read && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF5722] border-2 border-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-headline text-[12px] font-bold truncate ${!email.read ? 'text-black' : 'text-[#5b4039]'}`}>
                  {email.from}
                </span>
                <span className="font-code text-[10px] text-[#52525B] shrink-0">
                  {formatTime(email.timestamp)}
                </span>
              </div>
              <p className={`text-[13px] truncate mt-0.5 ${!email.read ? 'font-bold text-black' : 'font-medium text-[#3b302a]'}`}>
                {email.subject}
              </p>
              <p className="text-[12px] text-[#52525B] truncate mt-0.5">
                {email.body.split('\n')[0].slice(0, 80)}
              </p>
              {/* Chips */}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {email.labels?.map(l => (
                  <span key={l} className="neo-chip !text-[9px] !px-1.5 !py-0 !shadow-none">
                    {l}
                  </span>
                ))}
                {email.hasAttachment && (
                  <span className="neo-chip !text-[9px] !px-1.5 !py-0 !shadow-none !bg-[#FFD233]">
                    📎
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
