'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';

// --- SURVEY KEPUASAN ACTIONS ---

export async function saveSurveyKepuasanAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  // Normalize monthly values to TRUE/FALSE
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  months.forEach(m => {
    if (cleanRow[m] !== undefined) {
      cleanRow[m] = cleanRow[m] === true || String(cleanRow[m]).toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
    }
  });

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    success = await updateSheetRow('surveyKepuasan', rowIndex, cleanRow);
  } else {
    success = await appendSheetRow('surveyKepuasan', cleanRow);
  }

  if (success) {
    revalidatePath('/survey-kepuasan');
    return { success: true, message: 'Data checklist survey kepuasan berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

export async function deleteSurveyKepuasanAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('surveyKepuasan', rowIndex);
  if (success) {
    revalidatePath('/survey-kepuasan');
    return { success: true, message: 'Data checklist survey kepuasan berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}


// --- LIST TICKET SAMPLING ACTIONS ---

export async function saveTicketSamplingAction(rowData: Record<string, any>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const { __rowIndex, ...cleanRow } = rowData;
  const rowIndex = Number(__rowIndex);

  // Normalize monthly values to TRUE/FALSE
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  months.forEach(m => {
    if (cleanRow[m] !== undefined) {
      cleanRow[m] = cleanRow[m] === true || String(cleanRow[m]).toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
    }
  });

  let success = false;
  if (rowIndex && rowIndex >= 2) {
    success = await updateSheetRow('listTicketSampling', rowIndex, cleanRow);
  } else {
    success = await appendSheetRow('listTicketSampling', cleanRow);
  }

  if (success) {
    revalidatePath('/ticket-sampling');
    return { success: true, message: 'Data list ticket sampling berhasil disimpan.' };
  } else {
    return { success: false, error: 'Gagal menulis data ke Google Sheets.' };
  }
}

export async function deleteTicketSamplingAction(rowIndex: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'QA') {
    return { success: false, error: 'Akses ditolak. Anda bukan administrator.' };
  }

  const success = await deleteSheetRow('listTicketSampling', rowIndex);
  if (success) {
    revalidatePath('/ticket-sampling');
    return { success: true, message: 'Data list ticket sampling berhasil dihapus.' };
  } else {
    return { success: false, error: 'Gagal menghapus data di Google Sheets.' };
  }
}
