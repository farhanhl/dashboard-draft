import { toast } from "sonner";

/**
 * Extract the Google Sheet ID from a sharing URL.
 * Supports URLs like:
 *   https://docs.google.com/spreadsheets/d/<ID>/edit
 *   https://docs.google.com/spreadsheets/d/<ID>
 */
function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Given a public Google Sheet URL, fetch its CSV representation.
 * Returns an ArrayBuffer containing the CSV data.
 */
export async function fetchSheetCsv(sheetUrl: string): Promise<ArrayBuffer> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    toast.error('URL Google Sheet tidak valid.');
    throw new Error('Invalid Google Sheet URL');
  }
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await fetch(csvUrl);
  if (!response.ok) {
    toast.error('Gagal mengunduh CSV dari Google Sheet.');
    throw new Error('Failed to fetch CSV');
  }
  return await response.arrayBuffer();
}
