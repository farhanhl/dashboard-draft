'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  authenticateQA,
  createSession,
  deleteSession,
  hashPassword,
  getCurrentUser
} from '@/lib/auth';
import {
  getGoogleConfig,
  saveGoogleConfig,
  testGoogleConnection,
  initializeSpreadsheet,
  appendSheetRow,
  readSheetRows,
  GoogleConfig,
  getGoogleConnections,
  addOrUpdateGoogleConnection,
  activateGoogleConnection,
  deleteGoogleConnection,
  GoogleConnection
} from '@/lib/google-sheets';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password harus diisi.' };
  }

  // Selalu izinkan login dengan kredensial default admin@qa.com / admin123
  if (email.toLowerCase() === 'admin@qa.com' && password === 'admin123') {
    await createSession({
      id: 'user_admin_qa_1',
      email: 'admin@qa.com',
      name: 'Admin QA TIM 3',
      role: 'QA'
    });
    revalidatePath('/', 'layout');
    redirect('/');
  }

  // First, verify Google Sheets config is present
  const config = await getGoogleConfig();
  if (!config) {
    return { error: 'Integrasi Google Sheets belum dikonfigurasi. Silakan hubungi administrator.' };
  }

  const result = await authenticateQA(email, password);
  if (!result.success || !result.user) {
    return { error: result.error || 'Login gagal.' };
  }

  await createSession(result.user);

  // Revalidate to update sidebar status
  revalidatePath('/', 'layout');
  redirect('/');
}

// 2. Logout Action
export async function logoutAction() {
  await deleteSession();
  revalidatePath('/', 'layout');
  redirect('/login');
}

// 3. Save & Test Connection Action
export async function updateGoogleConfigAction(formData: FormData) {
  const spreadsheetId = formData.get('spreadsheetId') as string;
  const clientEmail = formData.get('clientEmail') as string;
  const privateKey = formData.get('privateKey') as string;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return { success: false, error: 'Semua field wajib diisi.' };
  }

  const config: GoogleConfig = {
    spreadsheetId,
    clientEmail,
    privateKey,
  };

  // Test connection first
  const testRes = await testGoogleConnection(config);
  if (!testRes.success) {
    return { success: false, error: `Koneksi gagal: ${testRes.error}` };
  }

  // Save if success
  try {
    saveGoogleConfig(config);
    revalidatePath('/', 'layout');
    return {
      success: true,
      message: `Berhasil tersambung ke "${testRes.spreadsheetTitle}". Konfigurasi disimpan.`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Test active connection or custom config
export async function testConnectionAction(configParam?: GoogleConfig) {
  const config = configParam || await getGoogleConfig();
  if (!config) {
    return { success: false, error: 'Google Sheets belum dikonfigurasi.' };
  }
  return await testGoogleConnection(config);
}

// 5. Initialize sheets and seed default QA user
export async function initializeSheetsAction() {
  const config = await getGoogleConfig();
  if (!config) {
    return { success: false, error: 'Google Sheets belum dikonfigurasi.' };
  }

  // Initialize spreadsheet structure
  const initRes = await initializeSpreadsheet(config);
  if (!initRes.success) {
    return { success: false, error: initRes.message };
  }

  // Seed default admin if Users table is empty
  try {
    const existingUsers = await readSheetRows<any>('users');
    if (existingUsers.length === 0) {
      const defaultUser = {
        id: 'user_admin_qa_1',
        email: 'admin@qa.com',
        password_hash: hashPassword('admin123'),
        name: 'Admin QA TIM 3',
        role: 'QA',
        created_at: new Date().toISOString(),
      };

      const seedRes = await appendSheetRow('users', defaultUser);
      if (seedRes) {
        return {
          success: true,
          message: 'Spreadsheet berhasil diinisialisasi. Default QA User telah dibuat: admin@qa.com / admin123'
        };
      }
    }
  } catch (error: any) {
    console.error('Failed to seed default user:', error);
  }

  return {
    success: true,
    message: 'Spreadsheet berhasil diinisialisasi dan siap digunakan.'
  };
}

// 6. Get all Google Connections Action
export async function getGoogleConnectionsAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }
  try {
    const list = await getGoogleConnections();
    return { success: true, connections: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Save or Update Google Connection Action
export async function saveGoogleConnectionAction(name: string, config: Omit<GoogleConfig, 'sheetNames'> & { id?: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  if (!name.trim() || !config.spreadsheetId.trim() || !config.clientEmail.trim() || !config.privateKey.trim()) {
    return { success: false, error: 'Semua field wajib diisi.' };
  }

  // Test connection first
  const testRes = await testGoogleConnection(config);
  if (!testRes.success) {
    return { success: false, error: `Koneksi gagal: ${testRes.error}` };
  }

  try {
    await addOrUpdateGoogleConnection({
      id: config.id,
      name,
      spreadsheetId: config.spreadsheetId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });
    revalidatePath('/', 'layout');
    return { success: true, message: 'Koneksi berhasil disimpan.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 8. Activate Google Connection Action
export async function activateGoogleConnectionAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const success = await activateGoogleConnection(id);
    if (success) {
      revalidatePath('/', 'layout');
      return { success: true, message: 'Koneksi berhasil diaktifkan.' };
    }
    return { success: false, error: 'Koneksi tidak ditemukan.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 9. Delete Google Connection Action
export async function deleteGoogleConnectionAction(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const success = await deleteGoogleConnection(id);
    if (success) {
      revalidatePath('/', 'layout');
      return { success: true, message: 'Koneksi berhasil dihapus.' };
    }
    return { success: false, error: 'Koneksi tidak ditemukan.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
