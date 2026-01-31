'use client';

import { useState } from 'react';

interface LoginModalProps {
  onLogin: (name: string) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 12); // Máximo 12 letras
    if (cleanName.length > 0) {
      onLogin(cleanName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d5a27]">
      {/* Fondo decorativo simple */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://labs.phaser.io/assets/sprites/grass.png')]"></div>

      <div className="relative bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border-4 border-[#2e7d32] text-center animate-in zoom-in-95 duration-300">
        <div className="text-6xl mb-4">🌳</div>
        <h1 className="text-2xl font-bold text-[#1b5e20] mb-2 font-serif">Bienvenido a The Grove</h1>
        <p className="text-gray-500 mb-6 text-sm">Ingresa tu nombre para entrar al bosque.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu Nombre..."
            maxLength={12}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#2e7d32] focus:ring-4 focus:ring-[#2e7d32]/20 outline-none transition-all text-lg font-bold text-center uppercase"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-[#ff8f00] hover:bg-[#e65100] text-white font-bold rounded-xl shadow-[0_4px_0_#bf360c] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            COMENZAR AVENTURA
          </button>
        </form>
      </div>
    </div>
  );
}