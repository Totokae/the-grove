'use client';

import { useEffect, useState } from 'react';
import MercadoMatematico from '@/components/MercadoMatematico';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAwardSeeds: (delta: number) => Promise<void>;
}

const MINIGAMES = [{ id: 'mercado-matematico', title: 'Mercado Matemático' }] as const;

export default function GamesModal({ isOpen, onClose, onAwardSeeds }: GamesModalProps) {
  const [view, setView] = useState<'menu' | 'mercado'>('menu');
  const [mercadoKey, setMercadoKey] = useState(0);

  useEffect(() => {
    if (isOpen) setView('menu');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (view === 'mercado') setView('menu');
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, view]);

  if (!isOpen) return null;

  const backdropClick = () => {
    if (view === 'mercado') setView('menu');
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={backdropClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={view === 'menu' ? 'games-modal-title' : undefined}
        aria-label={view === 'mercado' ? 'Mercado Matemático' : undefined}
        className="relative w-full max-w-lg rounded-xl border-4 border-[#3e2723] bg-[#5d4037] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'menu' ? (
          <>
            <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3">
              <h2 id="games-modal-title" className="text-lg font-bold text-[#efebe9] tracking-wide">
                🎮 Minijuegos
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[#efebe9]/70 hover:text-[#efebe9] text-2xl leading-none px-1"
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            <ul className="divide-y divide-[#3e2723]/80 p-4 space-y-0">
              {MINIGAMES.map((game) => (
                <li
                  key={game.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-bold text-[#efebe9] text-base">{game.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMercadoKey((k) => k + 1);
                      setView('mercado');
                    }}
                    className="shrink-0 px-5 py-2 rounded-lg bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
                  >
                    Jugar
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <MercadoMatematico
            key={mercadoKey}
            onBackToMenu={() => setView('menu')}
            onExitToGame={onClose}
            onAwardSeeds={onAwardSeeds}
          />
        )}
      </div>
    </div>
  );
}
