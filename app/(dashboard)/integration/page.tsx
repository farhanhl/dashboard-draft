import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/topbar';
import { GoogleIntegrationForm } from '@/components/google-integration-form';
import { getGoogleConfig, testGoogleConnection, getGoogleConnections } from '@/lib/google-sheets';

export const revalidate = 0;

export default async function GoogleIntegrationPage() {
  const user = await getCurrentUser();
  
  // Protect page - redirect to login if not authorized
  if (!user) {
    redirect('/login');
  }

  const config = await getGoogleConfig();
  const connections = await getGoogleConnections();
  
  let isConnected = false;
  if (config) {
    const testRes = await testGoogleConnection(config);
    isConnected = testRes.success;
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Topbar 
        title="Google Sheets Integration" 
        subtitle="Kelola koneksi basis data spreadsheet dan struktur tabel" 
        isDatabaseConnected={isConnected} 
        connectionName={config?.name}
      />

      <main className="flex-1 p-8 space-y-6 bg-slate-50/50">
        <GoogleIntegrationForm initialConfig={config} initialConnections={connections} />
      </main>
    </div>
  );
}
