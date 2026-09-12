import { useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';
const api = (path: string) => `${API_BASE}${path}`;

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = e.currentTarget;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const res = await fetch(api('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF6F0] overflow-auto">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#FF5722] border-[2.5px] border-black shadow flex items-center justify-center rotate-[-2deg]">
              <span className="text-white text-2xl font-bold font-headline">M</span>
            </div>
            <h1 className="font-headline text-[26px] font-extrabold text-black tracking-tight mt-4">
              IIT Delhi Webmail
            </h1>
            <p className="font-body text-[13px] text-black/70 font-medium mt-1">
              Unified Kerberos & LDAP Authentication
            </p>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-white border-2 border-black shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF] border border-black" />
              <span className="font-code text-[10px] font-bold tracking-wider uppercase">Hauz Khas Mail Relay</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-[2.5px] border-black shadow-lg flex flex-col p-5 gap-5">
            <div className="bg-[#FFD233] border-2 border-black rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-black">badge</span>
                <span className="font-headline text-[13px] font-bold uppercase tracking-wide">Account Verification</span>
              </div>
              <span className="font-code text-[10px] font-extrabold bg-black text-white px-2 py-0.5 rounded">LDAP v3</span>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3">
                <p className="font-body text-[13px] text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-headline text-[12px] font-bold uppercase tracking-wider" htmlFor="username">
                  Kerberos ID
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="neo-input"
                  placeholder="your_kerberos_id"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-headline text-[12px] font-bold uppercase tracking-wider" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="neo-input"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="neo-btn w-full" disabled={loading}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Verifying…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign In
                </>
              )}
            </button>

            <p className="text-center font-code text-[10px] text-[#52525B]">
              Powered by IIT Delhi Central Authentication
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
