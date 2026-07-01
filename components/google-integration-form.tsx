'use client';

import { useState, useTransition } from 'react';
import { 
  updateGoogleConfigAction, 
  testConnectionAction, 
  initializeSheetsAction 
} from '@/app/actions/auth';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { GoogleConfig } from '@/lib/google-sheets';

interface GoogleIntegrationFormProps {
  initialConfig: GoogleConfig | null;
}

export function GoogleIntegrationForm({ initialConfig }: GoogleIntegrationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ success?: boolean; title?: string; error?: string } | null>(null);
  const [initResult, setInitResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // States for dynamic inputs
  const [spreadsheetId, setSpreadsheetId] = useState(initialConfig?.spreadsheetId || '');
  const [clientEmail, setClientEmail] = useState(initialConfig?.clientEmail || '');
  const [privateKey, setPrivateKey] = useState(initialConfig?.privateKey || '');

  // 1. Handle Config Save (Submits Form)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveResult(null);
    setTestResult(null);
    setInitResult(null);

    const formData = new FormData();
    formData.append('spreadsheetId', spreadsheetId);
    formData.append('clientEmail', clientEmail);
    formData.append('privateKey', privateKey);

    startTransition(async () => {
      const res = await updateGoogleConfigAction(formData);
      if (res.success) {
        setSaveResult({ success: true, message: res.message });
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
    <div className="space-y-6 max-w-4xl">
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

      {/* Main Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#BE185D]" />
            Konfigurasi Google Sheets API
          </h3>
          <div className="text-[10px] text-slate-400 font-semibold">
            Status: {initialConfig ? 'Terkonfigurasi' : 'Belum Terkonfigurasi'}
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
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
              <br />
              Contoh: <code className="text-slate-400 font-mono text-[9px]">https://docs.google.com/spreadsheets/d/<b>1aBcD...eFgHiJkLmNoP</b>/edit</code>
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
              <strong>Cara menemukan:</strong> Buka file JSON key Anda di Notepad atau VS Code. Salin seluruh teks properti <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">"private_key"</code> dari tanda pembuka <code className="text-blue-700">-----BEGIN PRIVATE KEY-----</code> hingga penutup <code className="text-blue-700">-----END PRIVATE KEY-----</code>.
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
              Simpan & Hubungkan
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

            {initialConfig && (
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

      {/* Guide Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800">Panduan Lengkap Mendapatkan Kredensial Google Sheets</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-650 leading-relaxed font-semibold">
            <div className="space-y-2">
              <p className="font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1 uppercase tracking-wide">1. Mendapatkan Service Account & JSON Key</p>
              <ul className="list-decimal pl-4 space-y-1.5">
                <li>Buka <a href="https://console.cloud.google.com" target="_blank" className="text-blue-600 hover:underline">Google Cloud Console</a>.</li>
                <li>Aktifkan <strong>Google Sheets API</strong> pada menu Enabled APIs & services.</li>
                <li>Masuk ke halaman <strong>Credentials</strong>, klik Service Account yang telah Anda buat di bagian bawah.</li>
                <li>Buka tab <strong>"Keys"</strong> di menu atas, klik <strong>"Add Key"</strong> -&gt; <strong>"Create new key"</strong>.</li>
                <li>Pilih format <strong>JSON</strong> dan unduh file key tersebut ke komputer Anda.</li>
                <li>Buka file JSON tersebut untuk mendapatkan nilai <code>client_email</code> dan <code>private_key</code>.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800 text-[11px] border-b border-slate-200 pb-1 uppercase tracking-wide">2. Menghubungkan Google Sheet</p>
              <ul className="list-decimal pl-4 space-y-1.5">
                <li>Buat Google Spreadsheet kosong baru di akun Google Drive Anda.</li>
                <li>Salin <strong>Spreadsheet ID</strong> dari kolom URL browser Anda.</li>
                <li>Klik tombol <strong>"Bagikan" (Share)</strong> pada Spreadsheet tersebut di pojok kanan atas.</li>
                <li>Masukkan alamat email Service Account Anda (<code className="bg-slate-100 px-1 font-mono text-[10px]">...@gserviceaccount.com</code>) sebagai <strong>Editor</strong>, lalu klik Simpan.</li>
                <li>Masukkan seluruh data ke form di atas, lalu klik <strong>Simpan & Hubungkan</strong> dan jalankan <strong>Inisialisasi Spreadsheet</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
