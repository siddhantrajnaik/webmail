import type { Folder } from '../data/types';

interface SidebarProps {
  folders: { id: Folder; label: string; icon: string; count: number }[];
  active: Folder;
  onSelect: (f: Folder) => void;
}

export default function Sidebar({ folders, active, onSelect }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-white border-r-[2.5px] border-black shadow">
      {/* Logo */}
      <div className="p-4 border-b-[2.5px] border-black">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FF5722] border-2 border-black shadow flex items-center justify-center rotate-[-2deg]">
            <span className="text-white text-lg font-bold font-headline">M</span>
          </div>
          <div>
            <h1 className="font-headline text-[15px] font-extrabold leading-tight tracking-tight">IIT Delhi</h1>
            <p className="font-code text-[9px] font-bold tracking-wider uppercase text-[#52525B]">Webmail</p>
          </div>
        </div>
      </div>

      {/* Compose */}
      <div className="px-3 pt-4 pb-2">
        <button className="neo-btn w-full !rounded-xl">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Compose
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl
              font-headline text-[13px] font-bold uppercase tracking-wide
              border-2 transition-all duration-75
              ${active === f.id
                ? 'bg-[#FF5722] text-white border-black shadow translate-x-[2px] translate-y-[2px]'
                : 'bg-white text-black border-transparent hover:border-black hover:shadow-sm'
              }
            `}
          >
            <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
            <span className="flex-1 text-left">{f.label}</span>
            {f.count > 0 && (
              <span className={`
                px-2 py-0.5 rounded-full text-[10px] font-code font-extrabold
                ${active === f.id ? 'bg-white text-[#FF5722]' : 'bg-[#eae7eb] text-black'}
              `}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t-[2.5px] border-black">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm overflow-hidden flex items-center justify-center">
            <span className="font-headline text-xs font-bold">SK</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-[12px] font-bold truncate">Siddhant K.</p>
            <p className="font-code text-[10px] text-[#52525B] truncate">@siddhant</p>
          </div>
          <button className="p-1 rounded-lg hover:bg-[#f0edf1]">
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
