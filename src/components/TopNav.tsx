import React from 'react';
import {
  Search,
  Plus,
  Bell,
  MessageSquare,
  Settings,
  Barcode,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';

interface TopNavProps {
  onOpenScanner: () => void;
  onOpenPrint: () => void;
  onOpenAddLocation: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenScanner,
  onOpenPrint,
  onOpenAddLocation,
}) => {
  const { currentStore, stores, setCurrentStoreId, resetToInitialSeed } = useWarehouse();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Title & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Diseño Visual de Bodegas
            </h1>
          </div>
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
            <span>Inicio</span>
            <span>•</span>
            <span>Inventario</span>
            <span>•</span>
            <span>Ubicaciones</span>
            <span>•</span>
            <span className="text-gray-600 font-medium">Diseño Visual</span>
          </nav>
        </div>

        {/* Right: Quick actions, store switcher, and profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Store switcher */}
          <div className="hidden sm:flex items-center text-xs">
            <span className="text-gray-400 mr-1.5">Sucursal:</span>
            <select
              value={currentStore.id}
              onChange={(e) => setCurrentStoreId(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Scanner shortcut button */}
          <button
            onClick={onOpenScanner}
            title="Simulador de escáner láser con tolerancia $ -> Ñ y ' -> -"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-700 rounded-lg text-xs font-medium transition-all cursor-pointer border border-gray-200"
          >
            <Barcode className="w-4 h-4 text-orange-600" />
            <span className="hidden md:inline">Escáner ($ / ')</span>
            <kbd className="hidden lg:inline text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">
              ⌘K
            </kbd>
          </button>

          {/* Print 4 sheets shortcut */}
          <button
            onClick={onOpenPrint}
            title="Imprimir plano en 4 hojas tipo mosaico"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-700 rounded-lg text-xs font-medium transition-all cursor-pointer border border-gray-200"
          >
            <Printer className="w-4 h-4 text-orange-600" />
            <span className="hidden md:inline">Plano 4 Hojas</span>
          </button>

          {/* Quick Add */}
          <button
            onClick={onOpenAddLocation}
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
            title="Crear nueva ubicación"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={() => {
              if (window.confirm('¿Deseas reiniciar los datos a la demostración inicial?')) {
                resetToInitialSeed();
              }
            }}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors cursor-pointer"
            title="Reiniciar datos de demo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Notification bell */}
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
          </button>

          {/* Flag (Mexico) */}
          <div className="w-7 h-5 rounded overflow-hidden shadow-xs flex items-center justify-center border border-gray-200" title="México">
            <div className="w-1/3 h-full bg-emerald-700" />
            <div className="w-1/3 h-full bg-white flex items-center justify-center text-[7px]">🦅</div>
            <div className="w-1/3 h-full bg-red-600" />
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
              alt="Pablo - Operaciones"
              className="w-8 h-8 rounded-full object-cover border border-gray-300"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
