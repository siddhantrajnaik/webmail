// Senders arrive as "Hostel Office (Kailash)" or a bare address; handle both.
export function initialsOf(name: string): string {
  const words = (name || '').replace(/[^\w\s@.-]/g, ' ').trim().split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
