'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import MathModal from '@/components/MathModal';
import WorldMap from '@/components/WorldMap';

// Cargamos el juego de forma dinámica (solo en cliente)
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#2d5a27] text-white flex items-center justify-center">Cargando The Grove...</div>
});

export default function Home() {
  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [seeds, setSeeds] = useState(0);

  // ESTADO DE LA UBICACIÓN ACTUAL
  const [currentLocation, setCurrentLocation] = useState({
    island: '5° Básico', // Nivel Académico
    zone: 'Números'      // Eje Temático
  });

  const handleInteraction = (event: any) => {
    if (event.type === 'math-challenge') {
      setIsMathOpen(true);
    }
  };

  const handleTravel = (island: string, zone: string) => {
    console.log(`Viajando a: ${island} - ${zone}`);
    setCurrentLocation({ island, zone });
  };

  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* HUD SUPERIOR */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        
        {/* Marcador de Semillas */}
        <div className="pointer-events-auto px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white font-bold shadow-lg flex items-center gap-3">
          <span>🌱 Semillas:</span>
          <span className="text-yellow-400 text-xl">{seeds}</span>
        </div>

        {/* Indicador de Zona Actual + Botón Mapa */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <div className="px-4 py-1 bg-[#1b3a1a]/80 text-[#a5d6a7] text-sm font-bold rounded-lg border border-[#2e7d32]">
                📍 {currentLocation.island} • {currentLocation.zone}
            </div>
            
            <button 
                onClick={() => setIsMapOpen(true)}
                className="px-6 py-3 bg-[#5d4037] hover:bg-[#4e342e] text-[#efebe9] font-bold rounded-xl border-b-4 border-[#3e2723] active:translate-y-1 transition-all shadow-xl flex items-center gap-2"
            >
                🗺️ ABRIR MAPA
            </button>
        </div>
      </div>

      {/* EL JUEGO (Recibe la Zona para cambiar el color del pasto) */}
      <GameCanvas 
          onInteract={handleInteraction} 
          currentZone={currentLocation.zone} 
      />

      {/* MODAL MATEMÁTICO (Recibe Zona e Isla para buscar la pregunta correcta) */}
      <MathModal 
        isOpen={isMathOpen} 
        onClose={() => setIsMathOpen(false)}
        onSuccess={() => setSeeds(prev => prev + 10)}
        currentZone={currentLocation.zone} 
        currentIsland={currentLocation.island} // <--- ESTO FALTABA
      />
      
      {/* MODAL DE MAPA */}
      <WorldMap 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onTravel={handleTravel}
      />
      
    </main>
  );
}