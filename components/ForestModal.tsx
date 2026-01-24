'use client'

import { useState, useEffect } from 'react';

interface ForestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (answer: string) => void;
  title: string;
  question: string;
}

// LA CLAVE ESTÁ AQUÍ ABAJO: "export default"
export default function ForestModal({ isOpen, onClose, onSubmit, title, question }: ForestModalProps) {
  const [answer, setAnswer] = useState('');
  
  useEffect(() => {
    if (isOpen) setAnswer('');
  }, [isOpen]);

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(answer);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md transform transition-all scale-100 rotate-1">
        <div className="h-4 bg-[#5D4037] rounded-t-lg border-b-2 border-[#3E2723]"></div>
        <div className="bg-[#EFEbe9] p-8 border-x-8 border-[#5D4037] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
          <h2 className="text-3xl font-serif font-bold text-[#3E2723] text-center mb-6 tracking-wide uppercase border-b-2 border-[#3E2723]/20 pb-2">
            {title}
          </h2>
          <div className="text-[#4E342E] font-serif text-xl text-center mb-8 leading-relaxed">
            {question}
          </div>
          <div className="space-y-4">
            <input 
              type="number" 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="..."
              className="w-full bg-[#D7CCC8]/30 border-2 border-[#8D6E63] text-[#3E2723] text-center text-2xl font-bold py-3 rounded focus:outline-none focus:border-[#2E7D32] placeholder-[#8D6E63]/50 font-serif"
              autoFocus
            />
            <button 
              onClick={handleSubmit}
              className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-[#E8F5E9] font-bold py-3 px-6 rounded border-b-4 border-[#1B5E20] shadow-lg uppercase tracking-wider"
            >
              Responder
            </button>
          </div>
        </div>
        <div className="h-4 bg-[#5D4037] rounded-b-lg border-t-2 border-[#3E2723]"></div>
      </div>
    </div>
  );
}