import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Package,
  Layers,
  AlertTriangle,
  Building,
  Columns,
  Eye,
  Trash2,
  Edit2,
  Barcode,
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { Location } from '../types/warehouse';
import { getLocationTier, isLeafLocation } from '../utils/hierarchy';
import { normalizeScannerCode } from '../utils/scanner';

interface SidebarStructureProps {
  onOpenAddModal: (parent?: Location | null) => void;
  onSelectLocation: (location: Location) => void;
}

export const SidebarStructure: React.FC<SidebarStructureProps> = ({
  onOpenAddModal,
  onSelectLocation,
}) => {
  const {
    bodegas,
    activeBodega,
    setActiveBodegaId,
    locations,
    selectedLocation,
    setSelectedLocationId,
    highlightedLocationId,
    overlappingColumnIds,
    getLocationStockSummary,
    searchQuery,
    setSearchQuery,
  } = useWarehouse();

  // Collapsed state map for tree nodes
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Scanner normalization for search
  const searchNormalized = useMemo(() => {
    return normalizeScannerCode(searchQuery).normalized;
  }, [searchQuery]);

  // Check if a location matches search
  const matchesSearch = (loc: Location): boolean => {
    if (!searchNormalized) return true;
    const codeNorm = loc.code.toUpperCase();
    const nameNorm = loc.name.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    return (
      codeNorm.includes(searchNormalized) ||
      nameNorm.includes(queryLower) ||
      codeNorm.includes(queryLower.toUpperCase())
    );
  };

  return (
    <aside className="w-80 bg-white rounded-2xl border border-gray-200/90 shadow-xs flex flex-col h-[calc(100vh-160px)] min-h-[600px] overflow-hidden no-print">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Estructura</h3>
        <button
          onClick={() => onOpenAddModal(null)}
          className="w-7 h-7 rounded-lg border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-600 flex items-center justify-center transition-colors cursor-pointer"
          title="Crear nueva bodega, columna o nivel"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input matching image.png */}
      <div className="p-3 border-b border-gray-100 bg-gray-50/50">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar código o nombre"
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
          />
        </div>
        {searchQuery && (
          <div className="text-[10px] text-gray-400 mt-1.5 flex justify-between px-1">
            <span>Buscando: {searchNormalized}</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-orange-600 hover:underline"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {bodegas.map((bodega) => {
          const isBodegaActive = activeBodega?.id === bodega.id;
          const isBodegaCollapsed = collapsedNodes[bodega.id];
          const bodegaColumns = locations.filter((l) => l.parent_location_id === bodega.id);
          const isBodegaHighlighted = highlightedLocationId === bodega.id;
          const isBodegaSelected = selectedLocation?.id === bodega.id;

          return (
            <div key={bodega.id} className="space-y-0.5">
              {/* Bodega Row */}
              <div
                onClick={() => {
                  setActiveBodegaId(bodega.id);
                  setSelectedLocationId(bodega.id);
                }}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                  isBodegaSelected
                    ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200'
                    : isBodegaActive
                    ? 'bg-gray-100/80 text-gray-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${isBodegaHighlighted ? 'ring-2 ring-orange-500 animate-pulse' : ''}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={(e) => toggleCollapse(bodega.id, e)}
                    className="p-0.5 hover:bg-gray-200/60 rounded text-gray-400 hover:text-gray-700"
                  >
                    {isBodegaCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{bodega.name}</span>
                  <span className="text-[10px] font-mono text-gray-400">({bodega.code})</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <span className="text-[10px] bg-gray-200/80 text-gray-700 font-semibold px-1.5 py-0.2 rounded">
                    {bodegaColumns.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddModal(bodega);
                    }}
                    className="p-1 hover:text-orange-600 rounded text-gray-400"
                    title="Agregar columna en esta bodega"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Columns under Bodega */}
              {!isBodegaCollapsed && (
                <div className="pl-4 space-y-0.5 border-l border-gray-100 ml-3">
                  {bodegaColumns.map((col) => {
                    const isColCollapsed = collapsedNodes[col.id];
                    const colLevels = locations.filter((l) => l.parent_location_id === col.id);
                    const isOverlapping = overlappingColumnIds.has(col.id);
                    const isColHighlighted = highlightedLocationId === col.id;
                    const isColSelected = selectedLocation?.id === col.id;

                    return (
                      <div key={col.id} className="space-y-0.5">
                        {/* Column Row */}
                        <div
                          onClick={() => {
                            if (activeBodega?.id !== bodega.id) {
                              setActiveBodegaId(bodega.id);
                            }
                            setSelectedLocationId(col.id);
                          }}
                          className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-all ${
                            isColSelected
                              ? 'bg-orange-100/70 text-orange-950 font-bold border border-orange-300'
                              : 'text-gray-600 hover:bg-gray-100/70'
                          } ${isColHighlighted ? 'ring-2 ring-orange-500 animate-pulse' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              onClick={(e) => toggleCollapse(col.id, e)}
                              className="p-0.5 text-gray-400 hover:text-gray-700"
                            >
                              {colLevels.length > 0 ? (
                                isColCollapsed ? (
                                  <ChevronRight className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )
                              ) : (
                                <span className="w-3 h-3 inline-block" />
                              )}
                            </button>
                            <Columns className="w-3 h-3 text-orange-500 shrink-0" />
                            <span className="truncate">{col.name}</span>
                            <span className="font-mono text-[10px] text-gray-400 font-semibold">
                              {col.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isOverlapping && (
                              <span title="Columna con superposición en el plano">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-bounce" />
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAddModal(col);
                              }}
                              className="p-0.5 hover:text-orange-600 text-gray-400"
                              title="Agregar nivel a esta columna"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Niveles under Column */}
                        {!isColCollapsed && (
                          <div className="pl-4 space-y-0.5 border-l border-gray-100 ml-3">
                            {colLevels.map((lvl) => {
                              const isLvlHighlighted = highlightedLocationId === lvl.id;
                              const isLvlSelected = selectedLocation?.id === lvl.id;
                              const stock = getLocationStockSummary(lvl.id);

                              return (
                                <div
                                  key={lvl.id}
                                  onClick={() => {
                                    if (activeBodega?.id !== bodega.id) {
                                      setActiveBodegaId(bodega.id);
                                    }
                                    setSelectedLocationId(lvl.id);
                                    onSelectLocation(lvl);
                                  }}
                                  className={`group flex items-center justify-between px-2 py-0.5 rounded cursor-pointer transition-all ${
                                    isLvlSelected
                                      ? 'bg-orange-500 text-white font-bold'
                                      : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-800'
                                  } ${isLvlHighlighted ? 'ring-2 ring-orange-500 animate-pulse' : ''}`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-orange-500 shrink-0" />
                                    <span className="truncate">{lvl.name}</span>
                                    <span
                                      className={`font-mono text-[10px] ${
                                        isLvlSelected ? 'text-orange-100' : 'text-gray-400'
                                      }`}
                                    >
                                      {lvl.code}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {stock.totalItems > 0 && (
                                      <span
                                        className={`text-[9px] px-1 rounded font-bold ${
                                          isLvlSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {stock.totalItems} uds
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/70 text-[11px] text-gray-500 flex items-center justify-between">
        <span>Total ubicaciones: {locations.length}</span>
        <button
          onClick={() => onOpenAddModal(null)}
          className="text-orange-600 hover:underline font-semibold cursor-pointer"
        >
          + Nueva
        </button>
      </div>
    </aside>
  );
};
