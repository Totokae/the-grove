'use client';

import { useState } from 'react';
import { TOOLS } from '@/data/toolsRegistry'; // 👈 Importamos el registro

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
}

export default function ToolModal({ isOpen, onClose, toolId }: ToolModalProps) {
  if (!isOpen) return null;

  // Buscamos la configuración en el registro
  const toolConfig = TOOLS[toolId];

  // Estado para la demo de sumas (Legacy/Custom)
  const [sumResult, setSumResult] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const checkSum = () => {
    if (sumResult === '4') setFeedback('¡Correcto! 🎉 2 + 2 son 4');
    else setFeedback('Inténtalo de nuevo 🤔');
  };

  const renderContent = () => {
    // 1. Si no existe la herramienta en el registro
    if (!toolConfig) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
                <p className="text-xl font-bold">Error 404</p>
                <p>Herramienta "{toolId}" no encontrada en el registro.</p>
            </div>
        );
    }

    // 2. Renderizado Automático de IFRAMES (GeoGebra, Web Externa)
    if (toolConfig.type === 'iframe' && toolConfig.url) {
        return (
            <div className="w-full h-full flex flex-col">
                <h2 className="text-xl font-bold text-[#3e2723] mb-2 text-center">{toolConfig.title}</h2>
                <div className="flex-grow bg-white rounded-lg border-2 border-[#5d4037] overflow-hidden shadow-inner relative">
                  <iframe 
                    src={toolConfig.url}
                    className="w-full h-full absolute inset-0"
                    title={toolConfig.title}
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
                {toolConfig.description && (
                    <p className="text-sm text-[#5d4037] mt-2 italic text-center bg-white/50 p-1 rounded">
                        {toolConfig.description}
                    </p>
                )}
            </div>
        );
    }

    // 3. Renderizado de Contenido CUSTOM (Casos especiales como la suma hardcodeada)
    if (toolId === 'basic_sum') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-[#3e2723]">
            <h2 className="text-3xl font-black mb-6">{toolConfig.title}</h2>
            <div className="flex items-center gap-4 text-4xl font-bold mb-8 bg-white p-6 rounded-xl border-4 border-[#8d6e63] shadow-lg">
              <span>2</span><span className="text-[#d84315]">+</span><span>2</span><span>=</span>
              <input 
                type="number" 
                value={sumResult}
                onChange={(e) => setSumResult(e.target.value)}
                className="w-20 p-2 text-center border-b-4 border-[#3e2723] bg-[#fff8e1] outline-none"
              />
            </div>
            <button 
              onClick={checkSum}
              className="px-8 py-3 bg-[#66bb6a] hover:bg-[#43a047] text-white font-bold rounded-xl shadow-md active:scale-95"
            >
              Comprobar
            </button>
            {feedback && <p className="mt-6 text-xl font-bold animate-bounce">{feedback}</p>}
          </div>
        );
    }

    return <p className="text-center p-10">Tipo de herramienta no soportado.</p>;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#fff3e0] border-4 border-[#5d4037] rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] p-4 relative overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 bg-[#d32f2f] hover:bg-red-700 text-white rounded-full font-bold shadow-lg z-10 transition-all active:scale-95"
        >
          ✕
        </button>
        <div className="mt-2 h-full">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}