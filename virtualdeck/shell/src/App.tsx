import { useState, useCallback } from 'react';
import Home from './views/Home';
import Session from './views/Session';
import Canvas from './views/Canvas';

export type AppId = string;

// Minimal pathname-based routing — no router dependency needed.
// /canvas → widget canvas (for always-on secondary displays / phones)
// everything else → launcher shell
const isCanvas = window.location.pathname.startsWith('/canvas');

export default function App() {
  const [activeApp, setActiveApp] = useState<AppId | null>(null);

  const handleLaunch = useCallback((id: AppId) => {
    setActiveApp(id);
  }, []);

  const handleBack = useCallback(() => {
    setActiveApp(null);
  }, []);

  if (isCanvas) {
    return (
      <div className="h-full w-full bg-surface text-white select-none">
        <Canvas />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black text-white select-none">
      {activeApp ? (
        <Session appId={activeApp} onBack={handleBack} />
      ) : (
        <Home onLaunch={handleLaunch} />
      )}
    </div>
  );
}
