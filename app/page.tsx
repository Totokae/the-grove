'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import MathModal from '@/components/MathModal';
import WorldMap from '@/components/WorldMap';
import StoreModal from '@/components/StoreModal';
import ChatInput from '@/components/ChatInput'; 
import CharacterCreator from '@/components/CharacterCreator'; // <--- IMPORTANTE

// Cargamos el juego de forma dinámica
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#2d5a27] text-white flex items-center justify-center">Cargando...</div>
});

export default function Home() {
  // DATOS DEL JUGADOR (Nombre + Colores)
  const [playerData, setPlayerData] = useState<{
      name: string; 
      bodyColor: number; 
      faceColor: number; 
      hairColor: number;
  } | null>(null);

  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  // Economía local (se sincronizará con DB después)
  const [seeds, setSeeds] = useState(50); 
  const [currentLocation, setCurrentLocation] = useState({ island: '5° Básico', zone: 'Números' });

  // 1. SI NO HAY DATOS, MOSTRAMOS EL LOGIN/CREADOR
  if (!playerData) {
      return <CharacterCreator onComplete={setPlayerData} />;
  }

  // 2. SI HAY DATOS, MOSTRAMOS EL JUEGO
  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* HUD SUPERIOR */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
            <div className="px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white font-bold shadow-lg flex items-center gap-3">
              <span>🌱 {seeds}</span>
            </div>
            <button onClick={() => setIsStoreOpen(true)} className="w-12 h-12 bg-[#ff8f00] rounded-full border-2 text-2xl hover:scale-105 transition-transform">🛍️</button>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <div className="px-3 py-1 bg-white/90 text-[#2e7d32] text-xs font-black rounded-full uppercase shadow-sm">
               👤 {playerData.name}
            </div>
            <button onClick={() => setIsMapOpen(true)} className="px-6 py-3 bg-[#5d4037] text-[#efebe9] font-bold rounded-xl border-b-4 border-[#3e2723] hover:translate-y-1 hover:border-b-0 transition-all">
                🗺️ MAPA
            </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
        <ChatInput />
      </div>

      {/* JUEGO CON 3 CAPAS DE COLOR */}
      <GameCanvas 
          currentZone={currentLocation.zone}
          playerName={playerData.name}
          bodyColor={playerData.bodyColor}
          faceColor={playerData.faceColor}
          hairColor={playerData.hairColor}
          onInteract={(e) => e.type === 'math-challenge' && setIsMathOpen(true)}
      />

      <MathModal isOpen={isMathOpen} onClose={() => setIsMathOpen(false)} onSuccess={() => setSeeds(prev => prev + 10)} currentZone={currentLocation.zone} currentIsland={currentLocation.island} />
      <WorldMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} onTravel={(i, z) => setCurrentLocation({ island: i, zone: z })} />
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} currentSeeds={seeds} ownedItems={[]} selectedItem="classic" onBuy={() => {}} onEquip={() => {}} />
      
    </main>
  );
}