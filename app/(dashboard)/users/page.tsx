import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/topbar';
import { UsersTable } from '@/components/users-table';
import { getGoogleConfig, readSheetRows, testGoogleConnection } from '@/lib/google-sheets';

export const revalidate = 0;

export default async function UsersPage() {
  const user = await getCurrentUser();
  
  // Protect page: only logged-in QA admins can view/manage users
  if (!user) {
    redirect('/login');
  }

  const config = getGoogleConfig();
  
  let isConnected = false;
  if (config) {
    const testRes = await testGoogleConnection(config);
    isConnected = testRes.success;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Topbar title="Manajemen Pengguna" isDatabaseConnected={false} />
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Google Sheets Belum Terhubung</h3>
            <p className="text-xs text-slate-500 mb-4">Integrasikan Google Sheets terlebih dahulu di halaman integrasi.</p>
          </div>
        </main>
      </div>
    );
  }

  const rawUsers = await readSheetRows<any>('users');

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Topbar 
        title="Manajemen Pengguna QA" 
        subtitle="Kelola akun petugas administrator QA yang berhak mengelola data" 
        isDatabaseConnected={true} 
      />

      <main className="flex-1 p-8 space-y-6 bg-slate-50/30">
        <UsersTable data={rawUsers} currentUser={user} />
      </main>
    </div>
  );
}
