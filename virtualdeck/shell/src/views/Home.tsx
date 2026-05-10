import { useState, useEffect } from 'react';
import AppTile from '../components/AppTile';
import { AppId } from '../App';

interface AppConfig {
  id: string;
  name: string;
  icon: string;
}

interface HomeProps {
  onLaunch: (id: AppId) => void;
}

export default function Home({ onLaunch }: HomeProps) {
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/apps')
      .then((r) => r.json())
      .then(setApps)
      .catch(() => setError('Could not reach VirtualDeck daemon'));
  }, []);

  async function handleTap(id: string) {
    if (launching) return;
    setLaunching(id);
    try {
      const res = await fetch(`/apps/${id}/launch`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      onLaunch(id);
    } catch (err) {
      setError(String(err));
      setLaunching(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-8 py-6">
        <span className="text-xl font-semibold tracking-wide text-white/80">VirtualDeck</span>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/40">No apps configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-5">
            {apps.map((app) => (
              <AppTile
                key={app.id}
                id={app.id}
                name={app.name}
                icon={app.icon}
                loading={launching === app.id}
                onTap={handleTap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
