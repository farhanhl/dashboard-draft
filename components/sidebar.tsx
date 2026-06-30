'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Percent, 
  ClipboardList, 
  AlertTriangle, 
  Smile, 
  Ticket, 
  BookOpen, 
  Settings2, 
  Users, 
  LogIn, 
  LogOut, 
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/app/actions/auth';

interface SidebarProps {
  user: { email: string; name: string; role: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  // Navigation Items
  const publicNavItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/nilai-kualitas', label: 'Nilai Kualitas', icon: Percent },
    { href: '/temuan-sampling', label: 'Temuan Sampling', icon: ClipboardList },
    { href: '/temuan-eksternal', label: 'Temuan Eksternal', icon: AlertTriangle },
    { href: '/survey-kepuasan', label: 'Survey Kepuasan', icon: Smile },
    { href: '/ticket-sampling', label: 'List Ticket Sampling', icon: Ticket },
    { href: '/coaching', label: 'Riwayat Coaching', icon: BookOpen },
  ];

  const qaNavItems = [
    { href: '/integration', label: 'Google Integration', icon: Settings2 },
    { href: '/users', label: 'Manajemen User', icon: Users },
  ];

  return (
    <aside className="w-64 bg-[#1E3A8A] text-slate-100 flex flex-col h-screen shrink-0 border-r border-blue-900/50 shadow-lg">
      {/* Brand Header */}
      <div className="p-6 border-b border-blue-900/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
          <span className="font-bold text-base text-white">QA</span>
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white leading-tight">QA Dashboard</h1>
          <p className="text-[10px] text-blue-200">TIM Management</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        <div>
          <p className="text-[10px] uppercase font-bold text-blue-200 px-3 mb-2 tracking-wider">Modul Layanan</p>
          <nav className="space-y-1">
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    isActive 
                      ? "bg-blue-800 text-white shadow-inner" 
                      : "text-blue-100/70 hover:bg-blue-800/40 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* QA Only Section */}
        {user && (
          <div>
            <p className="text-[10px] uppercase font-bold text-blue-200 px-3 mb-2 tracking-wider">QA Administrator</p>
            <nav className="space-y-1">
              {qaNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150",
                      isActive 
                        ? "bg-blue-800 text-white shadow-inner" 
                        : "text-blue-100/70 hover:bg-blue-800/40 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer (User session / Login) */}
      <div className="p-4 border-t border-blue-900/50 bg-[#172E70]">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-300" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <span className="inline-block text-[9px] font-bold bg-blue-600/60 text-blue-100 px-1.5 py-0.5 rounded leading-none">
                  {user.role}
                </span>
              </div>
            </div>
            
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-200 hover:bg-red-900/30 hover:text-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar Sesi
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md"
          >
            <LogIn className="w-4 h-4" />
            Login QA
          </Link>
        )}
      </div>
    </aside>
  );
}
