export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby5_UsCuFjJE6WGy4KhQxT6vXh3V9oy7HdOtPgbIGy9DfvqEk22_g7lSHk7n9phj0oRuA/exec'; // TODO: Replace with actual URL

export interface CertificateData {
  email: string;
  name: string;
  issue_date: string;
  certificate_title: string;
  template_drive_id?: string;
  output_folder_id?: string;
  name_font?: string;
  name_size?: number;
  name_color?: string;
  name_y_pos?: number;
  name_x_pos?: number;
  qr_x_pos?: number;
  qr_y_pos?: number;
  email_subject?: string;
  email_body?: string;
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
  template_drive_id?: string;
  output_folder_id?: string;
}

export async function uploadTemplate(file: File, eventName: string) {
  return new Promise<ApiResponse>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const payload = {
        mode: 'upload_template',
        image_data: base64,
        event_name: eventName
      };

      try {
        const res = await fetch(WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        resolve(json as ApiResponse);
      } catch (error) {
        console.error('Template upload error:', error);
        resolve({ status: 'error', message: 'Network error' } as ApiResponse);
      }
    };
    reader.onerror = (error) => reject(error);
  });
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
