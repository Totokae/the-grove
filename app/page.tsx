'use client'

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import ChatBar from '@/components/ChatBar';
import ForestModal from '@/components/ForestModal'; 
import ShopModal from '@/components/ShopModal';
import { generateProblem } from '@/utils/mathGenerator';

// Importación dinámica del juego
const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { 
  ssr: false, 
  loading: () => <div className="text-white text-center mt-20 font-serif">Invocando el bosque...</div>
});

export default function Home() {
  // --- ESTADOS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProblem, setCurrentProblem] = useState({ title: '', q: '' });
  const [currentAnswer, setCurrentAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Tienda y Color
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [myColor, setMyColor] = useState(0xffffff);

  // --- LÓGICA DE CHAT ---
  const handleSendChat = (msg: string) => {
    // Lanzamos un evento global que Phaser escuchará
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('PHASER_CHAT_EVENT', { detail: msg });
      window.dispatchEvent(event);
    }
  };

  // --- LÓGICA DE TIENDA ---
  const handleBuyColor = (color: number, cost: number) => {
    if (score >= cost) {
      setScore(prev => prev - cost);
      setMyColor(color);
      setIsShopOpen(false);
      // El cambio de color se pasa como prop al GameCanvas
    } else {
      alert("Necesitas más semillas para esta transformación.");
    }
  };

  // --- PERSISTENCIA ---
  useEffect(() => {
    const savedScore = localStorage.getItem('the-grove-score');
    if (savedScore) setScore(parseInt(savedScore, 10));
  }, []);

  useEffect(() => {
    localStorage.setItem('the-grove-score', score.toString());
  }, [score]);

  // --- LÓGICA DE JUEGO ---
  const handleInteract = (data: any) => {
    const problem = generateProblem(score);
    setCurrentProblem({ title: 'Desafío del Roble', q: problem.question });
    setCurrentAnswer(problem.answer);
    setIsModalOpen(true);
    setErrorMessage('');
  };

  const handleSubmitAnswer = (answer: string) => {
    const userAnswer = parseInt(answer, 10);
    
    if (isNaN(userAnswer)) {
      setErrorMessage('Por favor ingresa un número válido');
      return;
    }
    
    if (currentAnswer !== null && userAnswer === currentAnswer) {
      setScore(prev => prev + 10);
      alert('¡Correcto! +10 Semillas');
      setIsModalOpen(false);
      setErrorMessage('');
      setCurrentAnswer(null);
    } else {
      setErrorMessage('La naturaleza rechaza esa respuesta. Inténtalo de nuevo.');
    }
  };

  return (
    <main className="w-full h-screen bg-[#1a1a1a] overflow-hidden relative">
      
      {/* 1. PUNTAJE */}
      <div className="absolute top-4 left-4 z-40 bg-[#2E7D32]/90 backdrop-blur-sm border-2 border-[#1B5E20] rounded-lg px-6 py-3 shadow-lg transition-all hover:scale-105">
        <div className="flex items-center gap-2">
          <span className="text-[#E8F5E9] font-serif text-xl font-bold">🌱 Semillas:</span>
          <span className="text-[#E8F5E9] font-serif text-2xl font-bold">{score}</span>
        </div>
      </div>

      {/* 2. BOTÓN DE TIENDA */}
      <button 
        onClick={() => setIsShopOpen(true)}
        className="absolute top-4 right-4 z-40 bg-[#5D4037] hover:bg-[#3E2723] text-white font-serif font-bold py-3 px-6 rounded-lg border-b-4 border-[#3E2723] active:border-b-0 active:translate-y-1 shadow-xl transition-all flex items-center gap-2"
      >
        <span>🛍️</span>
        <span>Mercado Espiritual</span>
      </button>

      {/* 3. EL JUEGO */}
      <GameCanvas 
        onInteract={handleInteract} 
        playerColor={myColor} 
      />

      {/* 4. MODALES */}
      <ForestModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setErrorMessage(''); }}
        title={currentProblem.title}
        question={currentProblem.q}
        {...({ onSubmit: handleSubmitAnswer } as any)} 
      />

      <ShopModal 
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        currentScore={score}
        onBuyColor={handleBuyColor}
      />

      {/* ERROR FLOTANTE */}
      {errorMessage && isModalOpen && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-800/90 text-white px-6 py-3 rounded-full shadow-xl border border-red-500 font-serif animate-bounce">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* 5. CHAT */}
      <ChatBar onSendMessage={handleSendChat} />
      
    </main>
  );
}