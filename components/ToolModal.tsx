'use client';

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
}

export default function ToolModal({ isOpen, onClose, toolId }: ToolModalProps) {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (toolId) {
      case 'fraction_visualizer':
        // 👇 INTEGRACIÓN DEL CUBO DE BINOMIO
        return (
          <div className="w-full h-full flex flex-col">
            <h2 className="text-xl font-bold text-[#3e2723] mb-2 text-center">🧊 Cubo de Binomio Interactivo</h2>
            <div className="flex-grow bg-white rounded-lg border-2 border-[#5d4037] overflow-hidden shadow-inner" style={{ height: '500px' }}>
              <iframe 
                src="https://web1-xi-six.vercel.app/cubobinomio.html" 
                className="w-full h-full"
                title="Cubo de Binomio"
                frameBorder="0"
                allowFullScreen
              />
            </div>
            <p className="text-sm text-[#5d4037] mt-2 italic text-center">
              Manipula las piezas para visualizar la expansión de $(a+b)^3$
            </p>
          </div>
        );
      
      case 'ancient_calculator':
        return (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold text-[#3e2723] mb-4">🧮 Calculadora Ancestral</h2>
            <p>Contenido de la calculadora aquí...</p>
          </div>
        );

      default:
        return <p className="text-center p-10 text-[#3e2723]">Herramienta no identificada.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#fff3e0] border-4 border-[#5d4037] rounded-2xl shadow-2xl w-full max-w-4xl p-4 relative overflow-hidden">
        
        {/* Botón Cerrar Estilizado */}
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