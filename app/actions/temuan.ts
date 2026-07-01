'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { appendSheetRow, appendSheetRows, updateSheetRow, deleteSheetRow, deleteSheetRows } from '@/lib/google-sheets';

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

export async function deleteTemuanSamplingsAction(rowIndices: number[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRows('temuanSampling', rowIndices);
  if (success) {
    revalidatePath('/temuan-sampling');
    revalidatePath('/');
    return { success: true, message: `Berhasil menghapus ${rowIndices.length} data temuan sampling.` };
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

export async function deleteTemuanEksternalsAction(rowIndices: number[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRows('temuanEksternal', rowIndices);
  if (success) {
    revalidatePath('/temuan-eksternal');
    revalidatePath('/');
    return { success: true, message: `Berhasil menghapus ${rowIndices.length} data temuan eksternal.` };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}

// Batch Import Temuan Sampling
export async function importTemuanSamplingAction(rows: Record<string, any>[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  if (rows.length === 0) {
    return { success: false, error: 'Tidak ada data untuk di-import.' };
  }

  const preparedRows = rows.map(row => ({
    ...row,
    id: row.id || `ts_${crypto.randomUUID()}`,
    created_at: row.created_at || new Date().toISOString(),
  }));

  const success = await appendSheetRows('temuanSampling', preparedRows);
  if (success) {
    revalidatePath('/temuan-sampling');
    revalidatePath('/');
    return { success: true, message: `Berhasil meng-import ${rows.length} data temuan sampling.` };
  } else {
    return { success: false, error: 'Gagal meng-import data ke Google Sheets.' };
  }
}

// Batch Import Temuan Eksternal
export async function importTemuanEksternalAction(rows: Record<string, any>[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  if (rows.length === 0) {
    return { success: false, error: 'Tidak ada data untuk di-import.' };
  }

  const preparedRows = rows.map(row => ({
    ...row,
    id: row.id || `te_${crypto.randomUUID()}`,
    created_at: row.created_at || new Date().toISOString(),
  }));

  const success = await appendSheetRows('temuanEksternal', preparedRows);
  if (success) {
    revalidatePath('/temuan-eksternal');
    revalidatePath('/');
    return { success: true, message: `Berhasil meng-import ${rows.length} data temuan eksternal.` };
  } else {
    return { success: false, error: 'Gagal meng-import data ke Google Sheets.' };
  }
}
