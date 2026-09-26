import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScanLine, ArrowLeft, Menu } from 'lucide-react';
import { Button } from '../common/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  action?: React.ReactNode;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backTo,
  action,
  onOpenMobileMenu,
}) => {
  const location = useLocation();
  const { user, isDemoUser } = useAuth();
  const isNewPage = location.pathname === '/new';
  const isDemo = isDemoUser || user?.email === 'operator@cepagrade.ai';

  return (
    <header className="bg-white/90 dark:bg-[#0D0D0F]/90 backdrop-blur-md border-b border-zinc-200/90 dark:border-[#27272A] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-soft-sm transition-colors duration-200">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {showBack && (
          <Link
            to={(backTo || -1) as any}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121214] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0 shadow-soft-sm"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}

        <div className="min-w-0">
          {title && (
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Compact System Status Pill */}
        {isDemo ? (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">Local Demo</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="font-mono text-[10px]">Session Active</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#18181B] text-[11px] text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Connected</span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">Ready</span>
          </div>
        )}

        <ThemeToggle />

        {action}

        {!isNewPage && (
          <Link to="/new">
            <Button
              variant="primary"
              size="sm"
              icon={<ScanLine className="w-4 h-4" />}
            >
              New Scan
            </Button>
          </Link>
        )}

        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 hover:opacity-80 transition-opacity"
            title={`Signed in as ${user.name} (${user.role})`}
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 flex items-center justify-center font-bold text-xs font-mono">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-none">
                {user.name.split(' ')[0]}
              </p>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                {user.role}
              </span>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
};
