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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#62a6d4] text-white flex items-center justify-center">Cargando...</div>
});

const DIALOGS: Record<string, string> = {
  'welcome-math': "¡Hola! Soy el Profesor Ray Z. He perdido mis 3 Frutas Binomiales...",
  'mission-complete': "¡Increíble! Has recuperado todas las frutas...",
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
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ name: '', text: '' });

  const [isToolOpen, setIsToolOpen] = useState(false);
  const [currentToolId, setCurrentToolId] = useState<string>('');

  const [questProgress, setQuestProgress] = useState(0); 
  const [collectedItemsList, setCollectedItemsList] = useState<string[]>([]);
  const [currentChallengeSource, setCurrentChallengeSource] = useState<'tree' | 'fruit' | null>(null); 
  const [currentFruitId, setCurrentFruitId] = useState<string | null>(null); 
  const [isQuestMinimized, setIsQuestMinimized] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ island: '5° Básico', zone: 'Números' });

  // CARGA INICIAL
  const handleLoginComplete = async (data: any) => {
      // Intentamos cargar inventario desde Supabase (si existe columna, sino usamos defaults)
      const { data: dbData } = await supabase
        .from('players')
        .select('quest_progress, collected_items, inventory, equipped_items')
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

      if (dbData) {
          setQuestProgress(dbData.quest_progress || 0);
          setCollectedItemsList(dbData.collected_items || []);
      }
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

  const handleInteraction = (event: { type: string; id?: string; zone?: string; spawnX?: number; spawnY?: number }) => {
    if (event.type === 'change-zone' && event.zone) {
        setPlayerData(prev => prev ? ({ ...prev, gridX: event.spawnX || 0, gridY: event.spawnY || 0 }) : null);
        setCurrentLocation(prev => ({ ...prev, zone: event.zone! }));
    }
    else if (event.type === 'open-tool' && event.id) {
      setCurrentToolId(event.id);
      setIsToolOpen(true);
    }
    else if (event.type === 'npc-dialog' && event.id) {
      if (questProgress >= 3 && event.id === 'welcome-math') {
          setDialogContent({ name: "Prof. Ray Z.", text: DIALOGS['mission-complete'] });
      } else {
          const text = DIALOGS[event.id] || DIALOGS['default'];
          let npcName = "NPC Desconocido";
          if (event.id === 'welcome-math') npcName = "Prof. Ray Z.";
          else if (event.id === 'welcome-grade1') npcName = "Tutor Isla 1";
          else npcName = `NPC (${event.id})`;
          setDialogContent({ name: npcName, text: text });
      }
      setIsDialogOpen(true);
    }
    else if (event.type === 'math-challenge') {
      setCurrentChallengeSource('tree');
      setIsMathOpen(true);
    } 
    else if (event.type === 'collect-item' && event.id) {
      setCurrentChallengeSource('fruit');
      setCurrentFruitId(event.id);
      setIsMathOpen(true); 
    }
  };

  const handleMathSuccess = async () => {
      handleUpdateSeeds(seeds + 10); 
      if (currentChallengeSource === 'fruit' && currentFruitId) {
          const newProgress = questProgress + 1;
          const newList = [...collectedItemsList, currentFruitId];
          setQuestProgress(newProgress);
          setCollectedItemsList(newList);
          if (playerData) {
              await supabase.from('players').update({ 
                  quest_progress: newProgress,
                  collected_items: newList 
              }).eq('username', playerData.name);
          }
      }
      setIsMathOpen(false);
      setCurrentChallengeSource(null);
      setCurrentFruitId(null);
  };

  if (!playerData) {
      return <CharacterCreator onComplete={handleLoginComplete} />;
  }

  return (
    <main className="relative w-full h-screen overflow-hidden">
      
      {/* HUD */}
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
            <div className={`mt-4 p-3 rounded-xl border-4 shadow-xl transition-all duration-300 ease-in-out relative ${isQuestMinimized ? 'w-40 bg-[#fff8e1]/80' : 'w-64 bg-[#fff8e1]'} ${questProgress >= 3 ? 'bg-[#c8e6c9] border-[#2e7d32]' : 'border-[#ffa000]'}`}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-black text-xs uppercase ${questProgress >= 3 ? 'text-[#1b5e20]' : 'text-[#ff6f00]'}`}>
                        {questProgress >= 3 ? '🌟 COMPLETADA' : '📜 MISIÓN'}
                    </h3>
                    <button onClick={() => setIsQuestMinimized(!isQuestMinimized)} className="w-6 h-6 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded text-[#3e2723] font-bold text-xs transition-colors">
                        {isQuestMinimized ? '▼' : '▬'}
                    </button>
                </div>
                {!isQuestMinimized && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center">
                            <span className="text-[#3e2723] font-bold text-sm">
                                {questProgress >= 3 ? 'Habla con Ray Z.' : 'Recuperar Frutas'}
                            </span>
                            <span className="text-xl font-black text-[#3e2723]">
                                {questProgress}/3
                            </span>
                        </div>
                        <div className="w-full h-2 bg-black/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-[#ffb74d] transition-all duration-500" style={{ width: `${(questProgress / 3) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
        <ChatInput />
      </div>

      <GameCanvas 
          currentZone={currentLocation.zone}
          playerName={playerData.name}
          bodyColor={playerData.bodyColor}
          faceColor={playerData.faceColor}
          hairColor={playerData.hairColor}
          initialX={playerData.gridX}
          initialY={playerData.gridY}
          onMove={handlePlayerMove}
          onInteract={handleInteraction}
          initialCollectedItems={collectedItemsList}
      />

      <DialogModal isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} npcName={dialogContent.name} text={dialogContent.text} />
      <MathModal isOpen={isMathOpen} onClose={() => setIsMathOpen(false)} onSuccess={handleMathSuccess} currentZone={currentLocation.zone} currentIsland={currentLocation.island} />
      <WorldMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} onTravel={(i, z) => setCurrentLocation({ island: i, zone: z })} />
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