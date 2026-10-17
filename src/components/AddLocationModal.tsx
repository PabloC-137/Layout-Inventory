import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Building2, Columns, Layers } from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { Location, HierarchyTier } from '../types/warehouse';
import { getLocationTier, isCodeUniqueInStore } from '../utils/hierarchy';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetParent?: Location | null;
}

export const AddLocationModal: React.FC<AddLocationModalProps> = ({
  isOpen,
  onClose,
  presetParent,
}) => {
  const { locations, currentStore, activeBodega, createLocation } = useWarehouse();

  const [targetType, setTargetType] = useState<HierarchyTier>('columna');
  const [parentId, setParentId] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [usage, setUsage] = useState<'storage' | 'exhibition'>('storage');
  const [color, setColor] = useState<string>('#f97316');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available parent options
  const bodegaOptions = locations.filter(
    (l) => l.store_id === currentStore.id && l.parent_location_id === null
  );

  const columnOptions = locations.filter((l) => {
    if (l.store_id !== currentStore.id) return false;
    return getLocationTier(l, locations) === 'columna';
  });

  // Sync state when opened or presetParent changes
  useEffect(() => {
    if (presetParent) {
      const parentTier = getLocationTier(presetParent, locations);
      if (parentTier === 'bodega') {
        setTargetType('columna');
        setParentId(presetParent.id);
        setColor('#f97316');
      } else if (parentTier === 'columna') {
        setTargetType('nivel');
        setParentId(presetParent.id);
        setColor('#e5e7eb');
      }
    } else {
      // Default to adding a column in active bodega
      if (activeBodega) {
        setTargetType('columna');
        setParentId(activeBodega.id);
        setColor('#f97316');
      } else {
        setTargetType('bodega');
        setParentId('');
        setColor('#3b82f6');
      }
    }
    setCode('');
    setName('');
    setDescription('');
    setErrorMsg(null);
  }, [presetParent, activeBodega, isOpen, locations]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!code.trim()) {
      setErrorMsg('El código de ubicación es obligatorio.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('El nombre de la ubicación es obligatorio.');
      return;
    }

    // Check unique code in store
    const isUnique = isCodeUniqueInStore(code, currentStore.id, locations);
    if (!isUnique) {
      setErrorMsg(`El código '${code}' ya existe en esta sucursal. Los códigos deben ser únicos.`);
      return;
    }

    let finalParentId: string | null = null;
    if (targetType === 'columna') {
      if (!parentId) {
        setErrorMsg('Debes seleccionar una Bodega padre para la columna.');
        return;
      }
      finalParentId = parentId;
    } else if (targetType === 'nivel') {
      if (!parentId) {
        setErrorMsg('Debes seleccionar una Columna padre para el nivel.');
        return;
      }
      finalParentId = parentId;
    }

    // Determine layout geometry
    let w = 1200;
    let h = 800;
    let x = 50;
    let y = 50;

    if (targetType === 'columna') {
      w = 130;
      h = 320;
      const existingCols = locations.filter((l) => l.parent_location_id === finalParentId);
      x = 50 + existingCols.length * 160;
      y = 60;
    } else if (targetType === 'nivel') {
      w = 110;
      h = 50;
      x = 0;
      const existingLevels = locations.filter((l) => l.parent_location_id === finalParentId);
      y = existingLevels.length * 56;
    }

    const res = createLocation({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      usage,
      parent_location_id: finalParentId,
      layout_config: {
        x,
        y,
        w,
        h,
        color,
        order: (locations.filter((l) => l.parent_location_id === finalParentId).length || 0) + 1,
      },
    });

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Error al crear la ubicación.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-700 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Nueva Ubicación Física</h2>
              <p className="text-xs text-gray-500">
                Sucursal: <span className="font-semibold text-gray-700">{currentStore.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Nivel de la Jerarquía Operativa:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType('bodega');
                  setParentId('');
                  setColor('#3b82f6');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetType === 'bodega'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Building2
                  className={`w-4 h-4 mb-1 ${
                    targetType === 'bodega' ? 'text-orange-600' : 'text-gray-400'
                  }`}
                />
                <div className="text-xs font-bold text-gray-800">1. Bodega</div>
                <div className="text-[10px] text-gray-500">Nodo raíz</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType('columna');
                  if (!parentId || targetType === 'nivel') {
                    setParentId(bodegaOptions[0]?.id || '');
                  }
                  setColor('#f97316');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetType === 'columna'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Columns
                  className={`w-4 h-4 mb-1 ${
                    targetType === 'columna' ? 'text-orange-600' : 'text-gray-400'
                  }`}
                />
                <div className="text-xs font-bold text-gray-800">2. Columna</div>
                <div className="text-[10px] text-gray-500">Rack / Pasillo</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetType('nivel');
                  if (!parentId || targetType === 'bodega') {
                    setParentId(columnOptions[0]?.id || '');
                  }
                  setColor('#e5e7eb');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  targetType === 'nivel'
                    ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Layers
                  className={`w-4 h-4 mb-1 ${
                    targetType === 'nivel' ? 'text-orange-600' : 'text-gray-400'
                  }`}
                />
                <div className="text-xs font-bold text-gray-800">3. Nivel</div>
                <div className="text-[10px] text-gray-500">Estante hoja</div>
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Jerarquía estricta soportada: <strong>Bodega → Columna → Nivel</strong>. No se permiten niveles
              adicionales.
            </p>
          </div>

          {/* Parent selector */}
          {targetType === 'columna' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Bodega contenedora (Padre):
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              >
                <option value="">-- Seleccionar Bodega --</option>
                {bodegaOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'nivel' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Columna contenedora (Padre):
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              >
                <option value="">-- Seleccionar Columna --</option>
                {columnOptions.map((c) => {
                  const parentB = locations.find((l) => l.id === c.parent_location_id);
                  return (
                    <option key={c.id} value={c.id}>
                      {parentB?.name} → [{c.code}] {c.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Code and Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Código Único (code):
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={
                  targetType === 'bodega'
                    ? 'Ej: 2 o BM'
                    : targetType === 'columna'
                    ? 'Ej: 1-55'
                    : 'Ej: 1-55-A'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Único dentro de {currentStore.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre legible (name):
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  targetType === 'bodega'
                    ? 'Bodega Accesorios'
                    : targetType === 'columna'
                    ? 'Columna 55'
                    : 'Fila A'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Usage */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Uso operativo:</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-2.5 border rounded-lg cursor-pointer text-xs flex items-center gap-2 ${
                  usage === 'storage'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="modalUsage"
                  value="storage"
                  checked={usage === 'storage'}
                  onChange={() => setUsage('storage')}
                  className="accent-orange-600"
                />
                <span>Almacén (storage)</span>
              </label>
              <label
                className={`p-2.5 border rounded-lg cursor-pointer text-xs flex items-center gap-2 ${
                  usage === 'exhibition'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold'
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="modalUsage"
                  value="exhibition"
                  checked={usage === 'exhibition'}
                  onChange={() => setUsage('exhibition')}
                  className="accent-orange-600"
                />
                <span>Exhibición (exhibition)</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Descripción opcional:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles sobre posición o tipo de mercancía..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm cursor-pointer"
            >
              Crear Ubicación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
