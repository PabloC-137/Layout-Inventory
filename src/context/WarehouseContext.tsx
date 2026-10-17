import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Location,
  Store,
  Tenant,
  ProductVariant,
  ProductLocation,
  StockMovement,
  LayoutConfig,
  HierarchyTier,
} from '../types/warehouse';
import {
  SEED_LOCATIONS,
  SEED_STORES,
  SEED_TENANT,
  SEED_VARIANTS,
  SEED_PRODUCT_LOCATIONS,
} from '../data/seedData';
import {
  getLocationTier,
  canAddChildLocation,
  isLeafLocation,
  canDeleteLocation,
  isCodeUniqueInStore,
  validateInventoryAddition,
  getOverlappingLocationIds,
} from '../utils/hierarchy';
import { normalizeScannerCode, matchesLocationCode } from '../utils/scanner';

interface WarehouseContextType {
  // Master data
  tenant: Tenant;
  stores: Store[];
  currentStore: Store;
  setCurrentStoreId: (storeId: string) => void;

  // Warehouses and locations
  locations: Location[];
  bodegas: Location[];
  activeBodega: Location | null;
  setActiveBodegaId: (bodegaId: string) => void;
  selectedLocation: Location | null;
  setSelectedLocationId: (id: string | null) => void;
  highlightedLocationId: string | null;
  setHighlightedLocationId: (id: string | null) => void;

  // Products and inventory
  variants: ProductVariant[];
  productLocations: ProductLocation[];
  stockMovements: StockMovement[];

  // Editor states
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  hasUnsavedChanges: boolean;
  saveChanges: () => void;
  resetToInitialSeed: () => void;

  // Search & Scanner
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchLocations: (term: string) => { location: Location; tier: HierarchyTier }[];
  processBarcodeScan: (barcodeOrCode: string) => {
    success: boolean;
    message: string;
    normalizedCode: string;
    matchedLocation?: Location;
    matchedVariant?: ProductVariant;
  };

  // CRUD Actions
  createLocation: (params: {
    code: string;
    name: string;
    description?: string;
    usage: 'storage' | 'exhibition';
    parent_location_id: string | null;
    layout_config?: Partial<LayoutConfig>;
  }) => { success: boolean; error?: string; createdLocation?: Location };

  updateLocation: (
    id: string,
    updates: Partial<Omit<Location, 'id' | 'tenant_id'>>
  ) => { success: boolean; error?: string };

  updateLocationLayout: (id: string, layout: Partial<LayoutConfig>) => void;

  deleteLocation: (id: string) => { success: boolean; error?: string };

  // Stock operations
  addStock: (params: {
    variantId: string;
    locationId: string;
    quantity: number;
    serie?: string | null;
    note?: string;
  }) => { success: boolean; error?: string };

  transferStock: (params: {
    productLocationId: string;
    targetLocationId: string;
    quantity: number;
    note?: string;
  }) => { success: boolean; error?: string };

  adjustStock: (params: {
    productLocationId: string;
    newQuantity: number;
    reason: string;
  }) => { success: boolean; error?: string };

  // Helpers
  overlappingColumnIds: Set<string>;
  getLocationStockSummary: (locationId: string) => { totalItems: number; totalVariants: number };
}

const STORAGE_KEYS = {
  LOCATIONS: 'ais_warehouse_locations_v1',
  PRODUCT_LOCATIONS: 'ais_warehouse_pl_v1',
  MOVEMENTS: 'ais_warehouse_movements_v1',
  STORE_ID: 'ais_warehouse_store_id_v1',
  BODEGA_ID: 'ais_warehouse_bodega_id_v1',
};

const WarehouseContext = createContext<WarehouseContextType | null>(null);

export const WarehouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenant = SEED_TENANT;
  const stores = SEED_STORES;

  const [currentStoreId, setCurrentStoreIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.STORE_ID) || 'store-trujano';
  });

  const [locations, setLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return SEED_LOCATIONS;
  });

  const [productLocations, setProductLocations] = useState<ProductLocation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCT_LOCATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return SEED_PRODUCT_LOCATIONS;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [variants] = useState<ProductVariant[]>(SEED_VARIANTS);

  // Editor states
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(100);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentStore = useMemo(() => {
    return stores.find((s) => s.id === currentStoreId) || stores[0];
  }, [stores, currentStoreId]);

  const setCurrentStoreId = useCallback((id: string) => {
    setCurrentStoreIdState(id);
    localStorage.setItem(STORAGE_KEYS.STORE_ID, id);
  }, []);

  // Filter bodegas for current store
  const bodegas = useMemo(() => {
    return locations.filter((l) => l.store_id === currentStore.id && l.parent_location_id === null);
  }, [locations, currentStore.id]);

  const [activeBodegaId, setActiveBodegaIdState] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BODEGA_ID);
    if (saved) return saved;
    return 'loc-bodega-1';
  });

  const activeBodega = useMemo(() => {
    if (!activeBodegaId) return bodegas[0] || null;
    return bodegas.find((b) => b.id === activeBodegaId) || bodegas[0] || null;
  }, [bodegas, activeBodegaId]);

  const setActiveBodegaId = useCallback((id: string) => {
    setActiveBodegaIdState(id);
    localStorage.setItem(STORAGE_KEYS.BODEGA_ID, id);
    setSelectedLocationId(null);
  }, []);

  // Overlapping columns in the active bodega
  const overlappingColumnIds = useMemo(() => {
    if (!activeBodega) return new Set<string>();
    return getOverlappingLocationIds(activeBodega.id, locations);
  }, [activeBodega, locations]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [selectedLocationId, locations]);

  // Persist to storage
  const saveChanges = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    localStorage.setItem(STORAGE_KEYS.PRODUCT_LOCATIONS, JSON.stringify(productLocations));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(stockMovements));
    setHasUnsavedChanges(false);
  }, [locations, productLocations, stockMovements]);

  const resetToInitialSeed = useCallback(() => {
    setLocations(SEED_LOCATIONS);
    setProductLocations(SEED_PRODUCT_LOCATIONS);
    setStockMovements([]);
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(SEED_LOCATIONS));
    localStorage.setItem(STORAGE_KEYS.PRODUCT_LOCATIONS, JSON.stringify(SEED_PRODUCT_LOCATIONS));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify([]));
    setHasUnsavedChanges(false);
    setSelectedLocationId(null);
  }, []);

  // Create location with operational constraints
  const createLocation = useCallback(
    (params: {
      code: string;
      name: string;
      description?: string;
      usage: 'storage' | 'exhibition';
      parent_location_id: string | null;
      layout_config?: Partial<LayoutConfig>;
    }) => {
      const { code, name, description, usage, parent_location_id, layout_config } = params;

      // 1. Unique code per store constraint
      const isUnique = isCodeUniqueInStore(code, currentStore.id, locations);
      if (!isUnique) {
        return {
          success: false,
          error: `El código de ubicación '${code}' ya existe en la sucursal '${currentStore.name}'. Debe ser único por sucursal.`,
        };
      }

      // 2. Hierarchy rules: Bodega -> Columna -> Nivel (max 3 tiers)
      if (parent_location_id) {
        const parent = locations.find((l) => l.id === parent_location_id);
        if (!parent) {
          return { success: false, error: 'La ubicación padre especificada no existe.' };
        }
        // Store & Tenant consistency
        if (parent.store_id !== currentStore.id || parent.tenant_id !== tenant.id) {
          return {
            success: false,
            error: 'Padre e hijo deben pertenecer a la misma empresa y sucursal.',
          };
        }

        const childCheck = canAddChildLocation(parent, locations);
        if (!childCheck.allowed) {
          return {
            success: false,
            error: childCheck.reason || 'No se pueden crear más niveles en esta jerarquía.',
          };
        }
      }

      // Generate default layout config
      const defaultLayout: LayoutConfig = {
        x: layout_config?.x ?? 50,
        y: layout_config?.y ?? 50,
        w: layout_config?.w ?? (parent_location_id ? 130 : 1200),
        h: layout_config?.h ?? (parent_location_id ? 320 : 800),
        color: layout_config?.color ?? (parent_location_id ? '#f97316' : '#3b82f6'),
        order: layout_config?.order ?? 0,
      };

      const newLocation: Location = {
        id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description?.trim() || '',
        usage,
        store_id: currentStore.id,
        tenant_id: tenant.id,
        parent_location_id,
        layout_config: { ...defaultLayout, ...layout_config },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setLocations((prev) => [...prev, newLocation]);
      setHasUnsavedChanges(true);
      return { success: true, createdLocation: newLocation };
    },
    [currentStore, tenant, locations]
  );

  // Update location with constraints
  const updateLocation = useCallback(
    (id: string, updates: Partial<Omit<Location, 'id' | 'tenant_id'>>) => {
      const existing = locations.find((l) => l.id === id);
      if (!existing) {
        return { success: false, error: 'Ubicación no encontrada.' };
      }

      // Constraint: Changing store of a bodega with sublocations must be blocked!
      if (updates.store_id && updates.store_id !== existing.store_id) {
        const sublocations = locations.filter((l) => l.parent_location_id === id);
        if (sublocations.length > 0) {
          return {
            success: false,
            error: 'Operación bloqueada: Cambiar la sucursal de una bodega con sububicaciones no está permitido para evitar romper la integridad de la estructura.',
          };
        }
      }

      // Unique code per store constraint if code changed
      if (updates.code && updates.code.trim().toUpperCase() !== existing.code.trim().toUpperCase()) {
        const targetStore = updates.store_id || existing.store_id;
        const isUnique = isCodeUniqueInStore(updates.code, targetStore, locations, id);
        if (!isUnique) {
          return {
            success: false,
            error: `El código '${updates.code}' ya está asignado a otra ubicación en esta sucursal.`,
          };
        }
      }

      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id === id) {
            return {
              ...loc,
              ...updates,
              code: updates.code ? updates.code.trim().toUpperCase() : loc.code,
              updated_at: new Date().toISOString(),
            };
          }
          return loc;
        })
      );

      setHasUnsavedChanges(true);
      return { success: true };
    },
    [locations]
  );

  // Update layout config directly (coordinates, dimensions, color)
  const updateLocationLayout = useCallback((id: string, layout: Partial<LayoutConfig>) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id === id) {
          return {
            ...loc,
            layout_config: {
              ...loc.layout_config,
              ...layout,
            },
            updated_at: new Date().toISOString(),
          };
        }
        return loc;
      })
    );
    setHasUnsavedChanges(true);
  }, []);

  // Delete location with strict operational constraints
  const deleteLocation = useCallback(
    (id: string) => {
      const check = canDeleteLocation(id, locations, productLocations);
      if (!check.canDelete) {
        return { success: false, error: check.reason };
      }

      setLocations((prev) => prev.filter((l) => l.id !== id));
      if (selectedLocationId === id) {
        setSelectedLocationId(null);
      }
      setHasUnsavedChanges(true);
      return { success: true };
    },
    [locations, productLocations, selectedLocationId]
  );

  // Add stock to a leaf location
  const addStock = useCallback(
    (params: {
      variantId: string;
      locationId: string;
      quantity: number;
      serie?: string | null;
      note?: string;
    }) => {
      const { variantId, locationId, quantity, serie, note } = params;

      // 1. Verify location exists and is a LEAF location
      const targetLoc = locations.find((l) => l.id === locationId);
      if (!targetLoc) {
        return { success: false, error: 'La ubicación no existe.' };
      }

      if (!isLeafLocation(locationId, locations)) {
        return {
          success: false,
          error: 'Restricción de inventario: El stock sólo se puede almacenar en ubicaciones hoja (Niveles sin sububicaciones). Bodegas y columnas intermedias no pueden almacenar existencias directas.',
        };
      }

      const variant = variants.find((v) => v.id === variantId);
      if (!variant) {
        return { success: false, error: 'Variante de producto no encontrada.' };
      }

      if (quantity <= 0) {
        return { success: false, error: 'La cantidad debe ser mayor a 0.' };
      }

      // 2. Validate serialization rules
      const val = validateInventoryAddition(
        variantId,
        locationId,
        variant.is_serialized,
        serie,
        productLocations
      );

      if (!val.valid) {
        return { success: false, error: val.reason };
      }

      const now = new Date().toISOString();

      if (variant.is_serialized) {
        // Serialized product: each piece has 1 quantity and unique serie
        const newRecord: ProductLocation = {
          id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          product_variant_id: variantId,
          location_id: locationId,
          quantity: 1,
          serie: serie ? serie.trim().toUpperCase() : null,
          tenant_id: tenant.id,
          created_at: now,
          updated_at: now,
        };
        setProductLocations((prev) => [...prev, newRecord]);
      } else {
        // Non-serialized bulk: accumulate quantity in existing record (serie = null)
        const existingRecord = productLocations.find(
          (pl) =>
            pl.product_variant_id === variantId &&
            pl.location_id === locationId &&
            (pl.serie === null || pl.serie === '')
        );

        if (existingRecord) {
          setProductLocations((prev) =>
            prev.map((pl) =>
              pl.id === existingRecord.id
                ? { ...pl, quantity: pl.quantity + quantity, updated_at: now }
                : pl
            )
          );
        } else {
          const newRecord: ProductLocation = {
            id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            product_variant_id: variantId,
            location_id: locationId,
            quantity: quantity,
            serie: null,
            tenant_id: tenant.id,
            created_at: now,
            updated_at: now,
          };
          setProductLocations((prev) => [...prev, newRecord]);
        }
      }

      // Record movement
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        type: 'IN',
        product_variant_id: variantId,
        to_location_id: locationId,
        quantity: variant.is_serialized ? 1 : quantity,
        serie: serie || null,
        note: note || 'Ingreso manual al almacén',
        timestamp: now,
      };
      setStockMovements((prev) => [movement, ...prev]);

      setHasUnsavedChanges(true);
      return { success: true };
    },
    [locations, variants, productLocations, tenant.id]
  );

  // Transfer stock between leaf locations
  const transferStock = useCallback(
    (params: {
      productLocationId: string;
      targetLocationId: string;
      quantity: number;
      note?: string;
    }) => {
      const { productLocationId, targetLocationId, quantity, note } = params;

      const sourcePl = productLocations.find((pl) => pl.id === productLocationId);
      if (!sourcePl) {
        return { success: false, error: 'Registro de stock origen no encontrado.' };
      }

      if (!isLeafLocation(targetLocationId, locations)) {
        return {
          success: false,
          error: 'Restricción: El destino debe ser una ubicación hoja (Nivel operativo sin subniveles).',
        };
      }

      if (sourcePl.location_id === targetLocationId) {
        return { success: false, error: 'La ubicación destino no puede ser la misma que la de origen.' };
      }

      if (quantity <= 0 || quantity > sourcePl.quantity) {
        return {
          success: false,
          error: `Cantidad inválida. Disponible en origen: ${sourcePl.quantity}.`,
        };
      }

      const variant = variants.find((v) => v.id === sourcePl.product_variant_id);
      if (!variant) return { success: false, error: 'Variante no encontrada.' };

      // Validate destination serialization compatibility
      const val = validateInventoryAddition(
        variant.id,
        targetLocationId,
        variant.is_serialized,
        sourcePl.serie,
        productLocations
      );

      if (!val.valid) {
        return { success: false, error: val.reason };
      }

      const now = new Date().toISOString();

      // Deduct from source
      if (sourcePl.quantity === quantity) {
        // Full transfer: remove source or update location if serialized
        if (sourcePl.serie) {
          setProductLocations((prev) =>
            prev.map((pl) =>
              pl.id === sourcePl.id
                ? { ...pl, location_id: targetLocationId, updated_at: now }
                : pl
            )
          );
        } else {
          setProductLocations((prev) => prev.filter((pl) => pl.id !== sourcePl.id));
        }
      } else {
        // Partial transfer for bulk items
        setProductLocations((prev) =>
          prev.map((pl) =>
            pl.id === sourcePl.id
              ? { ...pl, quantity: pl.quantity - quantity, updated_at: now }
              : pl
          )
        );
      }

      // Add to destination if not already transferred in full for serialized
      if (!sourcePl.serie) {
        const destExisting = productLocations.find(
          (pl) =>
            pl.product_variant_id === variant.id &&
            pl.location_id === targetLocationId &&
            !pl.serie
        );

        if (destExisting) {
          setProductLocations((prev) =>
            prev.map((pl) =>
              pl.id === destExisting.id
                ? { ...pl, quantity: pl.quantity + quantity, updated_at: now }
                : pl
            )
          );
        } else {
          setProductLocations((prev) => [
            ...prev,
            {
              id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              product_variant_id: variant.id,
              location_id: targetLocationId,
              quantity: quantity,
              serie: null,
              tenant_id: tenant.id,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }

      // Record movement
      setStockMovements((prev) => [
        {
          id: `mov-${Date.now()}`,
          type: 'TRANSFER',
          product_variant_id: variant.id,
          from_location_id: sourcePl.location_id,
          to_location_id: targetLocationId,
          quantity,
          serie: sourcePl.serie,
          note: note || 'Transferencia entre ubicaciones',
          timestamp: now,
        },
        ...prev,
      ]);

      setHasUnsavedChanges(true);
      return { success: true };
    },
    [productLocations, locations, variants, tenant.id]
  );

  // Adjust stock
  const adjustStock = useCallback(
    (params: { productLocationId: string; newQuantity: number; reason: string }) => {
      const { productLocationId, newQuantity, reason } = params;
      const pl = productLocations.find((p) => p.id === productLocationId);
      if (!pl) return { success: false, error: 'Registro no encontrado.' };

      if (newQuantity < 0) return { success: false, error: 'La cantidad no puede ser negativa.' };

      const diff = newQuantity - pl.quantity;
      const now = new Date().toISOString();

      if (newQuantity === 0) {
        setProductLocations((prev) => prev.filter((p) => p.id !== productLocationId));
      } else {
        setProductLocations((prev) =>
          prev.map((p) => (p.id === productLocationId ? { ...p, quantity: newQuantity, updated_at: now } : p))
        );
      }

      setStockMovements((prev) => [
        {
          id: `mov-${Date.now()}`,
          type: diff >= 0 ? 'IN' : 'OUT',
          product_variant_id: pl.product_variant_id,
          from_location_id: diff < 0 ? pl.location_id : null,
          to_location_id: diff > 0 ? pl.location_id : null,
          quantity: Math.abs(diff),
          serie: pl.serie,
          note: `Ajuste manual: ${reason}`,
          timestamp: now,
        },
        ...prev,
      ]);

      setHasUnsavedChanges(true);
      return { success: true };
    },
    [productLocations]
  );

  // Search locations by code or name
  const searchLocations = useCallback(
    (term: string) => {
      if (!term.trim()) return [];

      return locations
        .filter((loc) => loc.store_id === currentStore.id)
        .filter((loc) => {
          const matchCode = matchesLocationCode(loc.code, term);
          const matchName = loc.name.toLowerCase().includes(term.toLowerCase());
          return matchCode || matchName;
        })
        .map((loc) => ({
          location: loc,
          tier: getLocationTier(loc, locations),
        }));
    },
    [locations, currentStore.id]
  );

  // Scanner processor with $ -> Ñ and ' -> -
  const processBarcodeScan = useCallback(
    (barcodeOrCode: string) => {
      const { normalized, hasDollarToEnye, hasQuoteToDash } = normalizeScannerCode(barcodeOrCode);

      // Check if matches location code
      const matchedLoc = locations
        .filter((l) => l.store_id === currentStore.id)
        .find((l) => l.code.toUpperCase() === normalized);

      // Check if matches product barcode or SKU
      const matchedVariant = variants.find(
        (v) => v.barcode.toUpperCase() === normalized || v.sku.toUpperCase() === normalized
      );

      if (matchedLoc) {
        setSelectedLocationId(matchedLoc.id);
        setHighlightedLocationId(matchedLoc.id);
        // If it's in another bodega, switch to it
        if (matchedLoc.parent_location_id) {
          const parent = locations.find((l) => l.id === matchedLoc.parent_location_id);
          const rootBodega = parent?.parent_location_id
            ? locations.find((l) => l.id === parent.parent_location_id)
            : parent;
          if (rootBodega && rootBodega.id !== activeBodega?.id) {
            setActiveBodegaId(rootBodega.id);
          }
        } else if (matchedLoc.id !== activeBodega?.id) {
          setActiveBodegaId(matchedLoc.id);
        }

        let note = `Ubicación localizada: [${matchedLoc.code}] ${matchedLoc.name}.`;
        if (hasDollarToEnye || hasQuoteToDash) {
          note += ' (Se corrigieron caracteres de teclado de escáner: $ → Ñ, \' → -)';
        }

        return {
          success: true,
          message: note,
          normalizedCode: normalized,
          matchedLocation: matchedLoc,
        };
      }

      if (matchedVariant) {
        // Find locations containing this variant
        const occupied = productLocations.filter((pl) => pl.product_variant_id === matchedVariant.id);
        const locCodes = occupied
          .map((pl) => locations.find((l) => l.id === pl.location_id)?.code)
          .filter(Boolean)
          .join(', ');

        return {
          success: true,
          message: `Producto escaneado: ${matchedVariant.name}. Ubicado en: ${locCodes || 'Sin stock actual en almacén.'}`,
          normalizedCode: normalized,
          matchedVariant,
        };
      }

      return {
        success: false,
        message: `No se encontró ubicación ni producto con el código normalizado '${normalized}'.`,
        normalizedCode: normalized,
      };
    },
    [locations, currentStore.id, variants, productLocations, activeBodega, setActiveBodegaId]
  );

  const getLocationStockSummary = useCallback(
    (locationId: string) => {
      // Find all leaf locations under this location (or self if leaf)
      const isLeaf = isLeafLocation(locationId, locations);
      let targetLeafIds = [locationId];

      if (!isLeaf) {
        // If it's a bodega or column, sum recursively
        const findLeaves = (pId: string): string[] => {
          const children = locations.filter((l) => l.parent_location_id === pId);
          if (children.length === 0) return [pId];
          return children.flatMap((c) => findLeaves(c.id));
        };
        targetLeafIds = findLeaves(locationId);
      }

      const relevantStock = productLocations.filter((pl) => targetLeafIds.includes(pl.location_id));
      const totalItems = relevantStock.reduce((sum, pl) => sum + pl.quantity, 0);
      const uniqueVariants = new Set(relevantStock.map((pl) => pl.product_variant_id)).size;

      return { totalItems, totalVariants: uniqueVariants };
    },
    [locations, productLocations]
  );

  // Auto-clear highlight after 4 seconds
  useEffect(() => {
    if (highlightedLocationId) {
      const timer = setTimeout(() => {
        setHighlightedLocationId(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLocationId]);

  return (
    <WarehouseContext.Provider
      value={{
        tenant,
        stores,
        currentStore,
        setCurrentStoreId,
        locations,
        bodegas,
        activeBodega,
        setActiveBodegaId,
        selectedLocation,
        setSelectedLocationId,
        highlightedLocationId,
        setHighlightedLocationId,
        variants,
        productLocations,
        stockMovements,
        isEditing,
        setIsEditing,
        zoom,
        setZoom,
        hasUnsavedChanges,
        saveChanges,
        resetToInitialSeed,
        searchQuery,
        setSearchQuery,
        searchLocations,
        processBarcodeScan,
        createLocation,
        updateLocation,
        updateLocationLayout,
        deleteLocation,
        addStock,
        transferStock,
        adjustStock,
        overlappingColumnIds,
        getLocationStockSummary,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};
