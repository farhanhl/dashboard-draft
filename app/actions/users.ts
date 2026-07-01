'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { appendSheetRow, appendSheetRows, updateSheetRow, deleteSheetRow, deleteSheetRows, readSheetRows } from '@/lib/google-sheets';

// 1. Add or Update User
export async function saveUserAction(rowData: Record<string, any>) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, password, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  // Read current users to check for duplicate email
  const currentUsers = await readSheetRows<any>('users');
  const existingUser = currentUsers.find(
    u => String(u.email).toLowerCase() === String(cleanRow.email).toLowerCase()
  );

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    // Check if updating to a duplicate email of another row
    if (existingUser && Number(existingUser.__rowIndex) !== rowIndex) {
      return { success: false, error: 'Email sudah terdaftar untuk pengguna lain.' };
    }

    // Get current stored user to preserve password if not changed
    const userToEdit = currentUsers.find(u => Number(u.__rowIndex) === rowIndex);
    if (!userToEdit) return { success: false, error: 'Pengguna tidak ditemukan.' };

    const updateRecord = {
      ...userToEdit,
      email: cleanRow.email,
      name: cleanRow.name,
      role: cleanRow.role,
    };

    if (password) {
      updateRecord.password_hash = hashPassword(password);
    }

    success = await updateSheetRow('users', rowIndex, updateRecord);
  } else {
    // Inserting new user
    if (existingUser) {
      return { success: false, error: 'Email sudah terdaftar.' };
    }

    if (!password) {
      return { success: false, error: 'Password wajib diisi untuk pengguna baru.' };
    }

    const newRecord = {
      id: cleanRow.id || `user_${crypto.randomUUID()}`,
      email: cleanRow.email,
      name: cleanRow.name,
      role: cleanRow.role || 'QA',
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
    };

    success = await appendSheetRow('users', newRecord);
  }

  if (success) {
    revalidatePath('/users');
    return { success: true, message: 'Data pengguna berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

// 2. Reset Password Action
export async function resetPasswordAction(rowIndex: number, newPassword: string) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'Password baru minimal 4 karakter.' };
  }

  const currentUsers = await readSheetRows<any>('users');
  const userToEdit = currentUsers.find(u => Number(u.__rowIndex) === rowIndex);
  
  if (!userToEdit) return { success: false, error: 'Pengguna tidak ditemukan.' };

  const updateRecord = {
    ...userToEdit,
    password_hash: hashPassword(newPassword),
  };

  const success = await updateSheetRow('users', rowIndex, updateRecord);
  if (success) {
    revalidatePath('/users');
    return { success: true, message: 'Password berhasil di-reset.' };
  } else {
    return { success: false, error: 'Gagal mereset password di Google Sheets.' };
  }
}

// 3. Delete User Action
export async function deleteUserAction(rowIndex: number, userIdToDelete: string) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  // Prevent deleting oneself
  if (admin.id === userIdToDelete) {
    return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' };
  }

  const success = await deleteSheetRow('users', rowIndex);
  if (success) {
    revalidatePath('/users');
    return { success: true, message: 'Pengguna berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus pengguna dari Google Sheets.' };
  }
}

// 3b. Batch Delete Users Action
export async function deleteUsersAction(rowIndices: number[], userIds: string[]) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'QA') {
    return { success: false, error: 'Akses ditolak.' };
  }

  // Prevent deleting oneself
  if (userIds.includes(admin.id)) {
    return { success: false, error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif dalam seleksi massal.' };
  }

  const success = await deleteSheetRows('users', rowIndices);
  if (success) {
    revalidatePath('/users');
    return { success: true, message: `Berhasil menghapus ${rowIndices.length} pengguna.` };
  } else {
    return { success: false, error: 'Gagal menghapus pengguna dari Google Sheets.' };
  }
}

// 4. Batch Import Users
export async function importUsersAction(rows: Record<string, any>[]) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  if (rows.length === 0) {
    return { success: false, error: 'Tidak ada data untuk di-import.' };
  }

  // Read current users to avoid duplicate email insertion
  const currentUsers = await readSheetRows<any>('users');
  const existingEmails = new Set(
    currentUsers.map(u => String(u.email).toLowerCase())
  );

  const preparedRows: any[] = [];
  for (const row of rows) {
    if (!row.email) continue;
    
    // Check if duplicate email in existing db or within the imported sheet
    const emailLower = String(row.email).toLowerCase();
    if (existingEmails.has(emailLower)) continue;
    existingEmails.add(emailLower);

    const password = row.password || 'user123';
    
    preparedRows.push({
      id: row.id || `user_${crypto.randomUUID()}`,
      email: row.email,
      name: row.name || emailLower.split('@')[0],
      role: row.role || 'QA',
      password_hash: hashPassword(password),
      created_at: row.created_at || new Date().toISOString(),
    });
  }

  if (preparedRows.length === 0) {
    return { success: false, error: 'Semua pengguna dalam list sudah terdaftar.' };
  }

  const success = await appendSheetRows('users', preparedRows);
  if (success) {
    revalidatePath('/users');
    return { success: true, message: `Berhasil meng-import ${preparedRows.length} pengguna baru.` };
  } else {
    return { success: false, error: 'Gagal meng-import pengguna ke Google Sheets.' };
  }
}
