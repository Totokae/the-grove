'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import MathModal from '@/components/MathModal';
import WorldMap from '@/components/WorldMap';
import StoreModal, { StoreItem } from '@/components/StoreModal'; // Importamos la interfaz StoreItem
import ChatInput from '@/components/ChatInput'; 
import CharacterCreator from '@/components/CharacterCreator'; 
import DialogModal from '@/components/DialogModal';
import ToolModal from '@/components/ToolModal';
import GamesModal from '@/components/GamesModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#62a6d4] text-white flex items-center justify-center">Cargando...</div>
});

const DIALOGS: Record<string, string> = {
  'welcome-math': "¡Hola! Soy el Profesor Ray Z. Bienvenido al Grove: explora islas, practica matemáticas y diviértete.",
  'welcome-grade1': "[DIALOGO_BIENVENIDA_ISLA_1: Aquí irá el texto de 1º Básico]",
  'welcome-hub': "[DIALOGO_BIENVENIDA_HUB: Aquí irá el texto del Hub]",
  'default': "[DIALOGO_POR_DEFECTO: Falta configurar este ID]",
  'welcome-grade5': "¡Hola explorador! Soy la Capitana Fracción. En esta isla aprendemos que no todo es un entero... a veces somos partes de un todo. ¡Busca el Laboratorio!",
  'welcome-complex': "Saludos... Soy el Fantasma de Euler. Has llegado a una dimensión donde los números rotan. Cuidado con caer al vacío imaginario...",
};

export default function Home() {
  // ESTADO DEL JUGADOR (Ahora incluye el inventario y equipamiento detallado)
  const [playerData, setPlayerData] = useState<{
      name: string; 
      bodyColor: number; faceColor: number; hairColor: number;
      gridX: number; gridY: number;
      equippedItems: { hair: string; body: string; face: string }; // IDs de items equipados
      inventory: string[]; // Lista de IDs comprados
  } | null>(null);

  const [seeds, setSeeds] = useState(0); 
  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ name: '', text: '' });

  const [isToolOpen, setIsToolOpen] = useState(false);
  const [currentToolId, setCurrentToolId] = useState<string>('');

  /** Clave del mapa en Phaser (`ZONE_MAPS` en GameCanvas) */
  const [currentMapZone, setCurrentMapZone] = useState('hub_main');
  /** Isla / materia para preguntas (QUESTION_BANK) y textos */
  const [currentLocation, setCurrentLocation] = useState({ island: '5° Básico', subject: 'Números' });

  // CARGA INICIAL
  const handleLoginComplete = async (data: any) => {
      // Intentamos cargar inventario desde Supabase (si existe columna, sino usamos defaults)
      const { data: dbData } = await supabase
        .from('players')
        .select('inventory, equipped_items')
        .eq('username', data.name)
        .single();

      // Valores por defecto si es primera vez
      const inventory = dbData?.inventory || ['hair_classic', 'body_classic', 'face_classic'];
      const equippedItems = dbData?.equipped_items || { hair: 'hair_classic', body: 'body_classic', face: 'face_classic' };

      setPlayerData({
          name: data.name,
          bodyColor: data.bodyColor,
          faceColor: data.faceColor,
          hairColor: data.hairColor,
          gridX: data.gridX,
          gridY: data.gridY,
          inventory: inventory,
          equippedItems: equippedItems
      });
      setSeeds(data.seeds); 
  };

  const handlePlayerMove = async (x: number, y: number) => {
      if (!playerData) return;
      await supabase.from('players').update({ grid_x: x, grid_y: y }).eq('username', playerData.name);
  };

  const handleUpdateSeeds = async (newAmount: number) => {
      setSeeds(newAmount); 
      if (playerData) {
          await supabase.from('players').update({ seeds: newAmount }).eq('username', playerData.name);
      }
  };

  const awardSeedsDelta = async (delta: number) => {
    if (!playerData || delta <= 0) return;
    setSeeds((s) => s + delta);
    const { data } = await supabase
      .from('players')
      .select('seeds')
      .eq('username', playerData.name)
      .single();
    const next = (data?.seeds ?? 0) + delta;
    await supabase.from('players').update({ seeds: next }).eq('username', playerData.name);
  };

  // 👇 LÓGICA DE COMPRA (NUEVA)
  const handleBuyItem = async (item: StoreItem) => {
    if (!playerData || seeds < item.price) return;
    if (playerData.inventory.includes(item.id)) return; // Ya lo tiene

    const newSeeds = seeds - item.price;
    const newInventory = [...playerData.inventory, item.id];

    // 1. Actualizar Estado Local (UI inmediata)
    setSeeds(newSeeds);
    setPlayerData(prev => prev ? { ...prev, inventory: newInventory } : null);

    // 2. Persistir en Supabase
    await supabase.from('players').update({ 
        seeds: newSeeds,
        inventory: newInventory
    }).eq('username', playerData.name);
  };

  // 👇 LÓGICA DE EQUIPAR (NUEVA)
  const handleEquipItem = async (item: StoreItem) => {
    if (!playerData) return;

    // 1. Determinar qué color cambiar en Phaser
    const updates: any = { equippedItems: { ...playerData.equippedItems, [item.category]: item.id } };
    
    if (item.category === 'hair') updates.hairColor = item.color;
    if (item.category === 'body') updates.bodyColor = item.color;
    if (item.category === 'face') updates.faceColor = item.color;

    // 2. Actualizar Estado Local (Phaser reaccionará a esto)
    setPlayerData(prev => prev ? { ...prev, ...updates } : null);

    // 3. Persistir en Supabase (Guardar el look)
    // Nota: Necesitas asegurarte de que tu tabla 'players' tenga las columnas 'body_color', 'face_color', etc.
    const dbUpdates: any = { equipped_items: updates.equippedItems };
    if (item.category === 'hair') dbUpdates.hair_color = item.color;
    if (item.category === 'body') dbUpdates.body_color = item.color;
    if (item.category === 'face') dbUpdates.face_color = item.color;

    await supabase.from('players').update(dbUpdates).eq('username', playerData.name);
  };

  const handleMapTravel = async (mapZoneKey: string, islandLabel: string, subjectName: string) => {
    setCurrentMapZone(mapZoneKey);
    setCurrentLocation({ island: islandLabel, subject: subjectName });
    setPlayerData(prev => (prev ? { ...prev, gridX: 0, gridY: 0 } : null));
    if (playerData) {
      await supabase.from('players').update({ grid_x: 0, grid_y: 0 }).eq('username', playerData.name);
    }
  };

  const handleInteraction = (event: { type: string; id?: string }) => {
    if (event.type === 'open-tool' && event.id) {
      setCurrentToolId(event.id);
      setIsToolOpen(true);
    }
    else if (event.type === 'npc-dialog' && event.id) {
      const text = DIALOGS[event.id] || DIALOGS['default'];
      let npcName = "NPC Desconocido";
      if (event.id === 'welcome-math') npcName = "Prof. Ray Z.";
      else if (event.id === 'welcome-grade1') npcName = "Tutor Isla 1";
      else npcName = `NPC (${event.id})`;
      setDialogContent({ name: npcName, text });
      setIsDialogOpen(true);
    }
    else if (event.type === 'math-challenge') {
      setIsMathOpen(true);
    }
  };

  const handleMathSuccess = async () => {
      handleUpdateSeeds(seeds + 10);
      setIsMathOpen(false);
  };

  if (!playerData) {
      return <CharacterCreator onComplete={handleLoginComplete} />;
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="px-6 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20 text-white font-bold shadow-lg flex items-center gap-3">
                <span>🌱 {seeds}</span>
              </div>
              <button type="button" onClick={() => setIsStoreOpen(true)} className="w-12 h-12 bg-[#ff8f00] rounded-full border-2 text-2xl hover:scale-105 transition-transform">🛍️</button>
            </div>
            <button type="button" onClick={() => setIsGamesOpen(true)} className="px-6 py-3 bg-[#5d4037] text-[#efebe9] font-bold rounded-xl border-b-4 border-[#3e2723] hover:translate-y-1 hover:border-b-0 transition-all">
              🎮 JUEGOS
            </button>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
            <div className="px-3 py-1 bg-white/90 text-[#2e7d32] text-xs font-black rounded-full uppercase shadow-sm">
               👤 {playerData.name}
            </div>
            <button type="button" onClick={() => setIsMapOpen(true)} className="px-6 py-3 bg-[#5d4037] text-[#efebe9] font-bold rounded-xl border-b-4 border-[#3e2723] hover:translate-y-1 hover:border-b-0 transition-all">
                🗺️ MAPA
            </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
        <ChatInput />
      </div>

      <GameCanvas 
          currentZone={currentMapZone}
          playerName={playerData.name}
          bodyColor={playerData.bodyColor}
          faceColor={playerData.faceColor}
          hairColor={playerData.hairColor}
          initialX={playerData.gridX}
          initialY={playerData.gridY}
          onMove={handlePlayerMove}
          onInteract={handleInteraction}
      />

      <DialogModal isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} npcName={dialogContent.name} text={dialogContent.text} />
      <MathModal isOpen={isMathOpen} onClose={() => setIsMathOpen(false)} onSuccess={handleMathSuccess} currentZone={currentLocation.subject} currentIsland={currentLocation.island} />
      <WorldMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} onTravel={handleMapTravel} />
      <GamesModal
        isOpen={isGamesOpen}
        onClose={() => setIsGamesOpen(false)}
        onAwardSeeds={awardSeedsDelta}
      />
      <ToolModal isOpen={isToolOpen} onClose={() => setIsToolOpen(false)} toolId={currentToolId} />
      
      {/* TIENDA CONECTADA */}
      <StoreModal 
        isOpen={isStoreOpen} 
        onClose={() => setIsStoreOpen(false)} 
        currentSeeds={seeds} 
        ownedItems={playerData.inventory} 
        selectedItems={playerData.equippedItems} 
        onBuy={handleBuyItem} 
        onEquip={handleEquipItem} 
      />
      
    </main>
  );
}