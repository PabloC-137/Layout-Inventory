import React, { useState } from 'react';
import { Barcode, CheckCircle2, AlertTriangle, ArrowRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { normalizeScannerCode } from '../utils/scanner';

interface ScannerSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerSimulatorModal: React.FC<ScannerSimulatorModalProps> = ({ isOpen, onClose }) => {
  const { processBarcodeScan, currentStore } = useWarehouse();
  const [inputCode, setInputCode] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    normalizedCode: string;
    matchedLocation?: any;
    matchedVariant?: any;
  } | null>(null);

  if (!isOpen) return null;

  const currentAnalysis = normalizeScannerCode(inputCode);

  const handleScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;

    const result = processBarcodeScan(inputCode);
    setScanResult(result);
  };

  const sampleCodes = [
    {
      label: "Ubicación 1-01-A con apóstrofes (1'01'A)",
      code: "1'01'A",
      explanation: "Escáner reemplaza guiones por comillas simples debido a layout EN-US",
    },
    {
      label: "Ubicación 1-54 con apóstrofe (1'54)",
      code: "1'54",
      explanation: "Rack de fondo con guión alterado",
    },
    {
      label: "Ubicación con signo pesos ($ -> Ñ)",
      code: "BOD$1",
      explanation: "Escáner envía '$' en lugar de la tecla 'Ñ'",
    },
    {
      label: "SKU Fender Stratocaster con comillas (GTR'FEN'ST01)",
      code: "GTR'FEN'ST01",
      explanation: "Código de producto SKU serializado",
    },
    {
      label: "Código de Barras EAN13 Yamaha (4957812015028)",
      code: "4957812015028",
      explanation: "Lectura directa estándar de código de barras",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Simulador de Escáner Láser & Barcode
              </h2>
              <p className="text-xs text-gray-500">
                Tolerancia automática de caracteres: <span className="font-mono text-orange-600 font-semibold">$ → Ñ</span> y{' '}
                <span className="font-mono text-orange-600 font-semibold">' → -</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Explanation note */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Compatibilidad con lectores de códigos de barra CODE128:</strong> Muchos escáneres USB
              emulan un teclado en inglés (US). Si el código contiene guiones <code>-</code> o la letra <code>Ñ</code>,
              el teclado emula <code>'</code> o <code>$</code>. Este sistema detecta y normaliza estos caracteres
              al instante en la sucursal activa (<strong>{currentStore.name}</strong>).
            </div>
          </div>

          <form onSubmit={handleScan} className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">
              Lectura de Escáner (Escribe o simula el disparo láser):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    setScanResult(null);
                  }}
                  placeholder="Ej: 1'01'A o 4957812015028 o 1'54..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all uppercase"
                  autoFocus
                />
                {inputCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode('');
                      setScanResult(null);
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Barcode className="w-4 h-4" />
                Escanear
              </button>
            </div>

            {/* Real-time normalization preview */}
            {inputCode && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Código crudo recibido:</span>
                  <span className="font-mono font-bold text-gray-700">{inputCode}</span>
                </div>
                <div className="flex items-center justify-between text-orange-700 font-medium">
                  <span>Código normalizado:</span>
                  <span className="font-mono font-bold text-base text-orange-600">
                    {currentAnalysis.normalized}
                  </span>
                </div>
                {(currentAnalysis.hasDollarToEnye || currentAnalysis.hasQuoteToDash) && (
                  <div className="text-[11px] text-emerald-700 pt-1 border-t border-gray-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Corregido:{' '}
                      {currentAnalysis.hasQuoteToDash ? "' → - (guión de separación)" : ''}
                      {currentAnalysis.hasQuoteToDash && currentAnalysis.hasDollarToEnye ? ' y ' : ''}
                      {currentAnalysis.hasDollarToEnye ? '$ → Ñ (letra Ñ)' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Quick Preset Buttons */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2">Casos de prueba rápidos:</div>
            <div className="space-y-1.5">
              {sampleCodes.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputCode(sample.code);
                    const res = processBarcodeScan(sample.code);
                    setScanResult(res);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-xs flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="font-mono font-bold text-orange-600 bg-orange-100/60 px-1.5 py-0.5 rounded mr-2">
                      {sample.code}
                    </span>
                    <span className="text-gray-700 font-medium">{sample.label}</span>
                    <div className="text-[11px] text-gray-400 mt-0.5">{sample.explanation}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Scan Result Feedback */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border text-xs animate-in fade-in ${
                scanResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {scanResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {scanResult.success ? '¡Coincidencia localizada!' : 'Sin coincidencia'}
                  </div>
                  <div className="mt-1">{scanResult.message}</div>
                  {scanResult.matchedLocation && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                      Ubicación seleccionada y resaltada en el mapa del almacén.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Listo / Volver al Mapa
          </button>
        </div>
      </div>
    </div>
  );
};
