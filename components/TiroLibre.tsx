'use client';

interface TiroLibreProps {
  onBackToMenu: () => void;
  onExitToGame: () => void;
}

export default function TiroLibre({ onBackToMenu, onExitToGame }: TiroLibreProps) {
  return (
    <div className="flex flex-col max-h-[90vh] w-full max-w-[820px]">
      <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3 shrink-0 gap-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="text-sm font-bold text-[#efebe9]/90 hover:text-[#efebe9] underline-offset-2 hover:underline"
        >
          ← Minijuegos
        </button>
        <h2 className="text-lg font-bold text-[#efebe9] tracking-wide flex-1 text-center truncate">
          Tiro Libre
        </h2>
        <button
          type="button"
          onClick={onExitToGame}
          className="text-[#efebe9]/70 hover:text-[#efebe9] text-2xl leading-none px-1"
          aria-label="Cerrar"
        >
          &times;
        </button>
      </div>

      <div className="overflow-hidden bg-[#0a1208]">
        <iframe
          src="/games/tiro-libre.html"
          title="Tiro Libre"
          className="block w-full border-0"
          style={{ height: '620px' }}
          allow="autoplay"
        />
      </div>
    </div>
  );
}
