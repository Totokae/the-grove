'use client';

import { useState, useEffect } from 'react';

interface DialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  npcName: string;
  text: string;
}

export default function DialogModal({ isOpen, onClose, npcName, text }: DialogModalProps) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setDisplayedText('');
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(timer);
        }
      }, 30); // Velocidad de escritura
      return () => clearInterval(timer);
    }
  }, [isOpen, text]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none pb-20">
      <div className="pointer-events-auto w-full max-w-3xl mx-4 bg-[#5d4037] border-4 border-[#3e2723] rounded-xl shadow-2xl p-1 animate-slide-up">
        <div className="absolute -top-6 left-4 bg-[#ffb74d] text-[#3e2723] font-bold px-4 py-1 rounded-t-lg border-t-2 border-x-2 border-[#3e2723]">
          {npcName}
        </div>
        <div className="bg-[#fff3e0] rounded-lg p-6 min-h-[100px] flex flex-col">
          <p className="text-[#3e2723] text-lg font-medium leading-relaxed font-mono">
            {displayedText}
          </p>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white font-bold py-2 px-6 rounded-lg border-b-4 border-[#1b5e20]">
              CONTINUAR ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}