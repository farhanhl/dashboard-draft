'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';

// --- TEMUAN SAMPLING ACTIONS ---

export async function saveTemuanSamplingAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    // Update existing row
    success = await updateSheetRow('temuanSampling', rowIndex, cleanRow);
  } else {
    // Insert new row
    const newRecord = {
      ...cleanRow,
      id: cleanRow.id || `ts_${crypto.randomUUID()}`,
      created_at: cleanRow.created_at || new Date().toISOString(),
    };
    success = await appendSheetRow('temuanSampling', newRecord);
  }

  if (success) {
    revalidatePath('/temuan-sampling');
    revalidatePath('/');
    return { success: true, message: 'Data temuan sampling berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

export async function deleteTemuanSamplingAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('temuanSampling', rowIndex);
  if (success) {
    revalidatePath('/temuan-sampling');
    revalidatePath('/');
    return { success: true, message: 'Data temuan sampling berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}


// --- TEMUAN EKSTERNAL ACTIONS ---

export async function saveTemuanEksternalAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    // Update existing row
    success = await updateSheetRow('temuanEksternal', rowIndex, cleanRow);
  } else {
    // Insert new row
    const newRecord = {
      ...cleanRow,
      id: cleanRow.id || `te_${crypto.randomUUID()}`,
      created_at: cleanRow.created_at || new Date().toISOString(),
    };
    success = await appendSheetRow('temuanEksternal', newRecord);
  }

  if (success) {
    revalidatePath('/temuan-eksternal');
    revalidatePath('/');
    return { success: true, message: 'Data temuan eksternal berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

export async function deleteTemuanEksternalAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('temuanEksternal', rowIndex);
  if (success) {
    revalidatePath('/temuan-eksternal');
    revalidatePath('/');
    return { success: true, message: 'Data temuan eksternal berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}
