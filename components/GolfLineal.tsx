'use client';

interface GolfLinealProps {
  onBackToMenu: () => void;
  onExitToGame: () => void;
}

export default function GolfLineal({ onBackToMenu, onExitToGame }: GolfLinealProps) {
  return (
    <div className="flex flex-col max-h-[90vh] w-full max-w-[800px]">
      <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3 shrink-0 gap-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="text-sm font-bold text-[#efebe9]/90 hover:text-[#efebe9] underline-offset-2 hover:underline"
        >
          ← Minijuegos
        </button>
        <h2 className="text-lg font-bold text-[#efebe9] tracking-wide flex-1 text-center truncate">
          Golf Lineal
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

      <div className="overflow-hidden bg-[#0c160c]">
        <iframe
          src="/games/golf-lineal.html"
          title="Golf Lineal"
          className="block w-full border-0"
          style={{ height: '600px' }}
          allow="autoplay"
        />
      </div>
    </div>
  );
}
