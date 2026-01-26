'use client';

import { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { QUESTION_BANK, Question } from '@/data/questionBank';

interface MathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentZone: string;
  currentIsland: string;
}

export default function MathModal({ isOpen, onClose, onSuccess, currentZone, currentIsland }: MathModalProps) {
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  
  // Memoria para no repetir preguntas
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const islandBook = QUESTION_BANK[currentIsland];
      
      if (islandBook) {
        const zoneQuestions = islandBook[currentZone] || [];

        if (zoneQuestions.length > 0) {
          // 1. Filtrar preguntas que NO hemos visto
          let availableQuestions = zoneQuestions.filter(q => !seenIds.has(q.id));

          // 2. Si se acabaron, reiniciamos la memoria
          if (availableQuestions.length === 0) {
            const zoneIds = new Set(zoneQuestions.map(q => q.id));
            setSeenIds(prev => {
              const newSet = new Set(prev);
              zoneIds.forEach(id => newSet.delete(id));
              return newSet;
            });
            availableQuestions = zoneQuestions;
          }

          // 3. Elegir una al azar
          const randomIndex = Math.floor(Math.random() * availableQuestions.length);
          const selectedQuestion = availableQuestions[randomIndex];
          
          setActiveQuestion(selectedQuestion);
          setSeenIds(prev => new Set(prev).add(selectedQuestion.id));

        } else {
          setActiveQuestion({
            id: 'error', 
            topic: 'En construcción', 
            text: 'No hay ejercicios disponibles aquí aún.', 
            solution: 0, 
            difficulty: 1
          });
        }
      }
      
      setAnswer('');
      setStatus('idle');
    }
  }, [isOpen, currentZone, currentIsland]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion) return;

    // Aceptamos decimales y enteros
    if (parseFloat(answer) === activeQuestion.solution) {
      setStatus('correct');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } else {
      setStatus('wrong');
      setAnswer('');
    }
  };

  if (!isOpen || !activeQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#5d4037] border-4 border-[#8d6e63] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        
        {/* Cabecera */}
        <div className="bg-[#3e2723] p-4 border-b-4 border-[#4e342e] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#d7ccc8] font-serif tracking-widest uppercase truncate max-w-[70%]">
              {activeQuestion.topic}
            </h2>
            <div className="px-3 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-full border border-yellow-600 whitespace-nowrap">
                {currentIsland} • Dif: {"★".repeat(activeQuestion.difficulty)}
            </div>
        </div>

        <div className="p-8 text-center">
          
          {/* --- AQUÍ ESTÁ EL CAMBIO CLAVE PARA QUE NO SE CORTE EL TEXTO --- */}
          <div className="mb-6 text-white text-left">
            {/* 1. El Texto: React manejará los saltos de línea automáticamente */}
            <p className="text-lg font-medium mb-4 text-[#efebe9] leading-relaxed">
              {activeQuestion.text}
            </p>

            {/* 2. La Fórmula: Solo se dibuja si existe en el JSON */}
            {activeQuestion.expression && (
              <div className="p-4 bg-[#4e342e]/50 rounded-lg border-2 border-[#3e2723] text-xl overflow-x-auto text-center">
                 <BlockMath math={activeQuestion.expression} />
              </div>
            )}
          </div>
          {/* --------------------------------------------------------------- */}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Tu respuesta..."
              autoFocus
              step="any"
              className="w-full p-4 text-2xl font-bold text-center text-[#3e2723] bg-[#efebe9] rounded-lg border-b-4 border-[#a1887f] focus:outline-none focus:border-green-600"
            />

            <button
              type="submit"
              disabled={status === 'correct'}
              className={`
                w-full py-4 mt-2 font-bold text-white rounded-lg transition-all shadow-lg 
                ${status === 'idle' ? 'bg-[#2e7d32] hover:bg-[#1b5e20]' : ''}
                ${status === 'wrong' ? 'bg-red-600 hover:bg-red-700 animate-shake' : ''}
                ${status === 'correct' ? 'bg-yellow-500 scale-105' : ''}
              `}
            >
              {status === 'idle' && 'VERIFICAR'}
              {status === 'wrong' && '❌ INCORRECTO'}
              {status === 'correct' && '✨ ¡CORRECTO! ✨'}
            </button>
          </form>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-3 right-4 text-[#a1887f] hover:text-white text-3xl font-bold leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
}