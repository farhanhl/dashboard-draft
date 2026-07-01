'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { appendSheetRow, appendSheetRows, updateSheetRow, deleteSheetRow, deleteSheetRows } from '@/lib/google-sheets';

// 1. Save or Update Scores
export async function saveNilaiKualitasAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    // Update existing row
    success = await updateSheetRow('nilaiKualitas', rowIndex, cleanRow);
  } else {
    // Insert new row
    success = await appendSheetRow('nilaiKualitas', cleanRow);
  }

  if (success) {
    revalidatePath('/nilai-kualitas');
    return { success: true, message: 'Data nilai kualitas berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

// 2. Delete Petugas row
export async function deleteNilaiKualitasAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('nilaiKualitas', rowIndex);
  if (success) {
    revalidatePath('/nilai-kualitas');
    return { success: true, message: 'Data nilai kualitas berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}

// 2b. Batch Delete Petugas rows
export async function deleteNilaiKualitasesAction(rowIndices: number[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRows('nilaiKualitas', rowIndices);
  if (success) {
    revalidatePath('/nilai-kualitas');
    return { success: true, message: `Berhasil menghapus ${rowIndices.length} data nilai kualitas.` };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}

// 3. Batch Import Scores
export async function importNilaiKualitasAction(rows: Record<string, any>[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  if (rows.length === 0) {
    return { success: false, error: 'Tidak ada data untuk di-import.' };
  }

  const success = await appendSheetRows('nilaiKualitas', rows);
  if (success) {
    revalidatePath('/nilai-kualitas');
    return { success: true, message: `Berhasil meng-import ${rows.length} data nilai kualitas.` };
  } else {
    return { success: false, error: 'Gagal meng-import data ke Google Sheets.' };
  }
}
