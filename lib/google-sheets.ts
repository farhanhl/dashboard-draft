import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// File path for storing Google Sheets credentials locally
const CREDENTIALS_DIR = path.join(process.cwd(), 'config');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'google-credentials.json');

export interface GoogleConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  sheetNames?: {
    config?: string;
    users?: string;
    nilaiKualitas?: string;
    temuanSampling?: string;
    temuanEksternal?: string;
    surveyKepuasan?: string;
    listTicketSampling?: string;
    coaching?: string;
  };
}

const DEFAULT_SHEET_NAMES = {
  config: 'Config',
  users: 'Users',
  nilaiKualitas: 'Nilai Kualitas',
  temuanSampling: 'Temuan Sampling',
  temuanEksternal: 'Temuan Eksternal',
  surveyKepuasan: 'Survey Kepuasan',
  listTicketSampling: 'List Ticket Sampling',
  coaching: 'Riwayat Coaching',
};

// 1. Get Google Credentials from local config or environment variables
export function getGoogleConfig(): GoogleConfig | null {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const fileData = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      return {
        spreadsheetId: parsed.spreadsheetId || '',
        clientEmail: parsed.clientEmail || '',
        privateKey: parsed.privateKey || '',
        sheetNames: { ...DEFAULT_SHEET_NAMES, ...(parsed.sheetNames || {}) },
      };
    }
  } catch (error) {
    console.error('Error reading credentials file:', error);
  }

  // Fallback to environment variables
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (spreadsheetId && clientEmail && privateKey) {
    // Handle newline formatting in environment variable keys
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      spreadsheetId,
      clientEmail,
      privateKey,
      sheetNames: DEFAULT_SHEET_NAMES,
    };
  }

  return null;
}

// Helper to sanitize private key formatting (removes spacing/newline issues)
export function cleanPrivateKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/\\n/g, '\n')      // Replace literal '\n' text with actual newlines
    .split(/\r?\n/)            // Split by any newline characters
    .map(line => line.trim())   // Trim leading/trailing whitespace from each line
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n');                // Rejoin with actual newlines
}

// 2. Save Google Credentials to local config
export function saveGoogleConfig(config: GoogleConfig): void {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    
    // Ensure the private key is fully cleaned and sanitized
    const formattedConfig = {
      spreadsheetId: config.spreadsheetId.trim(),
      clientEmail: config.clientEmail.trim(),
      privateKey: cleanPrivateKey(config.privateKey),
      sheetNames: config.sheetNames || DEFAULT_SHEET_NAMES,
    };

    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(formattedConfig, null, 2), 'utf-8');
  } catch (error: any) {
    console.error('Error saving credentials file:', error);
    throw new Error(`Gagal menyimpan berkas konfigurasi Google: ${error.message || error}`);
  }
}

// 3. Authenticate with Google Sheets API
export async function getSheetsClient(config: GoogleConfig) {
  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: cleanPrivateKey(config.privateKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// 4. Test Google Sheets Connection
export async function testGoogleConnection(config: GoogleConfig): Promise<{ 
  success: boolean; 
  spreadsheetTitle?: string; 
  isInitialized?: boolean; 
  error?: string 
}> {
  try {
    const sheets = await getSheetsClient(config);
    const response = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
    });
    
    // Verify if all required sheets exist
    const existingSheets = response.data.sheets?.map(s => s.properties?.title || '') || [];
    const sheetNamesMap = config.sheetNames || DEFAULT_SHEET_NAMES;
    let isInitialized = true;
    
    for (const key of Object.keys(DEFAULT_SHEET_NAMES)) {
      const actualTitle = sheetNamesMap[key as keyof typeof DEFAULT_SHEET_NAMES] || DEFAULT_SHEET_NAMES[key as keyof typeof DEFAULT_SHEET_NAMES];
      if (!existingSheets.includes(actualTitle)) {
        isInitialized = false;
        break;
      }
    }

    return {
      success: true,
      spreadsheetTitle: response.data.properties?.title || 'Google Sheet',
      isInitialized,
    };
  } catch (error: any) {
    console.error('Connection test error:', error);
    return {
      success: false,
      error: error.message || 'Koneksi gagal.',
    };
  }
}

// 5. Read all rows from a sheet, mapping headers to object keys
export async function readSheetRows<T = Record<string, string>>(sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES): Promise<T[]> {
  const config = getGoogleConfig();
  if (!config) return [];

  const actualSheetName = config.sheetNames?.[sheetNameKey] || DEFAULT_SHEET_NAMES[sheetNameKey];

  try {
    const sheets = await getSheetsClient(config);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A1:ZZ10000`, // Read first 10000 rows
    });

    const values = response.data.values;
    if (!values || values.length === 0) return [];

    const headers = values[0] as string[];
    const rows: T[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj: any = {};
      
      // Keep track of row index in Google Sheets (1-based, plus 1 because A1 is header)
      // This is crucial for updating/deleting rows later
      obj.__rowIndex = i + 1;

      headers.forEach((header, index) => {
        const val = row[index];
        obj[header] = val !== undefined && val !== null ? val : '';
      });

      rows.push(obj as T);
    }

    return rows;
  } catch (error: any) {
    const isRangeError = error?.message?.includes('Unable to parse range') || error?.code === 400;
    if (isRangeError) {
      console.warn(`[Google Sheets API] Sheet "${actualSheetName}" belum diinisialisasi.`);
    } else {
      console.error(`Error reading sheet "${actualSheetName}":`, error);
    }
    return [];
  }
}

// 6. Append a new row to a sheet
export async function appendSheetRow(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowData: Record<string, any>
): Promise<boolean> {
  const config = getGoogleConfig();
  if (!config) return false;

  const actualSheetName = config.sheetNames?.[sheetNameKey] || DEFAULT_SHEET_NAMES[sheetNameKey];

  try {
    const sheets = await getSheetsClient(config);
    
    // First, read headers to ensure columns match correctly
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A1:ZZ1`,
    });

    const headers = headerResponse.data.values?.[0] as string[];
    if (!headers || headers.length === 0) {
      throw new Error(`Sheet ${actualSheetName} tidak memiliki header.`);
    }

    // Align rowData with the sheet's header columns
    const rowValues = headers.map(header => {
      const val = rowData[header];
      if (val === undefined || val === null) return '';
      // Convert boolean to TRUE/FALSE strings for Google Sheets checkbox/formulas
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return String(val);
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error appending to sheet "${actualSheetName}":`, error);
    return false;
  }
}

// 7. Update an existing row in a sheet using __rowIndex
export async function updateSheetRow(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowIndex: number,
  rowData: Record<string, any>
): Promise<boolean> {
  const config = getGoogleConfig();
  if (!config || !rowIndex || rowIndex < 2) return false;

  const actualSheetName = config.sheetNames?.[sheetNameKey] || DEFAULT_SHEET_NAMES[sheetNameKey];

  try {
    const sheets = await getSheetsClient(config);

    // Read headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A1:ZZ1`,
    });

    const headers = headerResponse.data.values?.[0] as string[];
    if (!headers || headers.length === 0) return false;

    // Align rowData with the sheet's header columns
    const rowValues = headers.map(header => {
      const val = rowData[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return String(val);
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A${rowIndex}:ZZ${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error updating row ${rowIndex} in sheet "${actualSheetName}":`, error);
    return false;
  }
}

// 8. Delete an existing row by clearing its contents or deleting the row range
export async function deleteSheetRow(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowIndex: number
): Promise<boolean> {
  const config = getGoogleConfig();
  if (!config || !rowIndex || rowIndex < 2) return false;

  const actualSheetName = config.sheetNames?.[sheetNameKey] || DEFAULT_SHEET_NAMES[sheetNameKey];

  try {
    const sheets = await getSheetsClient(config);

    // Get spreadsheet details to find sheetId
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      s => s.properties?.title === actualSheetName
    );

    if (!sheet || sheet.properties?.sheetId === undefined) {
      throw new Error(`Sheet ${actualSheetName} tidak ditemukan.`);
    }

    const sheetId = sheet.properties.sheetId;

    // Delete row using batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-indexed, start index is inclusive
                endIndex: rowIndex, // end index is exclusive
              },
            },
          },
        ],
      },
    });

    return true;
  } catch (error) {
    console.error(`Error deleting row ${rowIndex} in sheet "${actualSheetName}":`, error);
    return false;
  }
}

// 9. Initialize Spreadsheet: Create sheets and write default headers
export async function initializeSpreadsheet(config: GoogleConfig): Promise<{ success: boolean; message: string }> {
  try {
    const sheets = await getSheetsClient(config);

    // Get spreadsheet info to check existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
    });

    const existingSheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    const sheetNamesMap = config.sheetNames || DEFAULT_SHEET_NAMES;

    // Define structure for headers
    const structures: Record<keyof typeof DEFAULT_SHEET_NAMES, string[]> = {
      config: ['key', 'value'],
      users: ['id', 'email', 'password_hash', 'name', 'role', 'created_at'],
      nilaiKualitas: ['petugas_name', 'year', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
      temuanSampling: [
        'id', 'petugas_name', 'tanggal_transaksi', 'tanggal_sampling',
        'etika_salam', 'etika_ramah', 'etika_bahasa',
        'keterampilan_menulis', 'keterampilan_analisis',
        'prosedur_informasi', 'prosedur_proses', 'prosedur_tiket',
        'temuan', 'rekomendasi', 'week', 'created_at'
      ],
      temuanEksternal: ['id', 'petugas_name', 'kode_tiket', 'tanggal_temuan', 'sumber', 'risiko', 'keterangan_temuan', 'rekomendasi', 'created_at'],
      surveyKepuasan: ['petugas_name', 'year', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
      listTicketSampling: ['petugas_name', 'category', 'year', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
      coaching: ['id', 'petugas_name', 'bulan', 'temuan', 'rekomendasi', 'created_at'],
    };

    const requests: any[] = [];
    const updateHeaderTasks: Array<{ title: string; headers: string[] }> = [];

    for (const [key, defaultTitle] of Object.entries(DEFAULT_SHEET_NAMES)) {
      const actualTitle = sheetNamesMap[key as keyof typeof DEFAULT_SHEET_NAMES] || defaultTitle;
      const headers = structures[key as keyof typeof DEFAULT_SHEET_NAMES];

      if (!existingSheetNames.includes(actualTitle)) {
        requests.push({
          addSheet: {
            properties: {
              title: actualTitle,
            },
          },
        });
        updateHeaderTasks.push({ title: actualTitle, headers });
      } else {
        // If sheet exists, verify if headers are present
        updateHeaderTasks.push({ title: actualTitle, headers });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.spreadsheetId,
        requestBody: { requests },
      });
    }

    // Now write headers (using USER_ENTERED so they are clean text)
    for (const task of updateHeaderTasks) {
      // Check if sheet has headers already
      const currentHeaderRes = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `${task.title}!A1:ZZ1`,
      });

      const currentHeaders = currentHeaderRes.data.values?.[0];
      if (!currentHeaders || currentHeaders.length === 0) {
        // Write headers since they are missing
        await sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId,
          range: `${task.title}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [task.headers],
          },
        });
      }
    }

    return {
      success: true,
      message: 'Spreadsheet berhasil diinisialisasi dengan struktur sheet yang benar.',
    };
  } catch (error: any) {
    console.error('Initialization error:', error);
    return {
      success: false,
      message: error.message || 'Gagal menginisialisasi spreadsheet.',
    };
  }
}
