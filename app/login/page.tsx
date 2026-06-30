'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Dashboard Publik
        </Link>

        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1E3A8A] flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="font-extrabold text-white text-lg">QA</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Login QA Administrator</h2>
          <p className="text-xs text-slate-500 mt-1.5">
            Masuk untuk mengakses manajemen integrasi, edit data, dan kelola pengguna.
          </p>
        </div>

        {/* Login Form */}
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-xs font-semibold text-red-700">
              {state.error}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                name="email"
                type="email" 
                required
                defaultValue="admin@qa.com"
                placeholder="email@qa.com"
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                name="password"
                type="password" 
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk Sekarang</span>
            )}
          </button>
        </form>

        {/* Note info */}
        <div className="text-[10px] text-center text-slate-400 border-t border-slate-100 pt-4">
          Username default: <strong className="text-slate-500">admin@qa.com</strong> | Password: <strong className="text-slate-500">admin123</strong>
        </div>
      </div>
    </div>
  );
}
