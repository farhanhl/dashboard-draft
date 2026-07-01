'use client';

import { useState, useTransition } from 'react';
import { 
  updateGoogleConfigAction, 
  testConnectionAction, 
  initializeSheetsAction,
  getGoogleConnectionsAction,
  saveGoogleConnectionAction,
  activateGoogleConnectionAction,
  deleteGoogleConnectionAction
} from '@/app/actions/auth';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Edit2,
  Plus,
  Check,
  HelpCircle,
  Cloud,
  Key,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import { GoogleConfig, GoogleConnection } from '@/lib/google-sheets';

interface GoogleIntegrationFormProps {
  initialConfig: GoogleConfig | null;
  initialConnections: GoogleConnection[];
}

export function GoogleIntegrationForm({ initialConfig, initialConnections }: GoogleIntegrationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ success?: boolean; title?: string; error?: string } | null>(null);
  const [initResult, setInitResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Active guide tab state
  const [activeGuideTab, setActiveGuideTab] = useState<'cloud' | 'serviceAccount' | 'sheet' | 'initialize'>('cloud');

  // Connection list state
  const [connections, setConnections] = useState<GoogleConnection[]>(initialConnections);
  const activeConn = initialConnections.find(c => c.active);

  // States for dynamic inputs
  const [editingId, setEditingId] = useState<string | null>(initialConfig ? (activeConn?.id || 'conn_default') : null);
  const [connectionName, setConnectionName] = useState(activeConn?.name || 'Koneksi Utama');
  const [spreadsheetId, setSpreadsheetId] = useState(initialConfig?.spreadsheetId || '');
  const [clientEmail, setClientEmail] = useState(initialConfig?.clientEmail || '');
  const [privateKey, setPrivateKey] = useState(initialConfig?.privateKey || '');

  const loadConnections = async () => {
    const res = await getGoogleConnectionsAction();
    if (res.success && res.connections) {
      setConnections(res.connections);
    }
  };

  const handleSelectToEdit = (conn: GoogleConnection) => {
    setEditingId(conn.id);
    setConnectionName(conn.name);
    setSpreadsheetId(conn.spreadsheetId);
    setClientEmail(conn.clientEmail);
    setPrivateKey(conn.privateKey);
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setConnectionName('Koneksi Baru');
    setSpreadsheetId('');
    setClientEmail('');
    setPrivateKey('');
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);
  };

  const handleActivate = async (id: string) => {
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);
    startTransition(async () => {
      const res = await activateGoogleConnectionAction(id);
      if (res.success) {
        setSaveResult({ success: true, message: res.message });
        const resList = await getGoogleConnectionsAction();
        if (resList.success && resList.connections) {
          setConnections(resList.connections);
          const active = resList.connections.find(c => c.active);
          if (active) {
            setSpreadsheetId(active.spreadsheetId);
            setClientEmail(active.clientEmail);
            setPrivateKey(active.privateKey);
            setConnectionName(active.name);
            setEditingId(active.id);
          }
        }
      } else {
        setSaveResult({ success: false, error: res.error });
      }
    });
  };

  const handleDeleteConnection = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus koneksi "${name}"?`)) {
      return;
    }
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);
    startTransition(async () => {
      const res = await deleteGoogleConnectionAction(id);
      if (res.success) {
        setSaveResult({ success: true, message: res.message });
        const resList = await getGoogleConnectionsAction();
        if (resList.success && resList.connections) {
          setConnections(resList.connections);
        } else {
          setConnections([]);
        }
        if (editingId === id) {
          handleResetForm();
        }
      } else {
        setSaveResult({ success: false, error: res.error });
      }
    });
  };

  // 1. Handle Config Save (Submits Form)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);

    startTransition(async () => {
      const res = await saveGoogleConnectionAction(connectionName, {
        id: editingId || undefined,
        spreadsheetId: spreadsheetId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey,
      });

      if (res.success) {
        setSaveResult({ success: true, message: res.message });
        const resList = await getGoogleConnectionsAction();
        if (resList.success && resList.connections) {
          setConnections(resList.connections);
          const matched = resList.connections.find(c => c.spreadsheetId === spreadsheetId.trim());
          if (matched) {
            setEditingId(matched.id);
          }
        }
      } else {
        setSaveResult({ success: false, error: res.error });
      }
    });
  };

  // 2. Handle Connection Test
  const handleTestConnection = async () => {
    setTestResult(null);
    setInitResult(null);
    setSaveResult(null);

    if (!spreadsheetId || !clientEmail || !privateKey) {
      setTestResult({ success: false, error: 'Semua field wajib diisi sebelum menguji koneksi.' });
      return;
    }

    const config: GoogleConfig = {
      spreadsheetId: spreadsheetId.trim(),
      clientEmail: clientEmail.trim(),
      privateKey: privateKey,
    };

    startTransition(async () => {
      const res = await testConnectionAction(config);
      if (res.success) {
        setTestResult({ success: true, title: res.spreadsheetTitle });
      } else {
        setTestResult({ success: false, error: res.error });
      }
    });
  };

  // 3. Handle Sheet Initialization
  const handleInitializeSheets = async () => {
    if (!confirm('Apakah Anda yakin ingin menginisialisasi spreadsheet ini? Tindakan ini akan membuat sheet baru jika belum tersedia.')) {
      return;
    }

    setInitResult(null);
    setTestResult(null);
    setSaveResult(null);

    startTransition(async () => {
      const res = await initializeSheetsAction();
      if (res.success) {
        setInitResult({ success: true, message: res.message });
      } else {
        setInitResult({ success: false, error: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {saveResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-semibold ${
          saveResult.success 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {saveResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <div>
            <p>{saveResult.success ? saveResult.message : saveResult.error}</p>
          </div>
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-semibold ${
          testResult.success 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <div>
            <p>
              {testResult.success 
                ? `Koneksi Berhasil! Terhubung ke spreadsheet: "${testResult.title}"` 
                : `Gagal tersambung: ${testResult.error}`}
            </p>
          </div>
        </div>
      )}

      {initResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-semibold ${
          initResult.success 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {initResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <div>
            <p>{initResult.success ? initResult.message : initResult.error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Connection Profiles */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#BE185D]" />
                Profil Koneksi ({connections.length})
              </h4>
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Baru
              </button>
            </div>

            {connections.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl">
                Belum ada koneksi tersimpan
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className={`p-3.5 rounded-xl border transition-all relative group cursor-pointer ${
                      conn.active
                        ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                        : editingId === conn.id
                        ? 'border-blue-400 bg-blue-50/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                    onClick={() => handleSelectToEdit(conn)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{conn.name}</span>
                          {conn.active && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-2.5 h-2.5" /> Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono line-clamp-1">
                          ID: {conn.spreadsheetId.substring(0, 10)}...
                        </div>
                      </div>
                      
                      {/* Hover / Actions */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!conn.active && (
                          <button
                            type="button"
                            title="Aktifkan Koneksi"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActivate(conn.id);
                            }}
                            className="p-1 bg-white hover:bg-emerald-50 border border-slate-200 rounded text-emerald-600 hover:text-emerald-700 shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Hapus Koneksi"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConnection(conn.id, conn.name);
                          }}
                          className="p-1 bg-white hover:bg-red-50 border border-slate-200 rounded text-red-650 hover:text-red-755 shadow-sm transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connection Form & Settings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#BE185D]" />
                {editingId ? 'Edit Koneksi' : 'Koneksi Baru'}
              </h3>
              <div className="text-[10px] text-slate-400 font-semibold">
                Status: {editingId ? 'Profil Tersimpan' : 'Profil Baru'}
              </div>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Nama Koneksi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Nama Koneksi</label>
                <input 
                  type="text" 
                  required
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="Contoh: Spreadsheet Utama"
                  className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                />
              </div>

              {/* Spreadsheet ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Spreadsheet ID</label>
                <input 
                  type="text" 
                  required
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="1aBcD...eFgHiJkLmNoP"
                  className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  <strong>Cara menemukan:</strong> Buka Google Spreadsheet baru Anda di browser. ID Spreadsheet adalah rangkaian huruf & angka acak panjang pada URL setelah <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">/d/</code> dan sebelum <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">/edit</code>.
                </p>
              </div>

              {/* Client Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Service Account Email (Client Email)</label>
                <input 
                  type="email" 
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="project-name@developer.gserviceaccount.com"
                  className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Dapat ditemukan pada file JSON key Anda pada baris properti <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">"client_email"</code>.
                  <br />
                  <strong>PENTING:</strong> Bagikan (Share) Google Sheet Anda ke email ini dengan peran akses sebagai <strong>Editor</strong> agar data dapat dibaca/ditulis.
                </p>
              </div>

              {/* Private Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Private Key</label>
                <textarea 
                  rows={6}
                  required
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC... \n-----END PRIVATE KEY-----\n"
                  className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono text-slate-800"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  <strong>Cara menemukan:</strong> Buka file JSON key Anda di Notepad atau VS Code. Salin seluruh teks properti <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">"private_key"</code>.
                </p>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#BE185D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan Koneksi
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Uji Koneksi
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleInitializeSheets}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 rounded-lg text-xs font-bold transition-all"
                  >
                    {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Inisialisasi Spreadsheet
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Detailed Guide Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#BE185D] border border-pink-100 flex items-center justify-center shrink-0 shadow-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Panduan Lengkap &amp; Detail Integrasi Google Sheets</h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Ikuti 4 langkah terstruktur di bawah ini untuk menghubungkan dan menyiapkan basis data Google Spreadsheet Anda.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 overflow-x-auto bg-white">
          <button
            type="button"
            onClick={() => setActiveGuideTab('cloud')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeGuideTab === 'cloud'
                ? 'border-[#BE185D] text-[#BE185D] bg-pink-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            <Cloud className="w-4 h-4 shrink-0" />
            1. Google Cloud &amp; API
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('serviceAccount')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeGuideTab === 'serviceAccount'
                ? 'border-[#BE185D] text-[#BE185D] bg-pink-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            <Key className="w-4 h-4 shrink-0" />
            2. Service Account &amp; JSON Key
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('sheet')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeGuideTab === 'sheet'
                ? 'border-[#BE185D] text-[#BE185D] bg-pink-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            3. Google Sheet Sharing
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('initialize')}
            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              activeGuideTab === 'initialize'
                ? 'border-[#BE185D] text-[#BE185D] bg-pink-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            4. Inisialisasi Struktur Tabel
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white min-h-[300px]">
          {activeGuideTab === 'cloud' && (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Langkah 1: Konfigurasi Proyek &amp; Mengaktifkan API Layanan
              </h5>
              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-semibold">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                  <div>
                    Buka portal resmi <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-650 hover:underline font-bold inline-flex items-center gap-0.5">Google Cloud Console <span className="text-[10px]">↗</span></a> dan masuk menggunakan akun Google Anda.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                  <div>
                    Klik dropdown proyek di pojok kiri atas (di sebelah logo Google Cloud) lalu klik tombol <strong className="text-slate-800">"Proyek Baru" (New Project)</strong>. Masukkan nama proyek (contoh: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-700 font-bold">QA Dashboard System</code>), lalu klik tombol <strong className="text-slate-800">Buat (Create)</strong>.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                  <div>
                    Tunggu hingga pembuatan proyek selesai. Setelah selesai, pastikan Anda beralih ke proyek baru tersebut dengan memilihnya di dropdown proyek kiri atas.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">4</span>
                  <div>
                    Ketik <strong className="text-slate-800">"Google Sheets API"</strong> di kolom pencarian utama di bagian atas, pilih API tersebut dari daftar hasil, lalu klik tombol biru <strong className="text-[#BE185D]">"Aktifkan" (Enable)</strong>.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">5</span>
                  <div>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">Sangat Direkomendasikan</span> Kembali ke bilah pencarian, cari <strong className="text-slate-800">"Google Drive API"</strong>, dan aktifkan juga. Hal ini membantu server dalam mengelola hak akses file secara dinamis.
                  </div>
                </div>
              </div>

              {/* Tips Callout */}
              <div className="mt-6 p-4 bg-amber-50/50 border border-amber-250/60 rounded-xl flex gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 font-semibold">
                  <p className="font-bold text-amber-800">Mengapa menggunakan Google Cloud?</p>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Google Cloud Console digunakan untuk menjembatani sistem backend web ini dengan Google Sheets secara aman menggunakan protokol OAuth2/Service Account. Kuota gratis Google API sangat memadai untuk aktivitas harian dashboard QA.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'serviceAccount' && (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Langkah 2: Pembuatan Akun Layanan &amp; Unduh File Kunci Otorisasi
              </h5>
              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-semibold">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                  <div>
                    Klik tombol menu navigasi kiri atas (ikon menu burger) di Google Cloud Console, arahkan kursor ke <strong className="text-slate-800">"IAM &amp; Admin"</strong>, lalu pilih <strong className="text-slate-800">"Service Accounts" (Akun Layanan)</strong>.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                  <div>
                    Klik tombol <strong className="text-slate-800 font-bold">+ Create Service Account</strong> di bagian atas layar.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                  <div>
                    Isi detail akun layanan:
                    <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[11px] text-slate-500">
                      <li><strong className="text-slate-700">Service account name:</strong> ketik nama pengenal, misal <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">qa-dashboard-connector</code></li>
                      <li><strong className="text-slate-700">Service account ID:</strong> terisi otomatis</li>
                    </ul>
                    Klik tombol <strong className="text-slate-800">Create and Continue</strong>.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">4</span>
                  <div>
                    Pada bagian <em className="text-slate-500">Grant this service account access to project</em>, Anda dapat langsung mengklik tombol <strong className="text-slate-800">Continue</strong> dan selanjutnya klik <strong className="text-slate-800">Done</strong> tanpa memilih peran (Role).
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">5</span>
                  <div>
                    Kembali ke daftar Service Account, Anda akan melihat alamat email baru berformat:
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[10px] text-slate-600 select-all font-bold inline-block break-all">
                      qa-dashboard-connector@proyek-anda.iam.gserviceaccount.com
                    </div>
                    <br />
                    <strong className="text-[#BE185D]">Salin alamat email ini!</strong> Anda akan membutuhkannya untuk dimasukkan ke input <strong className="text-slate-800">"Service Account Email"</strong> di atas.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">6</span>
                  <div>
                    Klik alamat email tersebut untuk membuka halamannya. Lalu klik tab <strong className="text-slate-800">"Keys" (Kunci)</strong> di bagian atas.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">7</span>
                  <div>
                    Klik tombol <strong className="text-slate-800 font-bold">Add Key</strong> &gt; <strong className="text-slate-800 font-bold">Create new key</strong>. Pilih tipe format <strong className="text-slate-800">JSON</strong> lalu klik <strong className="text-slate-800">Create</strong>. Berkas kunci JSON rahasia akan terunduh otomatis ke komputer Anda.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">8</span>
                  <div>
                    Buka file JSON hasil unduhan tersebut menggunakan editor teks (Notepad/VS Code). Salin seluruh isi teks properti <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">"private_key"</code> (termasuk karakter <code className="text-rose-700 font-bold">-----BEGIN PRIVATE KEY-----</code> sampai <code className="text-rose-700 font-bold">-----END PRIVATE KEY-----</code>) dan masukkan ke field input <strong className="text-slate-800">"Private Key"</strong> di form atas.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'sheet' && (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Langkah 3: Menghubungkan Google Spreadsheet &amp; Otorisasi Akses
              </h5>
              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-semibold">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                  <div>
                    Buka Google Drive Anda, buat Google Spreadsheet baru (atau gunakan yang sudah ada) dan beri nama yang sesuai.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                  <div>
                    Dapatkan <strong className="text-slate-800">Spreadsheet ID</strong> dari URL browser.
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[10px] text-slate-500 leading-normal">
                      URL: https://docs.google.com/spreadsheets/d/<span className="text-[#BE185D] font-bold bg-pink-50 px-1 py-0.5 border border-pink-200 rounded">1H_g8pM45Xyz_zD9oK7wYJq-rN32UaBCdEfgH1234</span>/edit#gid=0
                    </div>
                    Salin deretan karakter acak panjang di antara <code className="bg-slate-100 px-1 font-mono text-[10px]">/d/</code> dan <code className="bg-slate-100 px-1 font-mono text-[10px]">/edit</code>, lalu masukkan ke field <strong className="text-slate-800">"Spreadsheet ID"</strong> di form atas.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                  <div>
                    Buka spreadsheet Anda tersebut, klik tombol biru <strong className="text-slate-800 font-bold">"Bagikan" (Share)</strong> di pojok kanan atas.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">4</span>
                  <div>
                    Masukkan alamat email Service Account yang Anda salin pada Langkah 2 (format email <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700">...@...gserviceaccount.com</code>).
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">5</span>
                  <div>
                    <strong className="text-rose-700">KRITIS:</strong> Pastikan Anda menyetel peran akses akun tersebut sebagai <strong className="text-slate-800">"Editor"</strong> (bukan Pelihat/Viewer) agar server program diizinkan memodifikasi baris spreadsheet. Klik tombol <strong className="text-slate-800">"Bagikan" (Share/Send)</strong>.
                  </div>
                </div>
              </div>

              {/* Warning Callout */}
              <div className="mt-6 p-4 bg-rose-50/50 border border-rose-200/60 rounded-xl flex gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 font-semibold">
                  <p className="font-bold text-rose-800">Menghindari Error Otorisasi (Permission Denied)</p>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Jika Anda tidak membagikan dokumen spreadsheet ke email Service Account dengan hak Editor, uji koneksi akan memunculkan pesan error <code className="text-rose-650 bg-rose-50 px-1 font-mono text-[10px] rounded">"The caller does not have permission"</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === 'initialize' && (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Langkah 4: Penyimpanan Koneksi &amp; Inisialisasi Struktur Lembar Kerja (Worksheet)
              </h5>
              <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-semibold">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                  <div>
                    Setelah mengisi form di atas, klik tombol <strong className="text-slate-800">"Simpan Koneksi"</strong> terlebih dahulu untuk merekam profil ke database lokal/Supabase.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                  <div>
                    Klik tombol <strong className="text-slate-800">"Uji Koneksi"</strong>. Apabila berhasil, sistem akan merespon dengan info nama spreadsheet.
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                  <div>
                    Klik tombol biru <strong className="text-slate-800">"Inisialisasi Spreadsheet"</strong>. Sistem akan memeriksa dan membuat sheet-sheet baru yang diperlukan beserta header kolomnya:
                  </div>
                </div>

                <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-semibold text-slate-600">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Config
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Metadata konfigurasi internal.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Users
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">
                      Data login pengguna. Akan diisi user default QA: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[9px]">admin@qa.com</code> / <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono text-[9px]">admin123</code>.
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Nilai Kualitas
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Pencapaian performa QA bulanan Agen.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Temuan Sampling
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Rekaman penilaian detil per indikator QA.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Temuan Eksternal
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Kesalahan kritikal &amp; temuan luar operasional.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Survey Kepuasan
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Persentase CSAT bulanan per Agen.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      List Ticket Sampling
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Target sampling audit tiket bulanan.</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-slate-800 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BE185D]"></div>
                      Riwayat Coaching
                    </div>
                    <div className="text-slate-500 font-normal pl-2.5">Data tindak lanjut konseling &amp; coaching.</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-[10px]">4</span>
                  <div>
                    <strong className="text-rose-700 font-bold">CATATAN PENTING:</strong> Jangan menghapus worksheet ataupun mengubah susunan teks header kolom di baris pertama spreadsheet yang dibuat. Sistem membaca data berdasarkan nama header kolom tersebut.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
