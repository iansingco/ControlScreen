import { useState, useCallback } from 'react';
import Home from './views/Home';
import Session from './views/Session';

export type AppId = string;

export default function App() {
  const [activeApp, setActiveApp] = useState<AppId | null>(null);

  const handleLaunch = useCallback((id: AppId) => {
    setActiveApp(id);
  }, []);

  const handleBack = useCallback(() => {
    setActiveApp(null);
  }, []);

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
