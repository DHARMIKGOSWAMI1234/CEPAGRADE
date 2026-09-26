import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Mail, Shield, Calendar, LogOut, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleColors: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    operator: 'primary',
    supervisor: 'info',
    inspector: 'warning',
    farmer: 'success',
    admin: 'primary',
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'operator':
        return 'Standard terminal operator authorized to capture, inspect, and triage batch quality.';
      case 'supervisor':
        return 'Facility supervisor with supervisory visibility over batches, reports, and grading trends.';
      case 'inspector':
        return 'Quality inspector authorized for deep morphometry diagnostics and metrological audit.';
      case 'farmer':
        return 'Produce supplier account with simplified batch summaries and grading certificates.';
      case 'admin':
        return 'System administrator with unrestricted configuration and database maintenance authority.';
      default:
        return 'Verified system member.';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header
        title="User Profile"
        subtitle="Manage your credentials and view assigned access authority"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
        {/* Profile Identity Card */}
        <div className="p-6 md:p-8 rounded-2xl bg-zinc-50 dark:bg-[#0D0D0F] border border-zinc-200 dark:border-[#27272A] shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 flex items-center justify-center text-2xl font-bold font-mono">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {user.name}
                </h2>
                <Badge variant={roleColors[user.role] || 'primary'} size="sm">
                  {user.role.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            icon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>

        {/* Detailed Permissions & Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Specification Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <Shield className="w-4 h-4 text-brand-500" />
              <span>Role Permissions & Scope</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {getRoleDescription(user.role)}
            </p>
            <div className="pt-2 border-t border-zinc-100 dark:border-[#27272A] space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Direct Batch Inspection:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Granted
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>PDF Certificate Export:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Granted
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Inspection Scoping:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">User Traceable</span>
              </div>
            </div>
          </Card>

          {/* Account Metadata Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
              <Calendar className="w-4 h-4 text-brand-500" />
              <span>Account Information</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Account ID:</span>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">USR-{String(user.id).padStart(4, '0')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Account Status:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Member Since:</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Security Standard:</span>
                <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">Argon2id + JWT</span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
