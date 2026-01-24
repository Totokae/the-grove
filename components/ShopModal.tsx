'use client'

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore: number;
  onBuyColor: (color: number, cost: number) => void;
}

const COLORS = [
  { name: 'Espíritu de Fuego', hex: 0xff4444, cost: 50, css: 'bg-red-500' },
  { name: 'Espíritu de Agua', hex: 0x4444ff, cost: 50, css: 'bg-blue-500' },
  { name: 'Espíritu Solar', hex: 0xffff44, cost: 100, css: 'bg-yellow-400' },
  { name: 'Espíritu Sombrío', hex: 0x888888, cost: 200, css: 'bg-gray-600' },
  { name: 'Espíritu Real', hex: 0x9c27b0, cost: 500, css: 'bg-purple-600' },
];

export default function ShopModal({ isOpen, onClose, currentScore, onBuyColor }: ShopModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#EFEbe9] p-6 rounded-lg border-4 border-[#5D4037] shadow-2xl max-w-lg w-full relative">
        
        {/* Botón Cerrar */}
        <button onClick={onClose} className="absolute top-2 right-2 text-[#5D4037] font-bold text-xl hover:scale-110 transition">✕</button>

        <h2 className="text-3xl font-serif font-bold text-[#3E2723] text-center mb-2">Mercado del Bosque</h2>
        <p className="text-center text-[#5D4037] mb-6 font-serif">Tienes <span className="font-bold text-[#2E7D32]">{currentScore} Semillas</span></p>

        <div className="grid grid-cols-2 gap-4">
          {COLORS.map((item) => (
            <button
              key={item.name}
              onClick={() => onBuyColor(item.hex, item.cost)}
              disabled={currentScore < item.cost}
              className={`p-4 rounded-lg border-2 border-[#8D6E63] flex flex-col items-center transition-all ${
                currentScore < item.cost ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105 hover:shadow-lg active:scale-95 bg-white/50'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${item.css} mb-2 shadow-inner border border-black/20`}></div>
              <span className="font-bold text-[#3E2723] text-sm">{item.name}</span>
              <span className="text-[#2E7D32] font-mono text-xs mt-1">{item.cost} Semillas</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}