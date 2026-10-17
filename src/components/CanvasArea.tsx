import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Package,
  AlertTriangle,
  Move,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { Location } from '../types/warehouse';

interface CanvasAreaProps {
  onSelectLocation: (loc: Location) => void;
  onOpenAddChild: (parent: Location) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  onSelectLocation,
  onOpenAddChild,
}) => {
  const {
    activeBodega,
    locations,
    selectedLocation,
    setSelectedLocationId,
    highlightedLocationId,
    isEditing,
    zoom,
    setZoom,
    updateLocationLayout,
    overlappingColumnIds,
    getLocationStockSummary,
  } = useWarehouse();

  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging and resizing states
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialLayout, setInitialLayout] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  const columns = activeBodega
    ? locations.filter((l) => l.parent_location_id === activeBodega.id)
    : [];

  const GRID_SIZE = 20;

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(40, prev - 15));
  const handleResetZoom = () => setZoom(100);

  // Start dragging a column
  const handleMouseDownDrag = (col: Location, e: React.MouseEvent) => {
    if (!isEditing) {
      setSelectedLocationId(col.id);
      return;
    }
    e.stopPropagation();
    setDraggingId(col.id);
    setSelectedLocationId(col.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialLayout({
      x: col.layout_config.x,
      y: col.layout_config.y,
      w: col.layout_config.w,
      h: col.layout_config.h,
    });
  };

  // Start resizing a column
  const handleMouseDownResize = (col: Location, e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    setResizingId(col.id);
    setSelectedLocationId(col.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialLayout({
      x: col.layout_config.x,
      y: col.layout_config.y,
      w: col.layout_config.w,
      h: col.layout_config.h,
    });
  };

  // Global mouse move and up for drag & resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const zoomScale = zoom / 100;

      if (draggingId) {
        const dx = (e.clientX - dragStartPos.x) / zoomScale;
        const dy = (e.clientY - dragStartPos.y) / zoomScale;

        const newX = Math.max(0, snapToGrid(initialLayout.x + dx));
        const newY = Math.max(0, snapToGrid(initialLayout.y + dy));

        updateLocationLayout(draggingId, { x: newX, y: newY });
      } else if (resizingId) {
        const dx = (e.clientX - dragStartPos.x) / zoomScale;
        const dy = (e.clientY - dragStartPos.y) / zoomScale;

        const newW = Math.max(100, snapToGrid(initialLayout.w + dx));
        const newH = Math.max(160, snapToGrid(initialLayout.h + dy));

        updateLocationLayout(resizingId, { w: newW, h: newH });
      }
    },
    [draggingId, resizingId, dragStartPos, initialLayout, zoom, updateLocationLayout]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setResizingId(null);
  }, []);

  useEffect(() => {
    if (draggingId || resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, resizingId, handleMouseMove, handleMouseUp]);

  if (!activeBodega) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-gray-200/90 flex items-center justify-center p-8 text-center text-gray-400">
        No hay bodega seleccionada.
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-200/90 shadow-xs relative overflow-hidden flex flex-col h-[calc(100vh-160px)] min-h-[600px]">
      {/* Top Floating Zoom & Fit Controls (matching image.png) */}
      <div className="absolute top-4 left-4 z-20 flex items-center bg-white/95 backdrop-blur-xs border border-gray-200 shadow-sm rounded-xl px-1.5 py-1 text-xs select-none">
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
          title="Reducir zoom"
        >
          —
        </button>
        <span className="w-12 text-center font-bold text-gray-700 font-mono text-[11px]">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
          title="Aumentar zoom"
        >
          +
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button
          onClick={handleResetZoom}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
          title="Ajustar al 100%"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Canvas Scrollable Workspace with Dot Grid (matching image.png) */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative cursor-grab active:cursor-grabbing p-8"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          backgroundColor: '#fafbfc',
        }}
        onClick={() => setSelectedLocationId(null)}
      >
        {/* Scaled Artboard */}
        <div
          className="relative transition-transform duration-75 origin-top-left"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${activeBodega.layout_config?.w || 1400}px`,
            height: `${activeBodega.layout_config?.h || 900}px`,
            minWidth: '1200px',
            minHeight: '800px',
          }}
        >
          {/* Warehouse Boundary Outline */}
          <div className="absolute inset-0 border-2 border-dashed border-gray-300/80 rounded-3xl pointer-events-none">
            <div className="absolute top-3 left-4 text-xs font-bold text-gray-400 font-mono uppercase tracking-widest flex items-center gap-2">
              <span>{activeBodega.name}</span>
              <span>•</span>
              <span>Área: {activeBodega.layout_config?.w || 1400}x{activeBodega.layout_config?.h || 900}px</span>
            </div>
          </div>

          {/* Render Columns */}
          {columns.map((col) => {
            const isSelected = selectedLocation?.id === col.id;
            const isHighlighted = highlightedLocationId === col.id;
            const isOverlapping = overlappingColumnIds.has(col.id);
            const colLevels = locations.filter((l) => l.parent_location_id === col.id);
            const summary = getLocationStockSummary(col.id);

            return (
              <div
                key={col.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocationId(col.id);
                }}
                onMouseDown={(e) => handleMouseDownDrag(col, e)}
                style={{
                  transform: `translate(${col.layout_config.x}px, ${col.layout_config.y}px)`,
                  width: `${col.layout_config.w}px`,
                  height: `${col.layout_config.h}px`,
                  borderColor: isOverlapping ? '#f97316' : isSelected ? '#ea580c' : '#fdba74',
                }}
                className={`absolute rounded-2xl bg-gray-100/90 shadow-md border-[2.5px] transition-shadow select-none flex flex-col overflow-hidden group ${
                  isSelected ? 'ring-3 ring-orange-500/30 shadow-xl z-20' : 'hover:shadow-lg z-10'
                } ${isHighlighted ? 'ring-4 ring-orange-500 animate-pulse z-30' : ''}`}
              >
                {/* Column Header (matching image.png) */}
                <div className="px-3 py-2 bg-gradient-to-r from-orange-100/90 to-amber-100/90 border-b border-orange-200/80 flex items-center justify-between cursor-move">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-extrabold text-sm text-gray-900 tracking-tight">
                      {col.code}
                    </span>
                    <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Columna
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Package icon with stock count */}
                    {summary.totalItems > 0 && (
                      <span
                        className="p-1 bg-emerald-100 text-emerald-800 rounded-md"
                        title={`${summary.totalItems} unidades en ${summary.totalVariants} productos`}
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                    )}

                    {/* Overlap Warning Badge (matching image.png) */}
                    {isOverlapping && (
                      <span
                        className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs animate-bounce"
                        title="Esta columna está superpuesta con otra en el layout"
                      >
                        !
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle / Name */}
                <div className="px-3 py-1 bg-white/60 border-b border-gray-200/50 flex items-center justify-between text-[10px] text-gray-600">
                  <span className="truncate font-medium">{col.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLocation(col);
                    }}
                    className="text-orange-600 hover:text-orange-800 font-bold hover:underline cursor-pointer"
                  >
                    Detalles
                  </button>
                </div>

                {/* Niveles Stacked inside Column (matching image.png) */}
                <div className="flex-1 p-2 space-y-1.5 overflow-y-auto bg-gray-50/50">
                  {colLevels.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-2 border-2 border-dashed border-gray-300 rounded-xl">
                      <span className="text-[11px] text-gray-400">Sin niveles</span>
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAddChild(col);
                          }}
                          className="mt-1 text-[10px] text-orange-600 font-bold hover:underline"
                        >
                          + Agregar nivel
                        </button>
                      )}
                    </div>
                  ) : (
                    colLevels.map((lvl) => {
                      const isLvlSelected = selectedLocation?.id === lvl.id;
                      const isLvlHighlighted = highlightedLocationId === lvl.id;
                      const lvlSummary = getLocationStockSummary(lvl.id);

                      return (
                        <div
                          key={lvl.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLocationId(lvl.id);
                            onSelectLocation(lvl);
                          }}
                          className={`p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isLvlSelected
                              ? 'bg-orange-500 text-white border-orange-600 shadow-sm font-semibold'
                              : 'bg-white hover:bg-orange-50/70 border-gray-200 text-gray-800 shadow-2xs'
                          } ${isLvlHighlighted ? 'ring-2 ring-orange-500 animate-pulse' : ''}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-bold text-[11px] ${
                                  isLvlSelected ? 'text-white' : 'text-gray-900'
                                }`}
                              >
                                {lvl.code}
                              </span>
                              <span
                                className={`text-[10px] truncate ${
                                  isLvlSelected ? 'text-orange-100' : 'text-gray-500'
                                }`}
                              >
                                {lvl.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {lvlSummary.totalItems > 0 && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isLvlSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {lvlSummary.totalItems} uds
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Resize Handle at bottom right (active in editing mode) */}
                {isEditing && (
                  <div
                    onMouseDown={(e) => handleMouseDownResize(col, e)}
                    className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-60 hover:opacity-100 flex items-center justify-center text-gray-500"
                    title="Arrastra para cambiar el tamaño de la columna"
                  >
                    <svg viewBox="0 0 6 6" className="w-2.5 h-2.5 fill-gray-600">
                      <circle cx="5" cy="5" r="1" />
                      <circle cx="5" cy="2" r="1" />
                      <circle cx="2" cy="5" r="1" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Helper Card at bottom right (matching user screenshot) */}
      <div className="absolute bottom-4 right-4 z-20 max-w-xs bg-white/95 backdrop-blur-xs border border-gray-200 shadow-lg rounded-2xl p-4 text-xs select-none">
        <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          Mapa de ubicaciones
        </h4>
        <p className="text-gray-500 text-[11px] mt-1 leading-relaxed">
          Arrastra columnas y niveles; el ajuste a cuadrícula evita posiciones imprecisas. Haz clic en
          cualquier nivel para ver o transferir inventario.
        </p>
      </div>
    </div>
  );
};
