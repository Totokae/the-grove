'use client'

import { useState } from 'react';

interface ChatBarProps {
  onSendMessage: (msg: string) => void;
}

const QUICK_PHRASES = [
  "👋 Hola", 
  "🆘 Ayuda", 
  "🌲 Vamos al Roble", 
  "💯 ¡Bien hecho!", 
  "🤔 ¿Cómo se hace?", 
  "😂 Jaja",
  "👋 Adiós"
];

export default function ChatBar({ onSendMessage }: ChatBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      
      {/* Menú de frases (se abre hacia arriba) */}
      {isOpen && (
        <div className="bg-[#EFEbe9] border-2 border-[#5D4037] rounded-lg shadow-xl p-2 mb-2 flex flex-col gap-1 w-48 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {QUICK_PHRASES.map((msg) => (
            <button
              key={msg}
              onClick={() => {
                onSendMessage(msg);
                setIsOpen(false);
              }}
              className="text-left px-3 py-2 hover:bg-[#D7CCC8] text-[#3E2723] font-serif rounded transition-colors text-sm font-bold"
            >
              {msg}
            </button>
          ))}
        </div>
      )}

      {/* Botón Principal de Chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white p-4 rounded-full shadow-lg border-2 border-[#1B5E20] transition-transform active:scale-95 flex items-center justify-center"
      >
        <span className="text-2xl">💬</span>
      </button>
    </div>
  );
}