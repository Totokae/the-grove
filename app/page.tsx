'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import MathModal from '@/components/MathModal';
import WorldMap from '@/components/WorldMap';
import StoreModal from '@/components/StoreModal'; // <--- Importamos la Tienda

// Cargamos el juego de forma dinámica
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#2d5a27] text-white flex items-center justify-center">Cargando The Grove...</div>
});

export default function Home() {
  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false); // <--- Estado de la Tienda

  // --- ECONOMÍA Y PERSONALIZACIÓN ---
  const [seeds, setSeeds] = useState(50); // Empezamos con 50 de regalo para probar
  const [playerColor, setPlayerColor] = useState(0xffffff); // Blanco por defecto
  const [ownedItems, setOwnedItems] = useState<string[]>(['classic']); // Inventario inicial
  const [selectedItemId, setSelectedItemId] = useState('classic');
  // ----------------------------------

  const [currentLocation, setCurrentLocation] = useState({
    island: '5° Básico',
    zone: 'Números'
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

  // --- LÓGICA DE COMPRA ---
  const handleBuy = (item: any) => {
    if (seeds >= item.price) {
      setSeeds(prev => prev - item.price); // Cobrar
      setOwnedItems(prev => [...prev, item.id]); // Agregar al inventario
      // Equipar automáticamente al comprar (se siente satisfactorio)
      handleEquip(item);
    }
  };

  const handleEquip = (item: any) => {
    setPlayerColor(item.color);
    setSelectedItemId(item.id);
  };
  // -------------------------

  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* HUD SUPERIOR */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        
        {/* LADO IZQUIERDO: Semillas y Tienda */}
        <div className="pointer-events-auto flex items-center gap-2">
            {/* Marcador de Semillas */}
            <div className="px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white font-bold shadow-lg flex items-center gap-3">
              <span>🌱 Semillas:</span>
              <span className="text-yellow-400 text-xl">{seeds}</span>
            </div>

            {/* Botón de Tienda */}
            <button 
                onClick={() => setIsStoreOpen(true)}
                className="w-12 h-12 bg-[#ff8f00] hover:bg-[#f57c00] rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center text-2xl transition-transform active:scale-95 group relative"
                title="Abrir Tienda"
            >
                🛍️
                {/* Notificación si tienes semillas */}
                {seeds >= 50 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>
        </div>

        {/* LADO DERECHO: Mapa y Ubicación */}
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

      {/* EL JUEGO */}
      <GameCanvas 
          onInteract={handleInteraction} 
          currentZone={currentLocation.zone}
          playerColor={playerColor} // <--- Pasamos el color al Phaser
      />

      {/* MODAL MATEMÁTICO */}
      <MathModal 
        isOpen={isMathOpen} 
        onClose={() => setIsMathOpen(false)}
        onSuccess={() => setSeeds(prev => prev + 10)}
        currentZone={currentLocation.zone} 
        currentIsland={currentLocation.island}
      />
      
      {/* MODAL DE MAPA */}
      <WorldMap 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onTravel={handleTravel}
      />

      {/* MODAL DE TIENDA */}
      <StoreModal 
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        currentSeeds={seeds}
        ownedItems={ownedItems}
        selectedItem={selectedItemId}
        onBuy={handleBuy}
        onEquip={handleEquip}
      />
      
    </main>
  );
}