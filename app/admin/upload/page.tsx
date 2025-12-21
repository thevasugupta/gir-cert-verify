'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { uploadCertificate, uploadTemplate, CertificateData } from '@/app/lib/api';
import { Upload, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [issueDate, setIssueDate] = useState('');
    const [certificateTitle, setCertificateTitle] = useState('');
    const [eventName, setEventName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const router = useRouter();

    const handleLogout = useCallback(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/admin/login');
    }, [router]);

    // Auto-logout on inactivity
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                handleLogout();
            }, 5 * 60 * 1000); // 5 minutes
        };

        // Events to track activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        // Initial timer
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            clearTimeout(timeout);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [handleLogout]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setLogs([]);
            setProgress(0);
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setTemplateFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !issueDate || !certificateTitle || !templateFile || !eventName) return;

        setUploading(true);
        setLogs(prev => [...prev, 'Starting upload process...']);

        // 1. Upload Template
        setLogs(prev => [...prev, 'Uploading template...']);
        try {
            const templateRes = await uploadTemplate(templateFile, eventName);

            if (templateRes.status !== 'success' || !templateRes.template_drive_id || !templateRes.output_folder_id) {
                throw new Error(templateRes.message || 'Template upload failed');
            }

            const templateId = templateRes.template_drive_id;
            const folderId = templateRes.output_folder_id;
            setLogs(prev => [...prev, 'Template uploaded successfully.']);

            // 2. Parse CSV
            setLogs(prev => [...prev, 'Parsing CSV...']);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data as CertificateData[];
                    setLogs(prev => [...prev, `Found ${rows.length} rows. Starting certificate data upload...`]);

                    let successCount = 0;
                    let failCount = 0;

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        // Basic validation
                        if (!row.email || !row.name) {
                            setLogs(prev => [...prev, `Row ${i + 1}: Skipped (Missing data)`]);
                            failCount++;
                            continue;
                        }

                        // Apply global values
                        row.issue_date = issueDate;
                        row.certificate_title = certificateTitle;
                        row.template_drive_id = templateId;
                        row.output_folder_id = folderId;

                        const res = await uploadCertificate(row);
                        if (res.status === 'success') {
                            successCount++;
                        } else {
                            failCount++;
                            setLogs(prev => [...prev, `Row ${i + 1}: Failed - ${res.message}`]);
                        }

                        setProgress(Math.round(((i + 1) / rows.length) * 100));
                    }

                    setLogs(prev => [...prev, `Upload complete. Success: ${successCount}, Failed: ${failCount}`]);
                    setUploading(false);

                    // Reset form on success
                    if (successCount > 0) {
                        setTimeout(() => {
                            setFile(null);
                            setTemplateFile(null);
                            setIssueDate('');
                            setCertificateTitle('');
                            setEventName('');
                            // Logs are kept as requested
                            setProgress(0);
                            // Reset file inputs manually
                            const fileInputs = document.querySelectorAll('input[type="file"]');
                            fileInputs.forEach(input => (input as HTMLInputElement).value = '');
                        }, 2000);
                    }
                },
                error: (error) => {
                    setLogs(prev => [...prev, `CSV Error: ${error.message}`]);
                    setUploading(false);
                }
            });

        } catch (error: any) {
            setLogs(prev => [...prev, `Error: ${error.message}`]);
            setUploading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 relative">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Admin Certificate Upload</h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>

                <div className="mb-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                        <input
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="e.g. React Summit 2024"
                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Title</label>
                        <input
                            type="text"
                            value={certificateTitle}
                            onChange={(e) => setCertificateTitle(e.target.value)}
                            placeholder="e.g. Advanced React Certification"
                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                        <input
                            type="date"
                            max={today}
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Template (Image)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleTemplateChange}
                            className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                        />
                    </div>

                    <div>
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
                                disabled={!file || !issueDate || !certificateTitle || !templateFile || !eventName || uploading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors
                    ${!file || !issueDate || !certificateTitle || !templateFile || !eventName || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Headers required: email, name</p>
                    </div>
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
