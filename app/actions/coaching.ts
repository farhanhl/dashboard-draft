'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { appendSheetRow, appendSheetRows, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';

export async function saveCoachingAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    success = await updateSheetRow('coaching', rowIndex, cleanRow);
  } else {
    const newRecord = {
      ...cleanRow,
      id: cleanRow.id || `co_${crypto.randomUUID()}`,
      created_at: cleanRow.created_at || new Date().toISOString(),
    };
    success = await appendSheetRow('coaching', newRecord);
  }

  if (success) {
    revalidatePath('/coaching');
    return { success: true, message: 'Data riwayat coaching berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

export async function deleteCoachingAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('coaching', rowIndex);
  if (success) {
    revalidatePath('/coaching');
    return { success: true, message: 'Data riwayat coaching berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}

// Batch Import Coaching
export async function importCoachingAction(rows: Record<string, any>[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  if (rows.length === 0) {
    return { success: false, error: 'Tidak ada data untuk di-import.' };
  }

  const preparedRows = rows.map(row => ({
    ...row,
    id: row.id || `co_${crypto.randomUUID()}`,
    created_at: row.created_at || new Date().toISOString(),
  }));

  const success = await appendSheetRows('coaching', preparedRows);
  if (success) {
    revalidatePath('/coaching');
    return { success: true, message: `Berhasil meng-import ${rows.length} data riwayat coaching.` };
  } else {
    return { success: false, error: 'Gagal meng-import data ke Google Sheets.' };
  }
}
