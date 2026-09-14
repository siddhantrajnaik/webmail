import { useState, useEffect } from 'react';
import type { Email } from '../data/types';
import { initialsOf } from '../data/format';

interface EmailDetailProps {
  email: Email;
  onBack?: () => void;
}

export default function EmailDetail({ email, onBack }: EmailDetailProps) {
  const [body, setBody] = useState(email.body);
  const [loadingBody, setLoadingBody] = useState(false);

  useEffect(() => {
    setBody(email.body);
    if (email.body) return;
    setLoadingBody(true);
    fetch(`/api/emails/${email.id}/body?folder=${email.folder === 'inbox' ? 'INBOX' : email.folder.toUpperCase()}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setBody(d.body || '(no content)'); })
      .catch(() => setBody('(failed to load)'))
      .finally(() => setLoadingBody(false));
  }, [email.id, email.folder, email.body]);
  return (
    <div className="flex flex-col h-full bg-[#FAF6F0]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b-[2.5px] border-black bg-white">
        {onBack && (
          <button onClick={onBack} aria-label="Back to list" className="md:hidden p-2 rounded-xl border-2 border-black bg-white shadow-sm hover:shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
        )}
        <button className="p-2 rounded-xl border-2 border-black bg-white shadow-sm hover:shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
          <span className="material-symbols-outlined text-[18px]">archive</span>
        </button>
        <button className="p-2 rounded-xl border-2 border-black bg-white shadow-sm hover:shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
          <span className="material-symbols-outlined text-[18px]">report</span>
        </button>
        <div className="flex-1" />
        <button className="p-2 rounded-xl border-2 border-black bg-white shadow-sm hover:shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Header */}
      <div className="p-5 border-b-[2.5px] border-black bg-white">
        <h2 className="font-headline text-[18px] font-extrabold leading-snug">{email.subject}</h2>
        <div className="flex items-center gap-3 mt-3">
          <div
            className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center"
            style={{ backgroundColor: getCategoryColor(email.category) }}
          >
            <span className="font-headline text-sm font-extrabold text-white">
              {initialsOf(email.from)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-[13px] font-bold truncate">{email.from}</p>
            <p className="font-code text-[10px] text-[#52525B] truncate">{email.fromEmail}</p>
            <p className="font-code text-[11px] text-[#52525B] mt-0.5">
              {email.timestamp.toLocaleString('en-IN', {
                weekday: 'long', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <button aria-label={email.starred ? 'Unstar' : 'Star'} className="shrink-0 p-2 rounded-xl border-2 border-black bg-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">{email.starred ? 'star' : 'star_border'}</span>
          </button>
        </div>
        {/* Labels */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {email.labels.map(l => (
              <span key={l} className="neo-chip">{l}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loadingBody ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-[32px] text-[#dcd9dd] animate-spin">progress_activity</span>
          </div>
        ) : (
          // One pre-wrap block: blank lines already separate paragraphs, and
          // splitting per line produced empty <p>s with uneven spacing.
          <div className="font-body text-[14px] leading-[22px] text-[#1b1b1e] whitespace-pre-wrap break-words">
            {body}
          </div>
        )}

        {/* Attachment */}
        {email.hasAttachment && (
          <div className="mt-6">
            <p className="font-headline text-[11px] font-bold uppercase tracking-wider text-[#52525B] mb-2">Attachments</p>
            <div className="neo-card p-3 flex items-center gap-3 max-w-[260px]">
              <div className="w-10 h-10 rounded-lg bg-[#FFD233] border-2 border-black flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline text-[12px] font-bold truncate">exam_schedule.pdf</p>
                <p className="font-code text-[10px] text-[#52525B]">245 KB</p>
              </div>
              <button className="p-1.5 rounded-lg border-2 border-black bg-white shadow-sm">
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reply bar */}
      <div className="p-4 border-t-[2.5px] border-black bg-white">
        <button className="neo-btn-secondary neo-btn w-full">
          <span className="material-symbols-outlined text-[18px]">reply</span>
          Reply
        </button>
      </div>
    </div>
  );
}

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    course: '#2DD4BF',
    admin: '#3B82F6',
    hostel: '#FFD233',
    research: '#FF5722',
    personal: '#FF7597',
  };
  return map[cat] || '#eae7eb';
}
