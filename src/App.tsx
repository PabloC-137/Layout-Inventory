/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WarehouseProvider, useWarehouse } from './context/WarehouseContext';
import { TopNav } from './components/TopNav';
import { Toolbar } from './components/Toolbar';
import { SidebarStructure } from './components/SidebarStructure';
import { CanvasArea } from './components/CanvasArea';
import { FourSheetPrintModal } from './components/FourSheetPrintModal';
import { ScannerSimulatorModal } from './components/ScannerSimulatorModal';
import { LocationDetailsModal } from './components/LocationDetailsModal';
import { AddLocationModal } from './components/AddLocationModal';
import { Location } from './types/warehouse';

function WarehouseAppContent() {
  const { activeBodega, locations, currentStore } = useWarehouse();

  // Modal visibility states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLocationForDetails, setSelectedLocationForDetails] = useState<Location | null>(null);
  const [presetParentForAdd, setPresetParentForAdd] = useState<Location | null>(null);

  // Keyboard shortcut ⌘K / Ctrl+K for barcode scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsScannerModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAddModal = (parent?: Location | null) => {
    setPresetParentForAdd(parent || null);
    setIsAddModalOpen(true);
  };

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocationForDetails(loc);
  };

  const columns = activeBodega
    ? locations.filter((l) => l.parent_location_id === activeBodega.id)
    : [];

  const levels = locations.filter((l) => {
    if (!l.parent_location_id) return false;
    return columns.some((c) => c.id === l.parent_location_id);
  });

  return (
    <div className="min-h-screen bg-[#f3f4f6]/60 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <TopNav
        onOpenScanner={() => setIsScannerModalOpen(true)}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onOpenAddLocation={() => handleOpenAddModal(null)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col">
        {/* Module Header Toolbar matching screenshot */}
        <Toolbar
          onOpenPrint={() => setIsPrintModalOpen(true)}
          onOpenScanner={() => setIsScannerModalOpen(true)}
        />

        {/* Workspace: Sidebar + Interactive Canvas */}
        <div className="flex-1 flex gap-5">
          <SidebarStructure
            onOpenAddModal={(parent) => handleOpenAddModal(parent)}
            onSelectLocation={handleSelectLocation}
          />
          <CanvasArea
            onSelectLocation={handleSelectLocation}
            onOpenAddChild={(parent) => handleOpenAddModal(parent)}
          />
        </div>
      </main>

      {/* Modal: 4-Sheet Poster Printing (2x2 Quad Tiled Print) */}
      {activeBodega && (
        <FourSheetPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          activeBodega={activeBodega}
          columns={columns}
          levels={levels}
          storeName={currentStore.name}
        />
      )}

      {/* Modal: Barcode Scanner Simulator with $ -> Ñ and ' -> - tolerance */}
      <ScannerSimulatorModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
      />

      {/* Modal: Location details, inventory management, serialization rules & movements */}
      <LocationDetailsModal
        location={selectedLocationForDetails}
        onClose={() => setSelectedLocationForDetails(null)}
        onOpenAddChild={(parent) => handleOpenAddModal(parent)}
      />

      {/* Modal: Add New Location (Bodega, Columna, Nivel) */}
      <AddLocationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPresetParentForAdd(null);
        }}
        presetParent={presetParentForAdd}
      />
    </div>
  );
}

export default function App() {
  return (
    <WarehouseProvider>
      <WarehouseAppContent />
    </WarehouseProvider>
  );
}
