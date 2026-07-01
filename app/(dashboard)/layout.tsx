import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { getGoogleConfig, testGoogleConnection } from '@/lib/google-sheets';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const config = await getGoogleConfig();
  
  let isConnected = false;
  if (config) {
    const testRes = await testGoogleConnection(config);
    isConnected = testRes.success;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-blue-50">
      {/* Sidebar Navigation */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
