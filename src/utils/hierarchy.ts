import { Location, HierarchyTier, ProductLocation, LayoutConfig } from '../types/warehouse';

/**
 * Determine the tier of a location in the hierarchy:
 * Bodega (root) -> Columna (child of bodega) -> Nivel (child of columna)
 */
export function getLocationTier(location: Location, allLocations: Location[]): HierarchyTier {
  if (!location.parent_location_id) {
    return 'bodega';
  }

  const parent = allLocations.find((l) => l.id === location.parent_location_id);
  if (!parent) {
    return 'bodega'; // Fallback
  }

  if (!parent.parent_location_id) {
    return 'columna';
  }

  return 'nivel';
}

/**
 * Check if a location can accept child locations.
 * Bodega can accept Columna.
 * Columna can accept Nivel.
 * Nivel cannot have children.
 */
export function canAddChildLocation(location: Location, allLocations: Location[]): {
  allowed: boolean;
  nextTier?: HierarchyTier;
  reason?: string;
} {
  const tier = getLocationTier(location, allLocations);
  if (tier === 'bodega') {
    return { allowed: true, nextTier: 'columna' };
  }
  if (tier === 'columna') {
    return { allowed: true, nextTier: 'nivel' };
  }
  return {
    allowed: false,
    reason: 'Regla de jerarquía: Los Niveles son la posición final prevista y no pueden tener sububicaciones.',
  };
}

/**
 * Check if a location is a leaf node (no children).
 * Inventory stock can only be stored in leaf locations!
 */
export function isLeafLocation(locationId: string, allLocations: Location[]): boolean {
  return !allLocations.some((loc) => loc.parent_location_id === locationId);
}

/**
 * Check if a location has children
 */
export function hasChildren(locationId: string, allLocations: Location[]): boolean {
  return allLocations.some((loc) => loc.parent_location_id === locationId);
}

/**
 * Get direct children of a location
 */
export function getChildLocations(parentId: string, allLocations: Location[]): Location[] {
  return allLocations
    .filter((loc) => loc.parent_location_id === parentId)
    .sort((a, b) => (a.layout_config?.order ?? 0) - (b.layout_config?.order ?? 0) || a.code.localeCompare(b.code));
}

/**
 * Check if location can be deleted according to operational rules:
 * - Bodega and Columna cannot be deleted while they have sublocations.
 * - A location with movements or products cannot be deleted.
 */
export function canDeleteLocation(
  locationId: string,
  allLocations: Location[],
  productLocations: ProductLocation[]
): { canDelete: boolean; reason?: string } {
  // Check sublocations
  const children = allLocations.filter((l) => l.parent_location_id === locationId);
  if (children.length > 0) {
    return {
      canDelete: false,
      reason: `No se puede eliminar: Esta ubicación contiene ${children.length} sububicación(es). Elimine o traslade las sububicaciones primero.`,
    };
  }

  // Check inventory stock
  const hasInventory = productLocations.some((pl) => pl.location_id === locationId && pl.quantity > 0);
  if (hasInventory) {
    return {
      canDelete: false,
      reason: 'No se puede eliminar: Esta ubicación tiene existencias de productos asignadas. Debe vaciar el inventario primero.',
    };
  }

  return { canDelete: true };
}

/**
 * Validate unique code constraint per store
 */
export function isCodeUniqueInStore(
  code: string,
  storeId: string,
  allLocations: Location[],
  excludeLocationId?: string
): boolean {
  const normalizedNew = code.trim().toUpperCase();
  return !allLocations.some(
    (loc) =>
      loc.store_id === storeId &&
      loc.id !== excludeLocationId &&
      loc.code.trim().toUpperCase() === normalizedNew
  );
}

/**
 * Validate serialization rule for a product variant in a location:
 * - If location already contains serialized records for a variant, cannot add non-serialized units.
 * - If location already contains non-serialized records for a variant, cannot add serialized units.
 * - For serialized items, the serial number must be unique in that location.
 */
export function validateInventoryAddition(
  variantId: string,
  locationId: string,
  isSerialized: boolean,
  serie: string | null | undefined,
  existingProductLocations: ProductLocation[]
): { valid: boolean; reason?: string } {
  const existingRecords = existingProductLocations.filter(
    (pl) => pl.product_variant_id === variantId && pl.location_id === locationId && pl.quantity > 0
  );

  const hasSerialized = existingRecords.some((r) => r.serie !== null && r.serie !== '');
  const hasNonSerialized = existingRecords.some((r) => r.serie === null || r.serie === '');

  if (isSerialized) {
    if (hasNonSerialized) {
      return {
        valid: false,
        reason: 'Inconsistencia de inventario: Esta ubicación ya contiene existencias sin número de serie para este producto. No se permite mezclar unidades serializadas con unidades a granel.',
      };
    }
    if (!serie || serie.trim() === '') {
      return {
        valid: false,
        reason: 'El número de serie es obligatorio para este producto serializado.',
      };
    }
    // Check serie uniqueness for (variant + location + serie)
    const normalizedSerie = serie.trim().toUpperCase();
    const duplicate = existingRecords.find((r) => r.serie?.trim().toUpperCase() === normalizedSerie);
    if (duplicate) {
      return {
        valid: false,
        reason: `La serie '${serie}' ya se encuentra registrada en esta ubicación. Las series deben ser únicas.`,
      };
    }
  } else {
    // Non-serialized
    if (hasSerialized) {
      return {
        valid: false,
        reason: 'Inconsistencia de inventario: Esta ubicación ya contiene unidades serializadas para este producto. No se permite ingresar unidades sin serie en esta ubicación.',
      };
    }
  }

  return { valid: true };
}

/**
 * Check if two layout rectangles overlap
 */
export function doLayoutsOverlap(a: LayoutConfig, b: LayoutConfig): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

/**
 * Check if any column overlaps with another in the same bodega
 */
export function getOverlappingLocationIds(bodegaId: string, allLocations: Location[]): Set<string> {
  const columns = allLocations.filter((l) => l.parent_location_id === bodegaId);
  const overlapping = new Set<string>();

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const colA = columns[i];
      const colB = columns[j];
      if (doLayoutsOverlap(colA.layout_config, colB.layout_config)) {
        overlapping.add(colA.id);
        overlapping.add(colB.id);
      }
    }
  }

  return overlapping;
}
