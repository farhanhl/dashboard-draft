import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

// File path for storing Google Sheets credentials locally
const CREDENTIALS_DIR = path.join(process.cwd(), 'config');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'google-credentials.json');
const CONNECTIONS_FILE = path.join(CREDENTIALS_DIR, 'google-connections.json');

export interface GoogleConfig {
  name?: string;
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

export interface GoogleConnection {
  id: string;
  name: string;
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  active: boolean;
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
export async function getGoogleConfig(): Promise<GoogleConfig | null> {
  // 1. Try reading from Supabase first (for dynamic Vercel persistence)
  try {
    const { data, error } = await supabase
      .from('google_connections')
      .select('*')
      .eq('active', true)
      .limit(1);

    if (!error && data && data.length > 0) {
      const active = data[0];
      return {
        name: active.name,
        spreadsheetId: active.spreadsheet_id,
        clientEmail: active.client_email,
        privateKey: active.private_key,
        sheetNames: DEFAULT_SHEET_NAMES,
      };
    }
  } catch (error) {
    console.error('Supabase fetching active config error:', error);
  }

  // 2. Fallback to local config file (for local development)
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const fileData = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      return {
        name: parsed.name || 'Koneksi Lokal',
        spreadsheetId: parsed.spreadsheetId || '',
        clientEmail: parsed.clientEmail || '',
        privateKey: parsed.privateKey || '',
        sheetNames: { ...DEFAULT_SHEET_NAMES, ...(parsed.sheetNames || {}) },
      };
    }
  } catch (error) {
    console.error('Error reading credentials file:', error);
  }

  // 3. Fallback to environment variables
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (spreadsheetId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    return {
      name: 'Env Variables',
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

// Get all saved connections
export async function getGoogleConnections(): Promise<GoogleConnection[]> {
  try {
    const { data, error } = await supabase
      .from('google_connections')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        name: d.name,
        spreadsheetId: d.spreadsheet_id,
        clientEmail: d.client_email,
        privateKey: d.private_key,
        active: d.active
      }));
    }
  } catch (error) {
    console.error('Error reading connections from Supabase:', error);
  }

  // Fallback: If Supabase fails or is empty, try reading local connections file
  try {
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const fileData = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      return JSON.parse(fileData);
    }
  } catch (error) {
    console.error('Error reading connections file:', error);
  }

  // Fallback 2: If local connections file does not exist, but credentials file exists,
  // import it as the first active connection.
  const activeConfig = await getGoogleConfig();
  if (activeConfig) {
    const fallbackConn: GoogleConnection = {
      id: 'conn_default',
      name: 'Koneksi Utama',
      spreadsheetId: activeConfig.spreadsheetId,
      clientEmail: activeConfig.clientEmail,
      privateKey: activeConfig.privateKey,
      active: true,
    };
    
    // Try to save to Supabase
    try {
      await supabase.from('google_connections').upsert({
        id: fallbackConn.id,
        name: fallbackConn.name,
        spreadsheet_id: fallbackConn.spreadsheetId,
        client_email: fallbackConn.clientEmail,
        private_key: fallbackConn.privateKey,
        active: fallbackConn.active
      });
    } catch (e) {}

    // Save locally
    try {
      if (!fs.existsSync(CREDENTIALS_DIR)) {
        fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
      }
      fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify([fallbackConn], null, 2), 'utf-8');
    } catch (e) {}

    return [fallbackConn];
  }

  return [];
}

// Save a connection (add or update)
export async function addOrUpdateGoogleConnection(conn: Omit<GoogleConnection, 'id' | 'active'> & { id?: string }): Promise<GoogleConnection> {
  const id = conn.id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const cleanedKey = cleanPrivateKey(conn.privateKey);

  const connections = await getGoogleConnections();
  const existingConn = connections.find(c => c.id === id);
  const isNew = !existingConn;

  let active = false;
  if (isNew) {
    active = connections.length === 0;
  } else {
    active = existingConn.active;
  }

  const newOrUpdatedConn: GoogleConnection = {
    id,
    name: conn.name.trim(),
    spreadsheetId: conn.spreadsheetId.trim(),
    clientEmail: conn.clientEmail.trim(),
    privateKey: cleanedKey,
    active,
  };

  // Upsert to Supabase
  try {
    await supabase.from('google_connections').upsert({
      id,
      name: newOrUpdatedConn.name,
      spreadsheet_id: newOrUpdatedConn.spreadsheetId,
      client_email: newOrUpdatedConn.clientEmail,
      private_key: newOrUpdatedConn.privateKey,
      active
    });

    if (active) {
      // Deactivate other connections in Supabase
      await supabase
        .from('google_connections')
        .update({ active: false })
        .neq('id', id);
    }
  } catch (error) {
    console.error('Error saving connection to Supabase:', error);
  }

  // Fallback/Local write too
  try {
    const localConns = connections.filter(c => c.id !== id);
    localConns.push(newOrUpdatedConn);
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(localConns, null, 2), 'utf-8');

    if (active) {
      saveGoogleConfig({
        spreadsheetId: newOrUpdatedConn.spreadsheetId,
        clientEmail: newOrUpdatedConn.clientEmail,
        privateKey: newOrUpdatedConn.privateKey,
      });
    }
  } catch (error) {
    console.error('Error writing local files:', error);
  }

  return newOrUpdatedConn;
}

// Activate a connection
export async function activateGoogleConnection(id: string): Promise<boolean> {
  try {
    // Mark target as active
    await supabase
      .from('google_connections')
      .update({ active: true })
      .eq('id', id);

    // Mark others as inactive
    await supabase
      .from('google_connections')
      .update({ active: false })
      .neq('id', id);
  } catch (error) {
    console.error('Error activating connection in Supabase:', error);
  }

  const connections = await getGoogleConnections();
  const targetConn = connections.find(c => c.id === id);
  if (!targetConn) return false;

  // Local update fallback
  try {
    connections.forEach(c => {
      c.active = c.id === id;
    });
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2), 'utf-8');

    saveGoogleConfig({
      spreadsheetId: targetConn.spreadsheetId,
      clientEmail: targetConn.clientEmail,
      privateKey: targetConn.privateKey,
    });
  } catch (error) {
    console.error('Error updating local active connection:', error);
  }

  return true;
}

// Delete a connection
export async function deleteGoogleConnection(id: string): Promise<boolean> {
  const connections = await getGoogleConnections();
  const targetConn = connections.find(c => c.id === id);
  if (!targetConn) return false;

  const wasActive = targetConn.active;

  try {
    await supabase
      .from('google_connections')
      .delete()
      .eq('id', id);
  } catch (error) {
    console.error('Error deleting connection from Supabase:', error);
  }

  const remaining = connections.filter(c => c.id !== id);

  if (wasActive && remaining.length > 0) {
    remaining[0].active = true;
    try {
      await supabase
        .from('google_connections')
        .update({ active: true })
        .eq('id', remaining[0].id);
    } catch (e) {}
  }

  // Local update fallback
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(remaining, null, 2), 'utf-8');

    if (wasActive && remaining.length > 0) {
      saveGoogleConfig({
        spreadsheetId: remaining[0].spreadsheetId,
        clientEmail: remaining[0].clientEmail,
        privateKey: remaining[0].privateKey,
      });
    } else if (remaining.length === 0) {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        fs.unlinkSync(CREDENTIALS_FILE);
      }
    }
  } catch (error) {
    console.error('Error writing local files after deletion:', error);
  }

  return true;
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
  const config = await getGoogleConfig();
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
  const config = await getGoogleConfig();
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

// 6b. Append multiple rows to a sheet in a single request
export async function appendSheetRows(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowsData: Record<string, any>[]
): Promise<boolean> {
  const config = await getGoogleConfig();
  if (!config || rowsData.length === 0) return false;

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

    // Align each rowData with the sheet's header columns
    const allRowValues = rowsData.map(rowData => {
      return headers.map(header => {
        const val = rowData[header];
        if (val === undefined || val === null) return '';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return String(val);
      });
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${actualSheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: allRowValues,
      },
    });

    return true;
  } catch (error) {
    console.error(`Error appending multiple rows to sheet "${actualSheetName}":`, error);
    return false;
  }
}

// 7. Update an existing row in a sheet using __rowIndex
export async function updateSheetRow(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowIndex: number,
  rowData: Record<string, any>
): Promise<boolean> {
  const config = await getGoogleConfig();
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
  const config = await getGoogleConfig();
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

// 8b. Delete multiple existing rows
export async function deleteSheetRows(
  sheetNameKey: keyof typeof DEFAULT_SHEET_NAMES,
  rowIndices: number[]
): Promise<boolean> {
  const config = await getGoogleConfig();
  if (!config || !rowIndices || rowIndices.length === 0) return false;

  const validIndices = rowIndices.filter(idx => idx >= 2);
  if (validIndices.length === 0) return false;

  // Sort indices in descending order to prevent shifting issues during deletion
  validIndices.sort((a, b) => b - a);

  const actualSheetName = config.sheetNames?.[sheetNameKey] || DEFAULT_SHEET_NAMES[sheetNameKey];

  try {
    const sheets = await getSheetsClient(config);

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

    const requests = validIndices.map(rowIndex => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: rowIndex - 1,
          endIndex: rowIndex,
        },
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: {
        requests,
      },
    });

    return true;
  } catch (error) {
    console.error(`Error deleting rows ${rowIndices.join(', ')} in sheet "${actualSheetName}":`, error);
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
