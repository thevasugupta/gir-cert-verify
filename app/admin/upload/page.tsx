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

    // Upload Mode State
    const [uploadMode, setUploadMode] = useState<'csv' | 'manual'>('csv');
    const [manualEntries, setManualEntries] = useState<Array<{ name: string; email: string; rank: string }>>([
        { name: '', email: '', rank: '' }
    ]);

    // Formatting State
    const [nameFont, setNameFont] = useState('Quintessential');
    const [nameSize, setNameSize] = useState(100);
    const [nameColor, setNameColor] = useState('#000000');
    const [nameYPos, setNameYPos] = useState(9.0); // Default 9cm
    const [nameXPos, setNameXPos] = useState(14.85); // Default Center (29.7 / 2)

    // QR Positioning State
    const [qrXPos, setQrXPos] = useState(1.0);
    const [qrYPos, setQrYPos] = useState(17.5);

    // Rank Box State
    const [hasRankData, setHasRankData] = useState(false);
    const [rankFont, setRankFont] = useState('Quintessential');
    const [rankSize, setRankSize] = useState(30);
    const [rankColor, setRankColor] = useState('#000000');
    const [rankXPos, setRankXPos] = useState(14.85);
    const [rankYPos, setRankYPos] = useState(11.0);

    // Email State
    const [emailSubject, setEmailSubject] = useState('Your Certificate: {title}');
    const [emailBody, setEmailBody] = useState('Dear {name},\n\nPlease find your certificate attached.\n\nVerify at: {verify_url}');

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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFile(file);
            setLogs([]);
            setProgress(0);

            // Peek at CSV to check for 3rd column
            Papa.parse(file, {
                preview: 5,
                header: false, // Read as array to check indices
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        // Check if ANY row has >= 3 columns
                        const hasRank = results.data.some((row: any) => row.length >= 3);
                        if (hasRank) {
                            setHasRankData(true);
                            setLogs(prev => [...prev, 'Detected 3rd column: Enabling Rank Box features.']);
                        } else {
                            setHasRankData(false);
                        }
                    }
                }
            });
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
        setNameXPos(14.85);
        setQrXPos(1.0);
        setQrYPos(17.5);
        setHasRankData(false);
        setRankFont('Quintessential');
        setRankSize(30);
        setRankColor('#000000');
        setRankXPos(14.85);
        setRankYPos(11.0);
        setEmailSubject('Your Certificate: {title}');
        setEmailBody('Dear {name},\n\nPlease find your certificate attached.\n\nVerify at: {verify_url}');
        setLogs([]);
        setProgress(0);

        // Reset file inputs manually
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => (input as HTMLInputElement).value = '');

        // Reset Manual Inputs
        setManualEntries([{ name: '', email: '', rank: '' }]);
    };

    const addManualEntry = () => {
        setManualEntries(prev => [...prev, { name: '', email: '', rank: '' }]);
    };

    const removeManualEntry = (index: number) => {
        if (manualEntries.length > 1) {
            setManualEntries(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateManualEntry = (index: number, field: 'name' | 'email' | 'rank', value: string) => {
        setManualEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], [field]: value };
            return newEntries;
        });

        if (field === 'rank' && value) {
            setHasRankData(true);
        }
    };

    const handleUpload = async () => {
        if (!issueDate || !certificateTitle || !templateFile) return;

        // Validation based on mode
        if (uploadMode === 'csv' && !file) return;

        // Filter valid entries for manual mode
        const validManualEntries = manualEntries.filter(e => e.name && e.email);
        if (uploadMode === 'manual' && validManualEntries.length === 0) return;

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

            // Common Data Construction Helper
            const createCertData = (email: string, name: string, rank: string): CertificateData => {
                const certData: CertificateData = {
                    email,
                    name,
                    issue_date: issueDate,
                    certificate_title: rank || certificateTitle,
                    template_drive_id: templateId,
                    output_folder_id: folderId,
                    name_font: nameFont,
                    name_size: nameSize,
                    name_color: nameColor,
                    name_y_pos: nameYPos,
                    name_x_pos: nameXPos,
                    qr_x_pos: qrXPos,
                    qr_y_pos: qrYPos,
                    email_subject: emailSubject,
                    email_body: emailBody
                };

                if (rank) {
                    certData.rank_text = rank;
                    certData.rank_font = rankFont;
                    certData.rank_size = rankSize;
                    certData.rank_color = rankColor;
                    certData.rank_x_pos = rankXPos;
                    certData.rank_y_pos = rankYPos;
                }
                return certData;
            };

            if (uploadMode === 'manual') {
                // MANUAL MODE
                setLogs(prev => [...prev, `Processing ${validManualEntries.length} manual entries...`]);

                let successCount = 0;
                let failCount = 0;

                for (let i = 0; i < validManualEntries.length; i++) {
                    const entry = validManualEntries[i];
                    const certData = createCertData(entry.email, entry.name, entry.rank);

                    const res = await uploadCertificate(certData);
                    if (res.status === 'success') {
                        successCount++;
                        setLogs(prev => [...prev, `Success: Certificate generated for ${entry.name}`]);
                    } else {
                        failCount++;
                        setLogs(prev => [...prev, `Failed (${entry.name}): ${res.message}`]);
                    }
                    setProgress(Math.round(((i + 1) / validManualEntries.length) * 100));
                }
                setLogs(prev => [...prev, `Manual upload complete. Success: ${successCount}, Failed: ${failCount}`]);
                setUploading(false);

            } else {
                // CSV MODE
                if (!file) return; // Should be caught above, but for safety
                setLogs(prev => [...prev, 'Parsing CSV...']);
                Papa.parse(file, {
                    header: false,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        const rawRows = results.data as string[][];
                        const header = rawRows[0].map(h => h.toLowerCase().trim());
                        const emailIdx = header.findIndex(h => h.includes('email'));
                        const nameIdx = header.findIndex(h => h.includes('name'));
                        const rankIdx = 2;

                        if (emailIdx === -1 || nameIdx === -1) {
                            setLogs(prev => [...prev, 'Error: Could not find "email" or "name" columns in header.']);
                            setUploading(false);
                            return;
                        }

                        const dataRows = rawRows.slice(1);
                        setLogs(prev => [...prev, `Found ${dataRows.length} rows. Starting certificate data upload...`]);

                        let successCount = 0;
                        let failCount = 0;

                        for (let i = 0; i < dataRows.length; i++) {
                            const rowData = dataRows[i];
                            const email = rowData[emailIdx];
                            const name = rowData[nameIdx];
                            const rank = rowData[rankIdx] || '';

                            if (!email || !name) {
                                setLogs(prev => [...prev, `Row ${i + 1}: Skipped (Missing email or name)`]);
                                failCount++;
                                continue;
                            }

                            const certData = createCertData(email, name, rank);
                            const res = await uploadCertificate(certData);

                            if (res.status === 'success') {
                                successCount++;
                            } else {
                                failCount++;
                                setLogs(prev => [...prev, `Row ${i + 1}: Failed - ${res.message}`]);
                            }
                            setProgress(Math.round(((i + 1) / dataRows.length) * 100));
                        }
                        setLogs(prev => [...prev, `Upload complete. Success: ${successCount}, Failed: ${failCount}`]);
                        setUploading(false);
                    },
                    error: (error) => {
                        setLogs(prev => [...prev, `CSV Error: ${error.message}`]);
                        setUploading(false);
                    }
                });
            }

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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4 w-fit">
                            <button
                                onClick={() => setUploadMode('csv')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${uploadMode === 'csv' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                CSV Upload
                            </button>
                            <button
                                onClick={() => setUploadMode('manual')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${uploadMode === 'manual' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Manual Entry
                            </button>
                        </div>

                        {uploadMode === 'csv' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
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
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {manualEntries.map((entry, index) => (
                                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-100 relative group">
                                        {manualEntries.length > 1 && (
                                            <button
                                                onClick={() => removeManualEntry(index)}
                                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                                                title="Remove Entry"
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={entry.name}
                                                    onChange={(e) => updateManualEntry(index, 'name', e.target.value)}
                                                    placeholder="John Doe"
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={entry.email}
                                                    onChange={(e) => updateManualEntry(index, 'email', e.target.value)}
                                                    placeholder="john@example.com"
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Rank (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={entry.rank}
                                                    onChange={(e) => updateManualEntry(index, 'rank', e.target.value)}
                                                    placeholder="First Place Winner"
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addManualEntry}
                                    className="w-full py-2 border-2 border-dashed border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                                >
                                    + Add Another Record
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Formatting Options */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">

                        {/* Name Layout */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Name Layout</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
                                    <select
                                        value={nameFont}
                                        onChange={(e) => setNameFont(e.target.value)}
                                        className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                                    >
                                        <option value="Quintessential">Quintessential</option>
                                        <option value="Meie Script">Meie Script</option>
                                        <option value="Luxurious Script">Luxurious Script</option>
                                        <option value="Italianno">Italianno</option>
                                        <option value="Island Moments">Island Moments</option>
                                        <option value="Felipa">Felipa</option>
                                        <option value="Moon Dance">Moon Dance</option>
                                        <option value="Bilbo Swash Caps">Bilbo Swash Caps</option>
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
                            <div className="grid grid-cols-3 gap-4">
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
                                    <label className="block text-xs font-medium text-gray-500 mb-1">X-Axis (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={nameXPos}
                                        onChange={(e) => setNameXPos(Number(e.target.value))}
                                        className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Y-Axis (cm)</label>
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

                        {/* QR Layout */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">QR Code Layout</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">X-Axis (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={qrXPos}
                                        onChange={(e) => setQrXPos(Number(e.target.value))}
                                        className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Y-Axis (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={qrYPos}
                                        onChange={(e) => setQrYPos(Number(e.target.value))}
                                        className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rank Layout (Conditional) */}
                        {hasRankData && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Rank Box Layout</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
                                        <select
                                            value={rankFont}
                                            onChange={(e) => setRankFont(e.target.value)}
                                            className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black bg-white"
                                        >
                                            <option value="Quintessential">Quintessential</option>
                                            <option value="Meie Script">Meie Script</option>
                                            <option value="Luxurious Script">Luxurious Script</option>
                                            <option value="Italianno">Italianno</option>
                                            <option value="Island Moments">Island Moments</option>
                                            <option value="Felipa">Felipa</option>
                                            <option value="Moon Dance">Moon Dance</option>
                                            <option value="Bilbo Swash Caps">Bilbo Swash Caps</option>
                                            <option value="Roboto">Roboto</option>
                                            <option value="Open Sans">Open Sans</option>
                                            <option value="Lato">Lato</option>
                                            <option value="Montserrat">Montserrat</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Font Size</label>
                                        <input
                                            type="number"
                                            value={rankSize}
                                            onChange={(e) => setRankSize(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={rankColor}
                                                onChange={(e) => setRankColor(e.target.value)}
                                                className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                            />
                                            <input
                                                type="text"
                                                value={rankColor}
                                                onChange={(e) => setRankColor(e.target.value)}
                                                className="block w-full px-2 h-10 text-xs font-mono border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black uppercase"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">X-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={rankXPos}
                                            onChange={(e) => setRankXPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Y-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={rankYPos}
                                            onChange={(e) => setRankYPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Email Customization */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Email Customization</h3>
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm"
                                placeholder="Your Certificate: {title}"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Body (HTML supported)</label>
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                rows={4}
                                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black text-sm font-mono"
                                placeholder="Dear {name}..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Available placeholders: {'{name}'}, {'{title}'}, {'{verify_url}'}. HTML tags allowed (e.g. &lt;b&gt;, &lt;br&gt;).
                            </p>
                        </div>
                    </div>
                </div>


                <button
                    onClick={handleUpload}
                    disabled={uploading || !issueDate || !certificateTitle || !templateFile || (uploadMode === 'csv' ? !file : manualEntries.filter(e => e.name && e.email).length === 0)}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                    ${uploading || !issueDate || !certificateTitle || !templateFile || (uploadMode === 'csv' ? !file : manualEntries.filter(e => e.name && e.email).length === 0)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30'
                        }`}
                >
                    {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Upload className="w-6 h-6" />
                            Generate and Send Certificates
                        </span>
                    )}
                </button>
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
