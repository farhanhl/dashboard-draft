'use client';

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title: string;
  subtitle?: string;
  isDatabaseConnected?: boolean;
  connectionName?: string;
}

export function Topbar({ title, subtitle, isDatabaseConnected = true, connectionName }: TopbarProps) {
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const timer = setTimeout(() => {
      setCurrentDate(new Date().toLocaleDateString('id-ID', options));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm shrink-0">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Date Display */}
        <span className="text-xs font-semibold text-slate-500 hidden md:inline-block">
          {currentDate}
        </span>

        {/* Database Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors",
            isDatabaseConnected 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-red-50 text-red-700 border-red-200"
          )}>
            <Database className="w-3.5 h-3.5" />
            <span>
              Sheets: {isDatabaseConnected ? (
                <>Connected <span className="font-semibold text-emerald-600">({connectionName || 'Aktif'})</span></>
              ) : (
                'Disconnected'
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
