import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/topbar';
import { NilaiKualitasTable } from '@/components/nilai-kualitas-table';
import { getGoogleConfig, readSheetRows, testGoogleConnection } from '@/lib/google-sheets';

export const revalidate = 0; // Read directly from google sheet in real time

export default async function NilaiKualitasPage() {
  const config = await getGoogleConfig();
  
  let isConnected = false;
  if (config) {
    const testRes = await testGoogleConnection(config);
    isConnected = testRes.success;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Topbar title="Nilai Kualitas" isDatabaseConnected={false} connectionName={config?.name} />
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Google Sheets Belum Terhubung</h3>
            <p className="text-xs text-slate-500 mb-4">Integrasikan Google Sheets terlebih dahulu di halaman integrasi.</p>
          </div>
        </main>
      </div>
    );
  }

  const user = await getCurrentUser();
  const rawData = await readSheetRows<any>('nilaiKualitas');

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Topbar 
        title="Nilai Kualitas Layanan" 
        subtitle="Daftar rekapitulasi penilaian kualitas pelayanan petugas bulanan" 
        isDatabaseConnected={true} 
        connectionName={config?.name}
      />

      <main className="flex-1 p-8 space-y-6 bg-slate-50/30">
        <NilaiKualitasTable data={rawData} isQA={!!user} />
      </main>
    </div>
  );
}
