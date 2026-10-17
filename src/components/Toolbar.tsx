import React from 'react';
import {
  LayoutGrid,
  Save,
  Edit2,
  Eye,
  ChevronDown,
  Printer,
  Barcode,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';

interface ToolbarProps {
  onOpenPrint: () => void;
  onOpenScanner: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onOpenPrint, onOpenScanner }) => {
  const {
    bodegas,
    activeBodega,
    setActiveBodegaId,
    currentStore,
    isEditing,
    setIsEditing,
    hasUnsavedChanges,
    saveChanges,
    overlappingColumnIds,
  } = useWarehouse();

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs px-5 py-3.5 mb-4 flex flex-wrap items-center justify-between gap-4 no-print">
      {/* Left: Module title & Bodega selector */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center bg-gray-50 text-gray-700 shadow-xs">
            <LayoutGrid className="w-5 h-5 text-gray-800" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              Editor de Layout de Bodega
            </h2>
            <div className="text-[11px] text-gray-400 font-medium">
              Bodega → columna → nivel
            </div>
          </div>
        </div>

        {/* Warehouse Dropdown */}
        <div className="flex flex-col">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
            Bodega
          </label>
          <div className="relative">
            <select
              value={activeBodega?.id || ''}
              onChange={(e) => setActiveBodegaId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer min-w-[200px]"
            >
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {currentStore.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Overlap alert warning if columns collide */}
        {overlappingColumnIds.size > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {overlappingColumnIds.size} columna(s) superpuestas en el canvas. Arrastra para separar.
            </span>
          </div>
        )}
      </div>

      {/* Right: Badges & Controls matching screenshot */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Store Badge (Dark pill) */}
        <span className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-full shadow-xs">
          Sucursal: {currentStore.name}
        </span>

        {/* Volver button */}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          Volver
        </button>

        {/* 4-Sheet Poster Print Button */}
        <button
          onClick={onOpenPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          title="Imprimir mapa dividido en 4 hojas que al unirlas completan el plano del almacén"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir 4 Hojas</span>
        </button>

        {/* Edit Mode Toggle Button (Yellow/Amber button matching image.png) */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            isEditing
              ? 'bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {isEditing ? (
            <>
              <Edit2 className="w-3.5 h-3.5" />
              <span>Editando</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Modo Vista</span>
            </>
          )}
        </button>

        {/* Save Button */}
        <button
          onClick={saveChanges}
          disabled={!hasUnsavedChanges}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            hasUnsavedChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20 animate-pulse'
              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{hasUnsavedChanges ? 'Guardar Cambios' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
};
