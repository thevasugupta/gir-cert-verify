'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { uploadCertificate, CertificateData } from '@/app/lib/api';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setLogs([]);
            setProgress(0);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setLogs(prev => [...prev, 'Parsing CSV...']);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as CertificateData[];
                setLogs(prev => [...prev, `Found ${rows.length} rows. Starting upload...`]);

                let successCount = 0;
                let failCount = 0;

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    // Basic validation
                    if (!row.name || !row.issue_date || !row.issued_for) {
                        setLogs(prev => [...prev, `Row ${i + 1}: Skipped (Missing data)`]);
                        failCount++;
                        continue;
                    }

                    const res = await uploadCertificate(row);
                    if (res.status === 'success') {
                        successCount++;
                        // setLogs(prev => [...prev, `Row ${i + 1}: Uploaded (${row.name})`]); // Too verbose for many rows
                    } else {
                        failCount++;
                        setLogs(prev => [...prev, `Row ${i + 1}: Failed - ${res.message}`]);
                    }

                    setProgress(Math.round(((i + 1) / rows.length) * 100));
                }

                setLogs(prev => [...prev, `Upload complete. Success: ${successCount}, Failed: ${failCount}`]);
                setUploading(false);
            },
            error: (error) => {
                setLogs(prev => [...prev, `CSV Error: ${error.message}`]);
                setUploading(false);
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Admin Certificate Upload</h1>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors
                ${!file || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Headers required: name, issue_date, issued_for</p>
                </div>

                {uploading && (
                    <div className="mb-6">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">{progress}%</p>
                    </div>
                )}

                <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400">
                    {logs.length === 0 ? (
                        <span className="text-gray-500">Logs will appear here...</span>
                    ) : (
                        logs.map((log, i) => <div key={i}>{log}</div>)
                    )}
                </div>
            </div>
        </div>
    );
}
