import crypto from 'crypto';
import { cookies } from 'next/headers';
import { readSheetRows } from './google-sheets';

const SESSION_COOKIE_NAME = 'qa_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Retrieve encryption key from env or fallback to a default (for development only)
const SESSION_SECRET = process.env.SESSION_SECRET || 'super-secret-qa-dashboard-session-key-32-chars';
// Ensure secret is exactly 32 bytes for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SESSION_SECRET).digest();

// 1. Password Hashing (PBKDF2 - Secure & standard, zero dependencies)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (error) {
    return false;
  }
}

// 2. Encryption and Decryption for Secure Session Cookies (AES-256-GCM)
export function encryptSession(payload: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  // Combine IV, encrypted payload, and Auth Tag into one hex string
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decryptSession(token: string): any | null {
  try {
    const [ivHex, encryptedHex, tagHex] = token.split(':');
    if (!ivHex || !encryptedHex || !tagHex) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('Session decryption failed:', error);
    return null;
  }
}

// 3. Next.js Server Actions / API helper for session management
export async function createSession(user: { id: string; email: string; name: string; role: string }) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const sessionData = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  };

  const encrypted = encryptSession(sessionData);
  const cookieStore = await cookies(); // Await cookies as required in Next.js 16
  
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return sessionData;
}

export async function deleteSession() {
  const cookieStore = await cookies(); // Await cookies as required in Next.js 16
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const cookieStore = await cookies(); // Await cookies as required in Next.js 16
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie || !sessionCookie.value) return null;
    
    const session = decryptSession(sessionCookie.value);
    if (!session) return null;
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await deleteSession();
      return null;
    }
    
    return {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
    };
  } catch (error) {
    return null;
  }
}

// 4. Authenticate QA User from Google Sheets Users table
export async function authenticateQA(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const users = await readSheetRows<any>('users');
    
    const user = users.find(u => String(u.email).toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, error: 'Email atau password salah.' };
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Email atau password salah.' };
    }

    if (user.role !== 'QA') {
      return { success: false, error: 'Akses ditolak. Hanya QA yang dapat login.' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'QA User',
        role: user.role,
      }
    };
  } catch (error: any) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Gagal menghubungi database Google Sheets.' };
  }
}
