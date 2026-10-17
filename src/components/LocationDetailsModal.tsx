import React, { useState } from 'react';
import {
  X,
  Package,
  ArrowRightLeft,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Info,
  Layers,
  MapPin,
  Tag,
  Building,
  Edit3,
} from 'lucide-react';
import { useWarehouse } from '../context/WarehouseContext';
import { Location, ProductVariant, HierarchyTier } from '../types/warehouse';
import { getLocationTier, isLeafLocation, canDeleteLocation } from '../utils/hierarchy';

interface LocationDetailsModalProps {
  location: Location | null;
  onClose: () => void;
  onOpenAddChild?: (parentLocation: Location) => void;
}

export const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  location,
  onClose,
  onOpenAddChild,
}) => {
  const {
    locations,
    productLocations,
    variants,
    addStock,
    transferStock,
    adjustStock,
    deleteLocation,
    updateLocation,
    updateLocationLayout,
    getLocationStockSummary,
    currentStore,
  } = useWarehouse();

  const [activeTab, setActiveTab] = useState<'inventory' | 'add_stock' | 'transfer' | 'edit'>('inventory');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Add Stock
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);
  const [addSerie, setAddSerie] = useState<string>('');
  const [addNote, setAddNote] = useState<string>('');

  // Form states for Transfer Stock
  const [selectedPlId, setSelectedPlId] = useState<string>('');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNote, setTransferNote] = useState<string>('');

  // Form states for Edit Location
  const [editName, setEditName] = useState(location?.name || '');
  const [editCode, setEditCode] = useState(location?.code || '');
  const [editDescription, setEditDescription] = useState(location?.description || '');
  const [editUsage, setEditUsage] = useState<'storage' | 'exhibition'>(location?.usage || 'storage');
  const [editColor, setEditColor] = useState(location?.layout_config?.color || '#f97316');

  if (!location) return null;

  const tier = getLocationTier(location, locations);
  const isLeaf = isLeafLocation(location.id, locations);
  const deleteCheck = canDeleteLocation(location.id, locations, productLocations);

  // Stored inventory directly in this location (if leaf)
  const itemsInLocation = productLocations.filter((pl) => pl.location_id === location.id && pl.quantity > 0);
  const stockSummary = getLocationStockSummary(location.id);

  // Sublocations
  const sublocations = locations.filter((l) => l.parent_location_id === location.id);

  // Available leaf locations for transfer
  const availableLeafLocations = locations.filter(
    (l) => l.store_id === currentStore.id && l.id !== location.id && isLeafLocation(l.id, locations)
  );

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Parent chain
  const parentLocation = location.parent_location_id
    ? locations.find((l) => l.id === location.parent_location_id)
    : null;
  const grandParentLocation = parentLocation?.parent_location_id
    ? locations.find((l) => l.id === parentLocation.parent_location_id)
    : null;

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) {
      setStatusMessage({ type: 'error', text: 'Por favor selecciona un producto.' });
      return;
    }

    const res = addStock({
      variantId: selectedVariantId,
      locationId: location.id,
      quantity: addQty,
      serie: addSerie.trim() || null,
      note: addNote.trim(),
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Existencias ingresadas correctamente.' });
      setSelectedVariantId('');
      setAddQty(1);
      setAddSerie('');
      setAddNote('');
      setActiveTab('inventory');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al ingresar existencias.' });
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlId || !transferTargetId) {
      setStatusMessage({ type: 'error', text: 'Selecciona el producto a mover y la ubicación destino.' });
      return;
    }

    const res = transferStock({
      productLocationId: selectedPlId,
      targetLocationId: transferTargetId,
      quantity: transferQty,
      note: transferNote.trim(),
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Stock transferido con éxito a la nueva ubicación.' });
      setSelectedPlId('');
      setTransferTargetId('');
      setTransferQty(1);
      setTransferNote('');
      setActiveTab('inventory');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error en la transferencia.' });
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateLocation(location.id, {
      name: editName,
      code: editCode,
      description: editDescription,
      usage: editUsage,
    });

    if (res.success) {
      updateLocationLayout(location.id, { color: editColor });
      setStatusMessage({ type: 'success', text: 'Ubicación actualizada correctamente.' });
      setActiveTab('inventory');
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al actualizar.' });
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`¿Estás seguro de eliminar '${location.name}' (${location.code})?`)) return;
    const res = deleteLocation(location.id);
    if (res.success) {
      onClose();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'No se pudo eliminar la ubicación.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl text-white font-bold text-xs uppercase"
              style={{ backgroundColor: location.layout_config?.color || '#f97316' }}
            >
              {tier === 'bodega' ? 'Bodega' : tier === 'columna' ? 'Columna' : 'Nivel'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{location.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-bold">
                  {location.code}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    location.usage === 'storage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {location.usage === 'storage' ? 'Almacén / Bodega' : 'Exhibición / Piso'}
                </span>
              </div>
              {/* Hierarchy breadcrumb */}
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {grandParentLocation && `${grandParentLocation.name} > `}
                {parentLocation && `${parentLocation.name} > `}
                <span className="font-semibold text-gray-700">{location.name}</span>
                {location.description && ` — ${location.description}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-100/60 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => {
              setActiveTab('inventory');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventario & Estructura ({isLeaf ? itemsInLocation.length : stockSummary.totalItems})
          </button>

          {isLeaf && (
            <>
              <button
                onClick={() => {
                  setActiveTab('add_stock');
                  setStatusMessage(null);
                }}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'add_stock'
                    ? 'border-orange-600 text-orange-600 font-bold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Ingresar Stock
              </button>

              <button
                onClick={() => {
                  setActiveTab('transfer');
                  setStatusMessage(null);
                }}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'transfer'
                    ? 'border-orange-600 text-orange-600 font-bold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Transferir Stock
              </button>
            </>
          )}

          <button
            onClick={() => {
              setActiveTab('edit');
              setStatusMessage(null);
            }}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'edit'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Propiedades
          </button>
        </div>

        {/* Feedback message banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: INVENTORY & STRUCTURE */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {!isLeaf ? (
                // Non-leaf location (Bodega or Column)
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Nodo contenedor intermedio ({tier === 'bodega' ? 'Bodega' : 'Columna'}):</strong>{' '}
                      Según las reglas operativas del almacén, el stock físico se asigna a los <strong>Niveles</strong>{' '}
                      (posiciones hoja finales). Esta ubicación agrupa un total de{' '}
                      <span className="font-bold">{sublocations.length} sububicaciones</span> y{' '}
                      <span className="font-bold">{stockSummary.totalItems} unidades</span> en sus niveles.
                    </div>
                  </div>

                  {/* Sublocations list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase">
                        Sububicaciones directas ({sublocations.length})
                      </h4>
                      {tier !== 'nivel' && onOpenAddChild && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenAddChild(location);
                          }}
                          className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Agregar {tier === 'bodega' ? 'Columna' : 'Nivel'}
                        </button>
                      )}
                    </div>

                    {sublocations.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-gray-300 rounded-xl text-gray-400 text-xs">
                        No hay sububicaciones creadas todavía.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sublocations.map((sub) => {
                          const subStock = getLocationStockSummary(sub.id);
                          return (
                            <div
                              key={sub.id}
                              className="p-3 border border-gray-200 rounded-xl bg-gray-50/70 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-mono font-bold text-gray-800">{sub.code}</span>
                                <div className="text-gray-500 font-medium">{sub.name}</div>
                              </div>
                              <span className="px-2 py-0.5 bg-gray-200 rounded-full text-[11px] font-semibold text-gray-700">
                                {subStock.totalItems} uds
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Leaf location (Nivel): show exact product inventory
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">
                      Productos y Series en esta Ubicación ({itemsInLocation.length})
                    </h4>
                    <button
                      onClick={() => setActiveTab('add_stock')}
                      className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Ingresar Producto
                    </button>
                  </div>

                  {itemsInLocation.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs space-y-2">
                      <Package className="w-8 h-8 mx-auto text-gray-300" />
                      <div>Esta posición física está vacía. Lista para recibir inventario.</div>
                      <button
                        onClick={() => setActiveTab('add_stock')}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Ingresar existencias ahora
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemsInLocation.map((item) => {
                        const variant = variants.find((v) => v.id === item.product_variant_id);
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded">
                                  {variant?.sku || 'SKU'}
                                </span>
                                <h5 className="font-bold text-gray-800">{variant?.name || 'Producto'}</h5>
                                {variant?.is_serialized ? (
                                  <span className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    Serializado
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    A granel / Sin serie
                                  </span>
                                )}
                              </div>

                              <div className="text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                {item.serie ? (
                                  <span className="font-mono text-purple-900 font-bold">
                                    No. Serie: {item.serie}
                                  </span>
                                ) : (
                                  <span>Tipo: Registro acumulativo</span>
                                )}
                                <span>Categoría: {variant?.category}</span>
                                <span>Código de barras: {variant?.barcode}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-base font-extrabold text-gray-900">
                                {item.quantity}{' '}
                                <span className="text-xs font-normal text-gray-500">{variant?.unit}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => {
                                    setSelectedPlId(item.id);
                                    setActiveTab('transfer');
                                  }}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                                >
                                  Mover
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Motivo del ajuste de inventario:');
                                    if (reason) {
                                      adjustStock({
                                        productLocationId: item.id,
                                        newQuantity: 0,
                                        reason,
                                      });
                                    }
                                  }}
                                  className="text-[11px] text-red-600 hover:text-red-800 font-medium cursor-pointer"
                                >
                                  Retirar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD STOCK (Leaf locations only) */}
          {activeTab === 'add_stock' && isLeaf && (
            <form onSubmit={handleAddStockSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <strong>Regla de exclusividad de serialización:</strong>
                <div>
                  • Si un producto es serializado, cada unidad debe ingresar con su serie única.
                  <br />• Si una ubicación ya tiene unidades serializadas de una variante, no se pueden mezclar con
                  unidades a granel (sin serie), y viceversa.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Selecciona el Producto:
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar variante de producto --</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.sku}] {v.name} ({v.is_serialized ? 'Serializado' : 'A granel'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedVariant && (
                <>
                  {selectedVariant.is_serialized ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Número de Serie Único (Obligatorio para serializados):
                      </label>
                      <input
                        type="text"
                        value={addSerie}
                        onChange={(e) => setAddSerie(e.target.value)}
                        placeholder="Ej: YAM-C40-99283 o MX24018241"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Para productos serializados, se registra 1 unidad por número de serie único.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Cantidad a ingresar ({selectedVariant.unit}):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Producto a granel: La cantidad se acumulará automáticamente en el registro existente.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nota u orden de compra (Opcional):
                </label>
                <input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Ej: Entrada por factura F-2024 / Reabastecimiento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm cursor-pointer"
                >
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: TRANSFER STOCK */}
          {activeTab === 'transfer' && isLeaf && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                Mueve inventario desde <strong>{location.name} ({location.code})</strong> hacia otra posición
                física de la sucursal <strong>{currentStore.name}</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Selecciona la existencia a transferir:
                </label>
                <select
                  value={selectedPlId}
                  onChange={(e) => {
                    setSelectedPlId(e.target.value);
                    const item = itemsInLocation.find((i) => i.id === e.target.value);
                    if (item) setTransferQty(item.quantity);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar existencia --</option>
                  {itemsInLocation.map((item) => {
                    const variant = variants.find((v) => v.id === item.product_variant_id);
                    return (
                      <option key={item.id} value={item.id}>
                        {variant?.name} | {item.serie ? `Serie: ${item.serie}` : `Cantidad: ${item.quantity}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ubicación Hoja Destino (Solo niveles operativos):
                </label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                >
                  <option value="">-- Seleccionar ubicación destino --</option>
                  {availableLeafLocations.map((leaf) => (
                    <option key={leaf.id} value={leaf.id}>
                      [{leaf.code}] {leaf.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlId && !itemsInLocation.find((i) => i.id === selectedPlId)?.serie && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad a mover:</label>
                  <input
                    type="number"
                    min="1"
                    max={itemsInLocation.find((i) => i.id === selectedPlId)?.quantity || 1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de movimiento:</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Ej: Reacomodo operativo / Solicitud de mostrador"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm cursor-pointer"
                >
                  Ejecutar Transferencia
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: PROPERTIES & EDIT */}
          {activeTab === 'edit' && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Código Único por Sucursal:
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Índice único: (code, store_id)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre legible:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uso operativo (usage):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs transition-all ${
                      editUsage === 'storage'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-900 font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="usage"
                      value="storage"
                      checked={editUsage === 'storage'}
                      onChange={() => setEditUsage('storage')}
                      className="accent-orange-600"
                    />
                    <div>
                      <div>Almacén (storage)</div>
                      <div className="text-[10px] text-gray-500 font-normal">Bodega física estándar</div>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs transition-all ${
                      editUsage === 'exhibition'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-900 font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="usage"
                      value="exhibition"
                      checked={editUsage === 'exhibition'}
                      onChange={() => setEditUsage('exhibition')}
                      className="accent-orange-600"
                    />
                    <div>
                      <div>Exhibición (exhibition)</div>
                      <div className="text-[10px] text-gray-500 font-normal">Piso de venta o vitrina</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción:</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Color distintivo en layout:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-gray-600">{editColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!deleteCheck.canDelete}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    deleteCheck.canDelete
                      ? 'text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-70'
                  }`}
                  title={deleteCheck.canDelete ? 'Eliminar ubicación' : deleteCheck.reason}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Ubicación
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>

              {!deleteCheck.canDelete && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deleteCheck.reason}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
