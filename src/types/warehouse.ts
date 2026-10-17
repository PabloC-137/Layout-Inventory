export type LocationUsage = 'storage' | 'exhibition';

export type HierarchyTier = 'bodega' | 'columna' | 'nivel';

export interface LayoutConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  order?: number;
  orientation?: 'vertical' | 'horizontal';
}

export interface Location {
  id: string; // UUID
  code: string; // unique per store
  name: string;
  description?: string;
  usage: LocationUsage;
  store_id: string;
  tenant_id: string;
  parent_location_id: string | null;
  layout_config: LayoutConfig;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  address?: string;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  category: string;
  barcode: string;
  is_serialized: boolean;
  unit: string;
  description?: string;
}

export interface ProductLocation {
  id: string; // UUID
  product_variant_id: string;
  location_id: string; // Must be a leaf node (Nivel)
  quantity: number;
  serie: string | null; // For serialized items, unique per (product_variant_id + location_id + serie)
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER';
  product_variant_id: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  quantity: number;
  serie?: string | null;
  note?: string;
  timestamp: string;
}

export interface ScanResolution {
  raw: string;
  normalized: string;
  matchedLocation?: Location;
  matchedVariant?: ProductVariant;
  replacementsApplied: {
    dollarToEnye: boolean;
    quoteToDash: boolean;
  };
}
