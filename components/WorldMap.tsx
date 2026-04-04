'use client';

import { useState } from 'react';

type IslandDef = {
  id: string;
  name: string;
  mapKey: string;
  locked: boolean;
};

// Cada isla enlaza a la clave de `ZONE_MAPS` en GameCanvas (mismo id que usaban los portales).
const ISLANDS: IslandDef[] = [
  { id: 'hub', name: 'El Gran Árbol', mapKey: 'hub_main', locked: false },
  { id: '1b', name: '1° Básico', mapKey: 'grade_1', locked: true },
  { id: '2b', name: '2° Básico', mapKey: 'grade_2', locked: true },
  { id: '3b', name: '3° Básico', mapKey: 'grade_3', locked: true },
  { id: '4b', name: '4° Básico', mapKey: 'grade_4', locked: true },
  { id: '5b', name: '5° Básico', mapKey: 'grade_5', locked: false },
  { id: '6b', name: '6° Básico', mapKey: 'grade_6', locked: true },
  { id: '7b', name: '7° Básico', mapKey: 'grade_7', locked: true },
  { id: '8b', name: '8° Básico', mapKey: 'grade_8', locked: true },
  { id: '1m', name: '1° Medio', mapKey: 'media_1', locked: true },
  { id: '2m', name: '2° Medio', mapKey: 'media_2', locked: true },
  { id: '3m', name: '3° Medio', mapKey: 'media_3', locked: true },
  { id: '4m', name: '4° Medio', mapKey: 'media_4', locked: true },
  { id: 'simce', name: 'SIMCE', mapKey: 'simce', locked: true },
  { id: 'paes', name: 'PAES', mapKey: 'paes', locked: true },
];

const ZONES = [
  { id: 'num', name: 'Números', icon: '🔢', color: 'bg-blue-600' },
  { id: 'alg', name: 'Álgebra', icon: '𝑥', color: 'bg-green-600' },
  { id: 'geo', name: 'Geometría', icon: '📐', color: 'bg-purple-600' },
  { id: 'dat', name: 'Datos y Azar', icon: '📊', color: 'bg-yellow-600' },
];

interface WorldMapProps {
  isOpen: boolean;
  onClose: () => void;
  /** mapZoneKey = clave Phaser (ej. grade_5); islandLabel y subject para banco de preguntas / UI */
  onTravel: (mapZoneKey: string, islandLabel: string, subjectName: string) => void;
}

export default function WorldMap({ isOpen, onClose, onTravel }: WorldMapProps) {
  const [selectedIsland, setSelectedIsland] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-4xl h-[80vh] bg-[#2d5a27] border-4 border-[#1b3a1a] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Cabecera del Mapa */}
        <div className="bg-[#1b3a1a] p-4 flex justify-between items-center shadow-lg z-10">
          <h2 className="text-2xl font-bold text-[#a5d6a7] font-serif tracking-wider">
            {selectedIsland ? `NIVEL: ${ISLANDS.find(i => i.id === selectedIsland)?.name}` : 'MAPA DE THE GROVE'}
          </h2>
          
          <div className="flex gap-2">
            {selectedIsland && (
              <button 
                onClick={() => setSelectedIsland(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors"
              >
                ⬅ VOLVER A NIVELES
              </button>
            )}
            <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </div>

        {/* Contenido del Mapa */}
        <div className="flex-1 overflow-y-auto p-8 bg-[url('/grass.png')] bg-repeat opacity-90">
          
          {!selectedIsland && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {ISLANDS.map((island) => (
                <button
                  key={island.id}
                  type="button"
                  disabled={island.locked}
                  onClick={() => setSelectedIsland(island.id)}
                  className={`
                    relative h-32 rounded-xl border-b-8 transition-all transform active:translate-y-2
                    flex flex-col items-center justify-center gap-2 p-4
                    ${island.locked 
                      ? 'bg-gray-600 border-gray-800 cursor-not-allowed opacity-70 grayscale' 
                      : 'bg-[#5d4037] border-[#3e2723] hover:scale-105 cursor-pointer shadow-xl'}
                  `}
                >
                  {island.locked && (
                    <div className="absolute top-2 right-2 text-2xl">🔒</div>
                  )}
                  <span className="text-3xl">{island.locked ? '🌫️' : '🏝️'}</span>
                  <span className={`font-bold ${island.locked ? 'text-gray-400' : 'text-[#efebe9]'}`}>
                    {island.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedIsland && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
               <h3 className="text-white text-xl mb-8 font-bold bg-black/30 px-6 py-2 rounded-full">
                  Zonas por materia
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                 {ZONES.map((zone) => (
                   <button
                     key={zone.id}
                     type="button"
                     onClick={() => {
                        const island = ISLANDS.find(i => i.id === selectedIsland);
                        if (!island) return;
                        onTravel(island.mapKey, island.name, zone.name);
                        onClose();
                     }}
                     className={`
                       ${zone.color} border-b-8 border-black/20
                       h-40 rounded-2xl flex items-center justify-between px-8
                       hover:brightness-110 active:translate-y-2 transition-all shadow-2xl group
                     `}
                   >
                     <div className="text-left">
                       <h4 className="text-2xl font-bold text-white mb-1 group-hover:scale-105 transition-transform">{zone.name}</h4>
                       <p className="text-white/80 text-sm">Ir a esta zona</p>
                     </div>
                     <span className="text-6xl group-hover:rotate-12 transition-transform">{zone.icon}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
