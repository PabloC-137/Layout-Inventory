import React, { useState, useRef } from 'react';
import { Printer, X, Download, HelpCircle, Layers, ZoomIn } from 'lucide-react';
import { Location } from '../types/warehouse';

interface FourSheetPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBodega: Location;
  columns: Location[];
  levels: Location[];
  storeName: string;
}

export const FourSheetPrintModal: React.FC<FourSheetPrintModalProps> = ({
  isOpen,
  onClose,
  activeBodega,
  columns,
  levels,
  storeName,
}) => {
  const [selectedSheet, setSelectedSheet] = useState<number | 'all'>('all');
  const [showAssemblyGuide, setShowAssemblyGuide] = useState(true);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Determine warehouse layout boundaries
  const warehouseWidth = activeBodega.layout_config?.w || 1200;
  const warehouseHeight = activeBodega.layout_config?.h || 800;

  const halfWidth = warehouseWidth / 2;
  const halfHeight = warehouseHeight / 2;

  // 4 Quadrants
  const quadrants = [
    {
      sheetNumber: 1,
      title: 'Hoja 1 de 4 (Superior Izquierda)',
      subtitle: 'Noroeste / Pasillos 1 al fondo',
      viewBox: `0 0 ${halfWidth} ${halfHeight}`,
      xOffset: 0,
      yOffset: 0,
      badge: 'CUADRANTE A1',
      glueRight: 'Pegar con Hoja 2 →',
      glueBottom: 'Pegar con Hoja 3 ↓',
    },
    {
      sheetNumber: 2,
      title: 'Hoja 2 de 4 (Superior Derecha)',
      subtitle: 'Noreste / Pasillos de carga',
      viewBox: `${halfWidth} 0 ${halfWidth} ${halfHeight}`,
      xOffset: halfWidth,
      yOffset: 0,
      badge: 'CUADRANTE A2',
      glueLeft: '← Pegar con Hoja 1',
      glueBottom: 'Pegar con Hoja 4 ↓',
    },
    {
      sheetNumber: 3,
      title: 'Hoja 3 de 4 (Inferior Izquierda)',
      subtitle: 'Suroeste / Acceso principal',
      viewBox: `0 ${halfHeight} ${halfWidth} ${halfHeight}`,
      xOffset: 0,
      yOffset: halfHeight,
      badge: 'CUADRANTE B1',
      glueTop: '↑ Pegar con Hoja 1',
      glueRight: 'Pegar con Hoja 4 →',
    },
    {
      sheetNumber: 4,
      title: 'Hoja 4 de 4 (Inferior Derecha)',
      subtitle: 'Sureste / Bahía de salida',
      viewBox: `${halfWidth} ${halfHeight} ${halfWidth} ${halfHeight}`,
      xOffset: halfWidth,
      yOffset: halfHeight,
      badge: 'CUADRANTE B2',
      glueTop: '↑ Pegar con Hoja 2',
      glueLeft: '← Pegar con Hoja 3',
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const renderQuadrantSVG = (q: typeof quadrants[0]) => {
    return (
      <svg
        viewBox={q.viewBox}
        className="w-full h-full bg-white border border-gray-300"
        style={{ minHeight: '380px' }}
      >
        {/* Subtle dot grid */}
        <defs>
          <pattern id={`dot-pattern-${q.sheetNumber}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#cbd5e1" />
          </pattern>
        </defs>
        <rect x={q.xOffset} y={q.yOffset} width={halfWidth} height={halfHeight} fill={`url(#dot-pattern-${q.sheetNumber})`} />

        {/* Alignment crosshairs and center lines */}
        <line
          x1={halfWidth}
          y1="0"
          x2={halfWidth}
          y2={warehouseHeight}
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <line
          x1="0"
          y1={halfHeight}
          x2={warehouseWidth}
          y2={halfHeight}
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Render Columns */}
        {columns.map((col) => {
          const colX = col.layout_config.x;
          const colY = col.layout_config.y;
          const colW = col.layout_config.w;
          const colH = col.layout_config.h;

          // Check if column intersects this quadrant
          const intersects = !(
            colX + colW < q.xOffset ||
            colX > q.xOffset + halfWidth ||
            colY + colH < q.yOffset ||
            colY > q.yOffset + halfHeight
          );

          if (!intersects) return null;

          const colLevels = levels.filter((l) => l.parent_location_id === col.id);

          return (
            <g key={col.id} transform={`translate(${colX}, ${colY})`}>
              {/* Column Box */}
              <rect
                x="0"
                y="0"
                width={colW}
                height={colH}
                rx="8"
                fill="#f8fafc"
                stroke="#f97316"
                strokeWidth="2.5"
              />
              {/* Column Header */}
              <rect x="0" y="0" width={colW} height="28" rx="8" fill="#ffedd5" />
              <rect x="0" y="20" width={colW} height="8" fill="#ffedd5" />
              <text
                x="8"
                y="18"
                fontSize="12"
                fontWeight="bold"
                fill="#c2410c"
                fontFamily="system-ui, sans-serif"
              >
                {col.code}
              </text>
              <text
                x={colW - 8}
                y="18"
                fontSize="9"
                textAnchor="end"
                fill="#9a3412"
                fontFamily="system-ui, sans-serif"
              >
                Columna
              </text>

              {/* Levels inside column */}
              {colLevels.map((lvl, index) => {
                const totalLvls = colLevels.length || 1;
                const levelH = Math.max(26, (colH - 36 - (totalLvls - 1) * 4) / totalLvls);
                const levelY = 32 + index * (levelH + 4);

                return (
                  <g key={lvl.id} transform={`translate(6, ${levelY})`}>
                    <rect
                      x="0"
                      y="0"
                      width={colW - 12}
                      height={levelH}
                      rx="4"
                      fill="#ffffff"
                      stroke="#d1d5db"
                      strokeWidth="1.2"
                    />
                    <text
                      x="6"
                      y={levelH / 2 + 4}
                      fontSize="10"
                      fontWeight="600"
                      fill="#1f2937"
                      fontFamily="system-ui, sans-serif"
                    >
                      {lvl.code}
                    </text>
                    <text
                      x={colW - 18}
                      y={levelH / 2 + 4}
                      fontSize="9"
                      textAnchor="end"
                      fill="#6b7280"
                      fontFamily="system-ui, sans-serif"
                    >
                      {lvl.name}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Alignment corner crosshair */}
        <g stroke="#2563eb" strokeWidth="1.5">
          {/* Top-left corner mark */}
          <line x1={q.xOffset + 10} y1={q.yOffset + 10} x2={q.xOffset + 24} y2={q.yOffset + 10} />
          <line x1={q.xOffset + 10} y1={q.yOffset + 10} x2={q.xOffset + 10} y2={q.yOffset + 24} />
          {/* Bottom-right corner mark */}
          <line
            x1={q.xOffset + halfWidth - 10}
            y1={q.yOffset + halfHeight - 10}
            x2={q.xOffset + halfWidth - 24}
            y2={q.yOffset + halfHeight - 10}
          />
          <line
            x1={q.xOffset + halfWidth - 10}
            y1={q.yOffset + halfHeight - 10}
            x2={q.xOffset + halfWidth - 10}
            y2={q.yOffset + halfHeight - 24}
          />
        </g>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Impresión de Plano en 4 Hojas (Mosaico 2x2)
              </h2>
              <p className="text-xs text-gray-500">
                Almacén: <span className="font-semibold text-gray-800">{activeBodega.name}</span> | Sucursal:{' '}
                <span className="font-semibold text-gray-800">{storeName}</span> | Al unir las 4 hojas se forma el mapa completo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ahora (4 Hojas)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Controls / View Selector */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedSheet('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                selectedSheet === 'all'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vista Previa de las 4 Hojas
            </button>
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedSheet(num)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  selectedSheet === num
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Hoja {num}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-gray-500">
            <button
              onClick={() => setShowAssemblyGuide(!showAssemblyGuide)}
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              {showAssemblyGuide ? 'Ocultar guía de ensamblado' : 'Ver guía de ensamblado'}
            </button>
            <span className="text-gray-300">|</span>
            <span>Escala ajustada a cuadrícula de corte de 15mm</span>
          </div>
        </div>

        {/* Assembly Guide Banner */}
        {showAssemblyGuide && (
          <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Instrucciones de unión física:</strong> Imprime en papel Bond o Cartulina estándar. Corta por
                las líneas punteadas de guía roja y sobrepón la solapa de unión (15mm) siguiendo el orden: Hoja 1
                (Sup-Izq) con Hoja 2 (Sup-Der), luego Hoja 3 (Inf-Izq) con Hoja 4 (Inf-Der).
              </span>
            </div>
            <button
              onClick={() => setShowAssemblyGuide(false)}
              className="text-amber-700 hover:text-amber-950 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sheets Canvas / Printable Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100/80" ref={printAreaRef}>
          <div className="print-container grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {quadrants
              .filter((q) => selectedSheet === 'all' || selectedSheet === q.sheetNumber)
              .map((q) => (
                <div
                  key={q.sheetNumber}
                  className="sheet-page bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col relative"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 font-bold text-[10px] rounded">
                          {q.badge}
                        </span>
                        <h3 className="font-bold text-sm text-gray-800">{q.title}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500">{q.subtitle}</p>
                    </div>
                    <div className="text-right text-[10px] text-gray-400">
                      <div>Almacén: {activeBodega.name}</div>
                      <div>Fecha: {new Date().toLocaleDateString('es-MX')}</div>
                    </div>
                  </div>

                  {/* Overlap & Glue Instructions */}
                  <div className="text-[10px] text-blue-600 flex justify-between font-mono px-1 py-0.5 mb-1 bg-blue-50/50 rounded">
                    <span>{q.glueTop || q.glueBottom}</span>
                    <span>{q.glueLeft || q.glueRight}</span>
                  </div>

                  {/* Quadrant Render */}
                  <div className="flex-1 rounded-lg overflow-hidden border border-gray-100 shadow-inner">
                    {renderQuadrantSVG(q)}
                  </div>

                  {/* Sheet Footer */}
                  <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Sistema de Inventario • Musicales Doris</span>
                    <span>Cruz de calce central: (X: {halfWidth}px, Y: {halfHeight}px)</span>
                    <span className="font-semibold text-gray-600">Pág. {q.sheetNumber}/4</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Formato optimizado para 4 hojas tamaño Carta (Letter) o A4 horizontal/vertical.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Enviar a Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
