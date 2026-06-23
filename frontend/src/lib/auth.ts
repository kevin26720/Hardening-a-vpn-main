import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'soc_session';

// Derive a 32-byte encryption key from the cookie secret
function getEncryptionKey(): Buffer {
  const secret = process.env.LOGTO_COOKIE_SECRET || 'complex_password_at_least_32_characters_long';
  return crypto.scryptSync(secret, 'soc-salt', 32);
}

// Encrypt payload using AES-256-GCM
function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

// Decrypt payload using AES-256-GCM
function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':');
  
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error('Invalid ciphertext format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = decipher.update(encrypted);
  const finalDecrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return finalDecrypted.toString('utf8');
}

// Cache for the M2M Access Token
let cachedToken: string | null = null;
let tokenExpiryTime = 0;

// Obtain M2M token to call Logto Management API
async function getManagementToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiryTime - 60) {
    return cachedToken;
  }

  const endpoint = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
  const clientId = process.env.LOGTO_M2M_APP_ID;
  const clientSecret = process.env.LOGTO_M2M_APP_SECRET;

  if (!clientId || !clientSecret || clientId === 'placeholder_m2m_app_id_change_this' || clientSecret === 'placeholder_m2m_app_secret_change_this') {
    throw new Error('M2M client credentials are not configured. Please create an M2M app in the Logto Console (http://localhost:3002) and update your .env file.');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  console.log(`[M2M Token] Fetching token from ${endpoint}/oidc/token`);
  const response = await fetch(`${endpoint}/oidc/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      resource: 'https://default.logto.app/api',
      scope: 'all',
    }).toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes('invalid_client') || response.status === 400) {
      throw new Error('Invalid Logto M2M credentials. Check your LOGTO_M2M_APP_ID and LOGTO_M2M_APP_SECRET settings in .env.');
    }
    throw new Error(`Failed to connect to authentication server: ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiryTime = now + (data.expires_in || 3600);
  console.log('[M2M Token] Successfully retrieved new token');
  if (!cachedToken) {
    throw new Error('Logto token response did not contain access_token');
  }
  return cachedToken;
}

// Find a user by primary email
export async function findUserByEmail(email: string) {
  const endpoint = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
  const token = await getManagementToken();

  const url = `${endpoint}/api/users?search.primaryEmail=${encodeURIComponent(email)}&mode.primaryEmail=exact`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("M2M App lacks permissions. Go to Logto Console (http://localhost:3002) > Applications > your M2M app > 'Roles' tab, and assign the 'Logto Management API access' role.");
    }
    const errorText = await response.text();
    throw new Error(`Failed to query user: ${response.statusText} - ${errorText}`);
  }

  const users = await response.json();
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }
  return users[0];
}

// Verify a user's password
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const endpoint = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
  const token = await getManagementToken();

  const url = `${endpoint}/api/users/${userId}/password/verify`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
    cache: 'no-store',
  });

  if (response.status === 403) {
    throw new Error("M2M App lacks permissions. Go to Logto Console (http://localhost:3002) > Applications > your M2M app > 'Roles' tab, and assign the 'Logto Management API access' role.");
  }

  if (response.status === 204) {
    return true;
  }

  console.log(`[Password Verification] Failed with status code: ${response.status}`);
  return false;
}

// Create a new user (registration)
export async function createUser(email: string, password: string) {
  const endpoint = process.env.LOGTO_ENDPOINT || 'http://localhost:3001';
  const token = await getManagementToken();

  const url = `${endpoint}/api/users`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      primaryEmail: email,
      password: password,
    }),
    cache: 'no-store',
  });

  if (response.ok) {
    return await response.json();
  }

  if (response.status === 403) {
    throw new Error("M2M App lacks permissions. Go to Logto Console (http://localhost:3002) > Applications > your M2M app > 'Roles' tab, and assign the 'Logto Management API access' role.");
  }

  const errorText = await response.text();
  let errorMessage = 'Failed to create operator profile';
  try {
    const errorJson = JSON.parse(errorText);
    if (errorJson.code === 'email_already_exists' || errorJson.code === 'user.email_already_exists' || errorJson.message?.includes('already exists')) {
      errorMessage = 'Operator identity (email) is already registered';
    } else if (errorJson.message) {
      errorMessage = errorJson.message;
    }
  } catch (_) {}

  throw new Error(errorMessage);
}

// Session cookie helper functions
export async function setSessionCookie(userClaims: { sub: string; email: string; name?: string }) {
  const sessionData = {
    ...userClaims,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour session
  };

  const encrypted = encrypt(JSON.stringify(sessionData));
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie || !cookie.value) return null;

    const decrypted = decrypt(cookie.value);
    const session = JSON.parse(decrypted);

    const now = Math.floor(Date.now() / 1000);
    if (session.exp && now > session.exp) {
      return null; // Expired
    }

    return session;
  } catch (error) {
    console.error('Failed to parse or decrypt session:', error);
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
