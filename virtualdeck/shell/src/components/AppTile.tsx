interface AppTileProps {
  id: string;
  name: string;
  icon: string;
  loading: boolean;
  onTap: (id: string) => void;
}

export default function AppTile({ id, name, icon, loading, onTap }: AppTileProps) {
  return (
    <button
      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-card hover:bg-white/10 active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50"
      disabled={loading}
      onPointerDown={() => onTap(id)}
    >
      <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center">
        <img
          src={icon}
          alt={name}
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <span className="text-sm text-white/80 text-center leading-tight">{name}</span>
    </button>
  );
}
