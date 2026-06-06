'use client';

import { useEffect, useState } from 'react';
import MercadoMatematico from '@/components/MercadoMatematico';
import SaltoDelRio from '@/components/SaltoDelRio';
import SeedDrop from '@/components/SeedDrop';
import TiroLibre from '@/components/TiroLibre';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAwardSeeds: (delta: number) => Promise<void>;
}

const MINIGAMES = [
  {
    id: 'mercado-matematico',
    title: 'Mercado Matemático',
    description: 'Resuelve problemas para atender clientes',
  },
  {
    id: 'seed-drop',
    title: 'Camino de Funciones',
    description: 'Dibuja la función que guía la semilla a las estrellas',
  },
  {
    id: 'salto-del-rio',
    title: 'Salto del Río',
    description: 'Arrastra para saltar y sigue la función cuadrática de tu trayectoria',
  },
  {
    id: 'tiro-libre',
    title: 'Tiro Libre',
    description: 'Ajusta m y b para encestar sin tocar la barrera',
  },
] as const;

type GameId = (typeof MINIGAMES)[number]['id'];

export default function GamesModal({ isOpen, onClose, onAwardSeeds }: GamesModalProps) {
  const [view, setView] = useState<'menu' | GameId>('menu');
  const [mercadoKey, setMercadoKey] = useState(0);
  const [seedDropKey, setSeedDropKey] = useState(0);
  const [saltoDelRioKey, setSaltoDelRioKey] = useState(0);
  const [tiroLibreKey, setTiroLibreKey] = useState(0);

  useEffect(() => {
    if (isOpen) setView('menu');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (view !== 'menu') setView('menu');
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, view]);

  if (!isOpen) return null;

  const backdropClick = () => {
    if (view !== 'menu') setView('menu');
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
        className={`relative w-full rounded-xl border-4 border-[#3e2723] bg-[#5d4037] shadow-2xl overflow-hidden ${
          view === 'salto-del-rio'
            ? 'max-w-[860px]'
            : view === 'tiro-libre'
              ? 'max-w-[820px]'
              : view === 'seed-drop'
                ? 'max-w-xl'
                : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Menu ── */}
        {view === 'menu' && (
          <>
            <div className="flex items-center justify-between border-b-4 border-[#3e2723] bg-[#3e2723] px-4 py-3">
              <h2
                id="games-modal-title"
                className="text-lg font-bold text-[#efebe9] tracking-wide"
              >
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

            <ul className="divide-y divide-[#3e2723]/60 p-4">
              {MINIGAMES.map((game) => (
                <li
                  key={game.id}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#efebe9] text-base">{game.title}</p>
                    <p className="text-xs text-[#efebe9]/55 mt-0.5">{game.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (game.id === 'mercado-matematico') setMercadoKey((k) => k + 1);
                      if (game.id === 'seed-drop') setSeedDropKey((k) => k + 1);
                      if (game.id === 'salto-del-rio') setSaltoDelRioKey((k) => k + 1);
                      if (game.id === 'tiro-libre') setTiroLibreKey((k) => k + 1);
                      setView(game.id);
                    }}
                    className="shrink-0 px-5 py-2 rounded-lg bg-[#efebe9] text-[#3e2723] font-bold border-b-4 border-[#bcaaa4] hover:translate-y-0.5 hover:border-b-2 active:border-b-0 transition-all"
                  >
                    Jugar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Mercado Matemático ── */}
        {view === 'mercado-matematico' && (
          <MercadoMatematico
            key={mercadoKey}
            onBackToMenu={() => setView('menu')}
            onExitToGame={onClose}
            onAwardSeeds={onAwardSeeds}
          />
        )}

        {/* ── Camino de Funciones ── */}
        {view === 'seed-drop' && (
          <SeedDrop
            key={seedDropKey}
            onBackToMenu={() => setView('menu')}
            onExitToGame={onClose}
            onAwardSeeds={onAwardSeeds}
          />
        )}

        {/* ── Salto del Río ── */}
        {view === 'salto-del-rio' && (
          <SaltoDelRio
            key={saltoDelRioKey}
            onBackToMenu={() => setView('menu')}
            onExitToGame={onClose}
          />
        )}

        {/* ── Tiro Libre ── */}
        {view === 'tiro-libre' && (
          <TiroLibre
            key={tiroLibreKey}
            onBackToMenu={() => setView('menu')}
            onExitToGame={onClose}
          />
        )}
      </div>
    </div>
  );
}
