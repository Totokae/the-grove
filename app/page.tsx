'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import MathModal from '@/components/MathModal';
import WorldMap from '@/components/WorldMap';
import StoreModal from '@/components/StoreModal';
import ChatInput from '@/components/ChatInput'; 
import CharacterCreator from '@/components/CharacterCreator'; 
import DialogModal from '@/components/DialogModal';
import ToolModal from '@/components/ToolModal'; // 👈 1. IMPORTAR EL NUEVO MODAL

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-[#62a6d4] text-white flex items-center justify-center">Cargando...</div>
});

const DIALOGS: Record<string, string> = {
  'welcome-math': "¡Hola! Soy el Profesor Ray Z. He perdido mis 3 Frutas Binomiales por el bosque. ¿Podrías ayudarme a encontrarlas? ¡Revisa el contador de misión!",
  'mission-complete': "¡Increíble! Has recuperado todas las frutas. La academia te debe una grande. ¡Toma estas semillas extra!",
  'default': "..."
};

export default function Home() {
  const [playerData, setPlayerData] = useState<{
      name: string; 
      bodyColor: number; faceColor: number; hairColor: number;
      gridX: number; gridY: number;
  } | null>(null);

  const [seeds, setSeeds] = useState(0); 
  const [isMathOpen, setIsMathOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ name: '', text: '' });

  // 👇 2. NUEVOS ESTADOS PARA HERRAMIENTAS INTERACTIVAS
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [currentToolId, setCurrentToolId] = useState<string>('');

  // ESTADOS DE MISIÓN PERSISTENTE
  const [questProgress, setQuestProgress] = useState(0); 
  const [collectedItemsList, setCollectedItemsList] = useState<string[]>([]);
  
  const [currentChallengeSource, setCurrentChallengeSource] = useState<'tree' | 'fruit' | null>(null); 
  const [currentFruitId, setCurrentFruitId] = useState<string | null>(null); 
  
  const [isQuestMinimized, setIsQuestMinimized] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ island: '5° Básico', zone: 'Números' });

  // CARGA INICIAL COMPLETA
  const handleLoginComplete = async (data: any) => {
      setPlayerData({
          name: data.name,
          bodyColor: data.bodyColor,
          faceColor: data.faceColor,
          hairColor: data.hairColor,
          gridX: data.gridX,
          gridY: data.gridY
      });
      setSeeds(data.seeds); 

      const { data: questData } = await supabase
        .from('players')
        .select('quest_progress, collected_items')
        .eq('username', data.name)
        .single();

      if (questData) {
          setQuestProgress(questData.quest_progress || 0);
          setCollectedItemsList(questData.collected_items || []);
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

  // 👇 3. MANEJADOR DE INTERACCIONES ACTUALIZADO
  const handleInteraction = (event: { type: string; id: string }) => {
    console.log("Evento recibido en Page:", event);

    // CASO: Hoja de estudio / Herramienta
    if (event.type === 'open-tool') {
      setCurrentToolId(event.id);
      setIsToolOpen(true);
    }
    // CASO: Diálogo con NPC
    else if (event.type === 'npc-dialog') {
      if (questProgress >= 3) {
          setDialogContent({ name: "Prof. Ray Z.", text: DIALOGS['mission-complete'] });
      } else {
          const text = DIALOGS[event.id] || DIALOGS['default'];
          setDialogContent({ name: "Prof. Ray Z.", text: text });
      }
      setIsDialogOpen(true);
    }
    // CASO: Desafío de Árbol
    else if (event.type === 'math-challenge') {
      setCurrentChallengeSource('tree');
      setIsMathOpen(true);
    } 
    // CASO: Recoger Fruta
    else if (event.type === 'collect-item') {
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

            <div className={`mt-4 p-3 rounded-xl border-4 shadow-xl transition-all duration-300 ease-in-out relative
                ${isQuestMinimized ? 'w-40 bg-[#fff8e1]/80' : 'w-64 bg-[#fff8e1]'} 
                ${questProgress >= 3 ? 'bg-[#c8e6c9] border-[#2e7d32]' : 'border-[#ffa000]'}
            `}>
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

      {/* MODALES */}
      <DialogModal isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} npcName={dialogContent.name} text={dialogContent.text} />
      
      <MathModal isOpen={isMathOpen} onClose={() => setIsMathOpen(false)} onSuccess={handleMathSuccess} currentZone={currentLocation.zone} currentIsland={currentLocation.island} />
      
      <WorldMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} onTravel={(i, z) => setCurrentLocation({ island: i, zone: z })} />
      
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} currentSeeds={seeds} ownedItems={[]} selectedItem="classic" onBuy={() => {}} onEquip={() => {}} />

      {/* 👇 4. RENDERIZAR EL MODAL DE HERRAMIENTAS */}
      <ToolModal 
        isOpen={isToolOpen} 
        onClose={() => setIsToolOpen(false)} 
        toolId={currentToolId} 
      />
      
    </main>
  );
}