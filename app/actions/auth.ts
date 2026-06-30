'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { 
  authenticateQA, 
  createSession, 
  deleteSession, 
  hashPassword 
} from '@/lib/auth';
import { 
  getGoogleConfig, 
  saveGoogleConfig, 
  testGoogleConnection, 
  initializeSpreadsheet,
  appendSheetRow,
  readSheetRows,
  GoogleConfig
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
      name: 'Admin QA TIM 3 (Default Fallback)',
      role: 'QA'
    });
    revalidatePath('/', 'layout');
    redirect('/');
  }

  // First, verify Google Sheets config is present
  const config = getGoogleConfig();
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
  const config = configParam || getGoogleConfig();
  if (!config) {
    return { success: false, error: 'Google Sheets belum dikonfigurasi.' };
  }
  return await testGoogleConnection(config);
}

// 5. Initialize sheets and seed default QA user
export async function initializeSheetsAction() {
  const config = getGoogleConfig();
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
