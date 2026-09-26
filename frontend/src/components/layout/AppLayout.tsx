import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export interface LayoutContextType {
  openMobileMenu: () => void;
}

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet context={{ openMobileMenu: () => setMobileOpen(true) }} />
      </div>
    </div>
  );
};
