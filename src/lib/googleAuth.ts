import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');
// Force consent prompt so users are prompted to approve new Drive scopes
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

// Cache the access token in memory
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In Firebase Auth, if page refreshes, the token might need to be re-fetched.
      // But we can check if we have cachedAccessToken. If not, we can trigger signInWithPopup or ask the user to sign in.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If there's a Firebase user but no cached access token in memory (e.g. page refresh),
        // we can flag that they need to click Sign In again to grab a fresh access token, or handle it gracefully.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve current cached access token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Sign out from Firebase and clear token
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// List files from Google Drive
export const listFiles = async (searchQuery?: string): Promise<any[]> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Akses Google Drive belum terotorisasi. Silakan masuk kembali.");
  }

  // Find files that are not trashed and match name/extension criteria
  let q = "trashed = false";
  if (searchQuery) {
    q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)&pageSize=50`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Gagal mengambil daftar file dari Google Drive.");
  }

  const data = await response.json();
  const rawFiles = data.files || [];

  // Filter keeping only sheets, spreadsheets, CSVs, JSON, and DAT files
  return rawFiles.filter((file: any) => {
    const nameLower = file.name.toLowerCase();
    const isMimeTypeSupported = 
      file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimeType === 'application/vnd.ms-excel' ||
      file.mimeType === 'text/csv' ||
      file.mimeType === 'text/comma-separated-values' ||
      file.mimeType === 'application/json' ||
      file.mimeType === 'text/plain';
      
    const isExtensionSupported = 
      nameLower.endsWith('.xlsx') || 
      nameLower.endsWith('.xls') || 
      nameLower.endsWith('.csv') || 
      nameLower.endsWith('.json') || 
      nameLower.endsWith('.dat');

    return isMimeTypeSupported || isExtensionSupported;
  });
};

// Download file contents from Google Drive
export const downloadFile = async (fileId: string, mimeType?: string): Promise<ArrayBuffer> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Akses Google Drive belum terotorisasi. Silakan masuk kembali.");
  }

  const isGoogleSheet = mimeType === 'application/vnd.google-apps.spreadsheet';
  const url = isGoogleSheet
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Gagal mengunduh isi berkas dari Google Drive.");
  }

  return await response.arrayBuffer();
};

// Get file metadata from Google Drive
export const getFileMetadata = async (fileId: string): Promise<any> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Akses Google Drive belum terotorisasi. Silakan masuk kembali.");
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Gagal mengambil informasi berkas dari Google Drive.");
  }

  return await response.json();
};

// Upload file to Google Drive using multipart upload
export const uploadFile = async (blob: Blob, name: string, mimeType: string): Promise<any> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Akses Google Drive belum terotorisasi. Silakan masuk kembali.");
  }

  const metadata = {
    name: name,
    mimeType: mimeType
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', blob);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Gagal mengunggah laporan ke Google Drive.");
  }

  return await response.json();
};
