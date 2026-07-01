import Link from 'next/link';
import { 
  Users, 
  Percent, 
  ClipboardList, 
  AlertTriangle, 
  ChevronRight,
  Database
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { Topbar } from '@/components/topbar';
import { getGoogleConfig, readSheetRows, testGoogleConnection } from '@/lib/google-sheets';

export const revalidate = 0; // Disable caching for real-time sheets updates

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const config = await getGoogleConfig();
  
  let isConnected = false;
  let isInitialized = false;
  if (config) {
    const testRes = await testGoogleConnection(config);
    isConnected = testRes.success;
    isInitialized = testRes.isInitialized || false;
  }

  // Fallback states if not connected or not initialized
  if (!isConnected || !isInitialized) {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto">
        <Topbar title="Dashboard" isDatabaseConnected={false} connectionName={config?.name} />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-[#BE185D] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
              <Database className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {!isConnected ? "Google Sheets Belum Terhubung" : "Spreadsheet Belum Diinisialisasi"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {!isConnected 
                ? (user 
                  ? "Koneksi ke basis data Google Sheets belum dikonfigurasi atau tidak valid. Silakan atur kredensial dan hubungkan spreadsheet Anda."
                  : "Koneksi ke basis data Google Sheets belum dikonfigurasi atau tidak valid. Harap login sebagai QA untuk mengatur kredensial."
                  )
                : "Koneksi ke spreadsheet berhasil, namun struktur tabel/sheet di dalamnya belum diinisialisasi. Silakan inisialisasi sekarang agar dashboard dapat berfungsi."
              }
            </p>
            <div className="flex flex-col gap-2">
              {user ? (
                <Link 
                  href="/integration" 
                  className="px-4 py-2.5 bg-[#BE185D] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  {!isConnected ? "Hubungkan Google Sheets" : "Inisialisasi Spreadsheet"}
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="px-4 py-2.5 bg-[#BE185D] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Login Sebagai QA
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 1. Fetch data from sheets
  const [nilaiKualitas, temuanSampling, temuanEksternal] = await Promise.all([
    readSheetRows<any>('nilaiKualitas'),
    readSheetRows<any>('temuanSampling'),
    readSheetRows<any>('temuanEksternal'),
  ]);

  // 2. Compute KPIs
  // Total Petugas: Unique names from Nilai Kualitas
  const petugasNames = new Set<string>();
  nilaiKualitas.forEach(row => {
    if (row.petugas_name) petugasNames.add(row.petugas_name.trim());
  });
  const totalPetugas = petugasNames.size;

  // Average Score: Average across all months of all petugas
  let scoreSum = 0;
  let scoreCount = 0;
  nilaiKualitas.forEach(row => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    months.forEach(m => {
      const val = parseFloat(row[m]);
      if (!isNaN(val) && val > 0) {
        scoreSum += val;
        scoreCount++;
      }
    });
  });
  const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '0';

  const totalSampling = temuanSampling.length;
  const totalEksternal = temuanEksternal.length;

  // 3. Compute Monthly Trends (Sampling vs Eksternal)
  // Maps month indexes 0-11
  const monthlySamplingCounts = new Array(12).fill(0);
  const monthlyEksternalCounts = new Array(12).fill(0);

  // Sampling months helper
  const parseSamplingMonth = (dateStr: string): number => {
    if (!dateStr) return -1;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? -1 : date.getMonth();
  };

  // Process sampling months
  temuanSampling.forEach(row => {
    // Check tanggal_sampling or created_at
    const month = parseSamplingMonth(row.tanggal_sampling || row.created_at);
    if (month >= 0 && month < 12) {
      monthlySamplingCounts[month]++;
    }
  });

  // Process external months
  temuanEksternal.forEach(row => {
    const month = parseSamplingMonth(row.tanggal_temuan || row.created_at);
    if (month >= 0 && month < 12) {
      monthlyEksternalCounts[month]++;
    }
  });

  // Month Labels in Indonesian
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  // Calculate max count for chart scaling
  const maxFindings = Math.max(...monthlySamplingCounts, ...monthlyEksternalCounts, 5);

  // 4. Compute Top Petugas by total findings (Sampling + Eksternal)
  const findingsMap: Record<string, { sampling: number; eksternal: number; total: number }> = {};
  
  // Initialize with all unique petugas
  petugasNames.forEach(name => {
    findingsMap[name] = { sampling: 0, eksternal: 0, total: 0 };
  });

  // Count sampling findings
  temuanSampling.forEach(row => {
    const name = row.petugas_name?.trim();
    if (name) {
      if (!findingsMap[name]) findingsMap[name] = { sampling: 0, eksternal: 0, total: 0 };
      findingsMap[name].sampling++;
      findingsMap[name].total++;
    }
  });

  // Count external findings
  temuanEksternal.forEach(row => {
    const name = row.petugas_name?.trim();
    if (name) {
      if (!findingsMap[name]) findingsMap[name] = { sampling: 0, eksternal: 0, total: 0 };
      findingsMap[name].eksternal++;
      findingsMap[name].total++;
    }
  });

  const topPetugas = Object.entries(findingsMap)
    .map(([nama, stats]) => ({ nama, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <Topbar 
        title="Dashboard Utama" 
        subtitle="Analisis performa layanan & rekapitulasi temuan kualitas" 
        isDatabaseConnected={true} 
        connectionName={config?.name}
      />

      <main className="flex-1 p-8 space-y-8">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Petugas"
            value={totalPetugas}
            icon={<Users className="w-5 h-5" />}
            accentColor="bg-blue-50 text-blue-700 border-blue-100"
            description="Petugas terdaftar aktif"
          />
          <StatCard 
            title="Rata-rata Kualitas"
            value={`${avgScore}%`}
            icon={<Percent className="w-5 h-5" />}
            accentColor="bg-emerald-50 text-emerald-700 border-emerald-100"
            description="Nilai rata-rata pelayanan"
          />
          <StatCard 
            title="Temuan Sampling"
            value={totalSampling}
            icon={<ClipboardList className="w-5 h-5" />}
            accentColor="bg-amber-50 text-amber-700 border-amber-100"
            description="Temuan audit sampling"
          />
          <StatCard 
            title="Temuan Eksternal"
            value={totalEksternal}
            icon={<AlertTriangle className="w-5 h-5" />}
            accentColor="bg-red-50 text-red-700 border-red-100"
            description="Temuan dari kanal luar"
          />
        </div>

        {/* Chart and Top List Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Tren Temuan Bulanan</h3>
                <p className="text-xs text-slate-500">Perbandingan frekuensi temuan sampling & eksternal</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded" />
                  <span className="text-slate-600">Sampling</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-slate-600">Eksternal</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Chart */}
            <div className="flex-1 w-full min-h-[250px] relative mt-2">
              <svg viewBox="0 0 600 240" className="w-full h-full" preserveAspectRatio="none">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const y = 20 + ratio * 180;
                  const labelVal = Math.round(maxFindings * (1 - ratio));
                  return (
                    <g key={index}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <text x="30" y={y + 4} fill="#94A3B8" fontSize="10" fontWeight="600" textAnchor="end">{labelVal}</text>
                    </g>
                  );
                })}

                {/* Bars rendering */}
                {monthLabels.map((label, index) => {
                  const x = 50 + index * 44;
                  const samplingVal = monthlySamplingCounts[index];
                  const eksternalVal = monthlyEksternalCounts[index];
                  
                  // Heights based on scale
                  const samplingHeight = (samplingVal / maxFindings) * 180;
                  const eksternalHeight = (eksternalVal / maxFindings) * 180;

                  return (
                    <g key={index}>
                      {/* Sampling Bar */}
                      <rect 
                        x={x} 
                        y={200 - samplingHeight} 
                        width="14" 
                        height={samplingHeight} 
                        fill="#F59E0B" 
                        rx="3"
                        className="transition-all duration-300 hover:fill-amber-600"
                      />
                      {/* Eksternal Bar */}
                      <rect 
                        x={x + 16} 
                        y={200 - eksternalHeight} 
                        width="14" 
                        height={eksternalHeight} 
                        fill="#EF4444" 
                        rx="3"
                        className="transition-all duration-300 hover:fill-red-600"
                      />
                      {/* X-axis Month Label */}
                      <text x={x + 15} y="220" fill="#64748B" fontSize="9" fontWeight="bold" textAnchor="middle">{label}</text>
                    </g>
                  );
                })}

                <line x1="40" y1="200" x2="580" y2="200" stroke="#CBD5E1" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          {/* Top Petugas Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Top 5 Kategori Temuan</h3>
            <p className="text-xs text-slate-500 mb-6">Petugas dengan akumulasi temuan terbanyak</p>

            <div className="flex-1 space-y-4">
              {topPetugas.length > 0 ? (
                topPetugas.map((petugas, index) => {
                  const total = petugas.total;
                  return (
                    <div key={petugas.nama} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-800 truncate">{petugas.nama}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>S: {petugas.sampling}</span>
                            <span>•</span>
                            <span>E: {petugas.eksternal}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                        {total} temuan
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <p className="text-xs font-semibold text-slate-400">Tidak ada data temuan</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link 
                href="/temuan-sampling" 
                className="flex items-center justify-between text-xs font-bold text-[#BE185D] hover:text-blue-700 transition-colors"
              >
                <span>Lihat Data Temuan Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Reusable Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  description: string;
}

function StatCard({ title, value, icon, accentColor, description }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${accentColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{value}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{description}</p>
      </div>
    </div>
  );
}
