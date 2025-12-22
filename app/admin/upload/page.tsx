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

    // Formatting State
    const [nameFont, setNameFont] = useState('Quintessential');
    const [nameSize, setNameSize] = useState(100);
    const [nameColor, setNameColor] = useState('#000000');
    const [nameYPos, setNameYPos] = useState(9.0); // Default 9cm

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

    const handleReset = () => {
        setFile(null);
        setTemplateFile(null);
        setIssueDate('');
        setCertificateTitle('');
        setNameFont('Quintessential');
        setNameSize(100);
        setNameColor('#000000');
        setNameYPos(9.0);
        setLogs([]);
        setProgress(0);

        // Reset file inputs manually
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => (input as HTMLInputElement).value = '');
    };

    const handleUpload = async () => {
        if (!file || !issueDate || !certificateTitle || !templateFile) return;

        setUploading(true);
        setLogs(prev => [...prev, 'Starting upload process...']);

        // 1. Upload Template
        setLogs(prev => [...prev, 'Uploading template...']);
        try {
            // Use certificateTitle as eventName for folder creation
            const templateRes = await uploadTemplate(templateFile, certificateTitle);

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

                        // Apply formatting
                        row.name_font = nameFont;
                        row.name_size = nameSize;
                        row.name_color = nameColor;
                        row.name_y_pos = nameYPos;

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
                    // No auto-reset
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

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 relative">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Admin Certificate Upload</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        >
                            Reset Form
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>

                <div className="mb-6 space-y-4">
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

                    {/* Formatting Options */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Name Formatting</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
                                <select
                                    value={nameFont}
                                    onChange={(e) => setNameFont(e.target.value)}
                                    className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                                >
                                    <optgroup label="Cursive / Script">
                                        <option value="Quintessential">Quintessential</option>
                                        <option value="Great Vibes">Great Vibes</option>
                                        <option value="Dancing Script">Dancing Script</option>
                                        <option value="Pacifico">Pacifico</option>
                                        <option value="Sacramento">Sacramento</option>
                                        <option value="Parisienne">Parisienne</option>
                                    </optgroup>
                                    <optgroup label="Serif">
                                        <option value="Merriweather">Merriweather</option>
                                        <option value="Playfair Display">Playfair Display</option>
                                        <option value="Lora">Lora</option>
                                        <option value="Cinzel">Cinzel</option>
                                    </optgroup>
                                    <optgroup label="Sans-Serif">
                                        <option value="Roboto">Roboto</option>
                                        <option value="Open Sans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Oswald">Oswald</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Font Size</label>
                                <input
                                    type="number"
                                    value={nameSize}
                                    onChange={(e) => setNameSize(Number(e.target.value))}
                                    className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={nameColor}
                                        onChange={(e) => setNameColor(e.target.value)}
                                        className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                    />
                                    <input
                                        type="text"
                                        value={nameColor}
                                        onChange={(e) => setNameColor(e.target.value)}
                                        className="block w-full px-2 h-10 text-xs font-mono border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black uppercase"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Y-Axis Position (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nameYPos}
                                    onChange={(e) => setNameYPos(Number(e.target.value))}
                                    className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                />
                            </div>
                        </div>
                    </div>
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
                            disabled={!file || !issueDate || !certificateTitle || !templateFile || uploading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors
                    ${!file || !issueDate || !certificateTitle || !templateFile || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
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
    );
}
