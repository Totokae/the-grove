'use client';

// Catálogo de productos disponibles
interface StoreItem {
  id: string;
  name: string;
  color: number; // Color Hexadecimal para Phaser (ej: 0xff0000 es rojo)
  price: number;
}

const CATALOG: StoreItem[] = [
  { id: 'classic', name: 'Korok Clásico', color: 0xffffff, price: 0 },
  { id: 'red', name: 'Fuego Matemático', color: 0xff5252, price: 50 },
  { id: 'blue', name: 'Sabio Azul', color: 0x448aff, price: 100 },
  { id: 'gold', name: 'Maestro Dorado', color: 0xffd700, price: 500 },
  { id: 'dark', name: 'Ninja Sombra', color: 0x212121, price: 1000 },
  { id: 'pink', name: 'Espíritu Rosa', color: 0xff80ab, price: 150 },
];

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeeds: number;
  ownedItems: string[]; // Lista de IDs que ya tengo
  selectedItem: string; // ID del que estoy usando
  onBuy: (item: StoreItem) => void;
  onEquip: (item: StoreItem) => void;
}

export default function StoreModal({ 
  isOpen, onClose, currentSeeds, ownedItems, selectedItem, onBuy, onEquip 
}: StoreModalProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-2xl bg-[#fff8e1] border-4 border-[#ff8f00] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Cabecera de la Tienda */}
        <div className="bg-[#ff8f00] p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h2 className="text-xl font-bold text-white font-serif uppercase tracking-wider">Boutique del Bosque</h2>
              <p className="text-white/80 text-xs font-bold">Gasta tus semillas sabiamente</p>
            </div>
          </div>
          
          <div className="px-4 py-1 bg-black/20 rounded-full text-white font-bold border border-white/20">
            🌱 Tienes: {currentSeeds}
          </div>
        </div>

        {/* Rejilla de Productos */}
        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATALOG.map((item) => {
            const isOwned = ownedItems.includes(item.id);
            const isEquipped = selectedItem === item.id;
            const canAfford = currentSeeds >= item.price;

            return (
              <div 
                key={item.id}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl border-2 transition-all
                  ${isEquipped ? 'bg-[#ffecb3] border-[#ff6f00] ring-4 ring-[#ffca28]' : 'bg-white border-gray-200'}
                `}
              >
                {/* Visualización del Color */}
                <div 
                  className="w-16 h-16 rounded-full mb-3 shadow-inner border-2 border-black/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }}
                />
                
                <h3 className="font-bold text-gray-700 mb-1 text-center text-sm">{item.name}</h3>
                
                {/* Botón de Acción */}
                {isOwned ? (
                  <button
                    onClick={() => onEquip(item)}
                    disabled={isEquipped}
                    className={`
                      w-full py-1 rounded-lg font-bold text-sm mt-2
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
                      w-full py-1 rounded-lg font-bold text-sm mt-2 flex items-center justify-center gap-1
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
        <div className="p-4 bg-[#ffecb3] flex justify-end border-t border-[#ffca28]">
          <button 
            onClick={onClose} 
            className="px-6 py-2 text-[#ff6f00] font-bold hover:bg-[#ffe082] rounded-lg transition-colors"
          >
            CERRAR TIENDA
          </button>
        </div>

      </div>
    </div>
  );
}