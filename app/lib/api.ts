export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby5_UsCuFjJE6WGy4KhQxT6vXh3V9oy7HdOtPgbIGy9DfvqEk22_g7lSHk7n9phj0oRuA/exec'; // TODO: Replace with actual URL

export interface CertificateData {
  email: string;
  name: string;
  issue_date: string;
  issued_for: string;
}

export interface Certificate extends CertificateData {
  cert_id: string;
  status: string;
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  data?: Certificate;
  uploaded?: any[];
}

export async function uploadCertificate(data: CertificateData) {
  const payload = encodeURIComponent(JSON.stringify(data));
  const url = `${WEB_APP_URL}?mode=upload&payload=${payload}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json();
    return json as ApiResponse;
  } catch (error) {
    console.error('Upload error:', error);
    return { status: 'error', message: 'Network error' } as ApiResponse;
  }
}

export async function verifyCertificate(id: string) {
  const url = `${WEB_APP_URL}?id=${id}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json();
    return json as ApiResponse;
  } catch (error) {
    console.error('Verification error:', error);
    return { status: 'error', message: 'Network error' } as ApiResponse;
  }
}
