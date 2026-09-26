import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  History,
  FileText,
  User as UserIcon,
  LogOut,
  X,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  // Role-aware navigation definitions
  const getNavItems = () => {
    const role = user?.role || 'operator';
    return [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/new', label: 'New Inspection', icon: ScanLine },
      {
        to: '/history',
        label: role === 'farmer' ? 'My Batches' : role === 'supervisor' ? 'Batches' : 'History',
        icon: History,
      },
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/profile', label: 'Profile', icon: UserIcon },
    ];
  };

  const navItems = getNavItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0D0D0F] border-r border-zinc-200/90 dark:border-[#27272A] text-zinc-700 dark:text-zinc-300 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-200/90 dark:border-[#27272A] flex items-center justify-between">
        <Logo showSubtitle />
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500 text-white font-semibold shadow-soft-sm dark:bg-brand-500/20 dark:text-brand-300 dark:border dark:border-brand-500/40'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-[#18181B]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Authenticated User Identity - Anchored Cleanly at Sidebar Bottom */}
      {user && (
        <div className="p-3.5 mx-3 mb-4 mt-auto rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-[#27272A] shadow-soft-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user.name}
                </p>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize block truncate">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
