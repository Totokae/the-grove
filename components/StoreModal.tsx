'use client';

import { useState } from 'react';

// Tipos de datos para la tienda
export interface StoreItem {
  id: string;
  name: string;
  color: number;
  price: number;
  category: 'hair' | 'body' | 'face'; // Nueva propiedad clave
}

// --- CATÁLOGOS POR CATEGORÍA ---
const HAIR_CATALOG: StoreItem[] = [
  { id: 'hair_classic', name: 'Original', color: 0xffffff, price: 0, category: 'hair' },
  { id: 'hair_red', name: 'Pelirrojo', color: 0xd50000, price: 50, category: 'hair' },
  { id: 'hair_blue', name: 'Azul Cósmico', color: 0x2962ff, price: 100, category: 'hair' },
  { id: 'hair_gold', name: 'Rubio Dorado', color: 0xffd600, price: 500, category: 'hair' },
  { id: 'hair_punk', name: 'Verde Punk', color: 0x00c853, price: 200, category: 'hair' },
  { id: 'hair_pink', name: 'Rosa Pastel', color: 0xff80ab, price: 150, category: 'hair' },
];

const BODY_CATALOG: StoreItem[] = [
  { id: 'body_classic', name: 'Básico', color: 0xffffff, price: 0, category: 'body' },
  { id: 'body_dark', name: 'Traje Ninja', color: 0x212121, price: 300, category: 'body' },
  { id: 'body_gold', name: 'Armadura Dorada', color: 0xffd700, price: 1000, category: 'body' },
  { id: 'body_blue', name: 'Túnica de Sabio', color: 0x1565c0, price: 150, category: 'body' },
  { id: 'body_green', name: 'Explorador', color: 0x2e7d32, price: 100, category: 'body' },
];

const FACE_CATALOG: StoreItem[] = [
  { id: 'face_classic', name: 'Normal', color: 0xffffff, price: 0, category: 'face' },
  { id: 'face_tan', name: 'Bronceado', color: 0xffcc80, price: 50, category: 'face' },
  { id: 'face_pale', name: 'Vampiro', color: 0xe0e0e0, price: 200, category: 'face' },
  { id: 'face_alien', name: 'Alien', color: 0xb2ff59, price: 500, category: 'face' },
];

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeeds: number;
  ownedItems: string[]; // Lista de IDs comprados
  selectedItems: { hair: string; body: string; face: string }; // IDs equipados actualmente
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
}

export default function StoreModal({ 
  isOpen, onClose, currentSeeds, ownedItems, selectedItems, onBuy, onEquip 
}: StoreModalProps) {
  
  const [activeTab, setActiveTab] = useState<'hair' | 'body' | 'face'>('hair');

  if (!isOpen) return null;

  // Seleccionar el catálogo según la pestaña activa
  const currentCatalog = 
    activeTab === 'hair' ? HAIR_CATALOG : 
    activeTab === 'body' ? BODY_CATALOG : 
    FACE_CATALOG;

  // Obtener el item equipado actualmente en esta categoría
  const currentEquippedId = selectedItems[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-3xl bg-[#fff8e1] border-4 border-[#ff8f00] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="bg-[#ff8f00] p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h2 className="text-xl font-bold text-white font-serif uppercase tracking-wider">Boutique del Bosque</h2>
              <p className="text-white/80 text-xs font-bold">Personaliza tu estilo</p>
            </div>
          </div>
          <div className="px-4 py-1 bg-black/20 rounded-full text-white font-bold border border-white/20">
            🌱 Tienes: {currentSeeds}
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex bg-[#ffecb3] border-b border-[#ffca28]">
          <button 
            onClick={() => setActiveTab('hair')}
            className={`flex-1 py-3 font-bold text-sm uppercase transition-colors ${activeTab === 'hair' ? 'bg-[#fff8e1] text-[#ff6f00] border-b-4 border-[#ff6f00]' : 'text-[#8d6e63] hover:bg-[#ffe082]'}`}
          >
            💇 Pelo
          </button>
          <button 
            onClick={() => setActiveTab('body')}
            className={`flex-1 py-3 font-bold text-sm uppercase transition-colors ${activeTab === 'body' ? 'bg-[#fff8e1] text-[#ff6f00] border-b-4 border-[#ff6f00]' : 'text-[#8d6e63] hover:bg-[#ffe082]'}`}
          >
            👕 Cuerpo
          </button>
          <button 
            onClick={() => setActiveTab('face')}
            className={`flex-1 py-3 font-bold text-sm uppercase transition-colors ${activeTab === 'face' ? 'bg-[#fff8e1] text-[#ff6f00] border-b-4 border-[#ff6f00]' : 'text-[#8d6e63] hover:bg-[#ffe082]'}`}
          >
            🙂 Cara
          </button>
        </div>

        {/* Rejilla de Productos */}
        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-grow bg-[#fff8e1]">
          {currentCatalog.map((item) => {
            const isOwned = ownedItems.includes(item.id) || item.price === 0; // Los items gratis siempre son owned
            const isEquipped = currentEquippedId === item.id;
            const canAfford = currentSeeds >= item.price;

            return (
              <div 
                key={item.id}
                className={`
                  relative flex flex-col items-center p-3 rounded-xl border-2 transition-all
                  ${isEquipped ? 'bg-[#ffecb3] border-[#ff6f00] ring-2 ring-[#ffca28] scale-105' : 'bg-white border-gray-200 hover:border-[#ffcc80]'}
                `}
              >
                {/* Visualización del Color (Simulada con círculo) */}
                <div 
                  className="w-12 h-12 rounded-full mb-2 shadow-inner border-2 border-black/10"
                  style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }}
                />
                
                <h3 className="font-bold text-gray-700 mb-1 text-center text-xs truncate w-full">{item.name}</h3>
                
                {/* Botón de Acción */}
                {isOwned ? (
                  <button
                    onClick={() => onEquip(item)}
                    disabled={isEquipped}
                    className={`
                      w-full py-1 rounded font-bold text-xs mt-auto
                      ${isEquipped 
                        ? 'bg-green-600 text-white cursor-default shadow-none' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-black'}
                    `}
                  >
                    {isEquipped ? 'EQUIPADO' : 'USAR'}
                  </button>
                ) : (
                  <button
                    onClick={() => onBuy(item)}
                    disabled={!canAfford}
                    className={`
                      w-full py-1 rounded font-bold text-xs mt-auto flex items-center justify-center gap-1
                      ${canAfford 
                        ? 'bg-[#ff6f00] text-white hover:bg-[#e65100] shadow-[0_2px_0_#bf360c] active:translate-y-[2px] active:shadow-none' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    🌱 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie de página */}
        <div className="p-3 bg-[#ffecb3] flex justify-end border-t border-[#ffca28]">
          <button 
            onClick={onClose} 
            className="px-6 py-2 text-[#ff6f00] font-bold hover:bg-[#ffe082] rounded-lg transition-colors text-sm"
          >
            CERRAR TIENDA
          </button>
        </div>

      </div>
    </div>
  );
}