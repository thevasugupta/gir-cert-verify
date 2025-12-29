'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { uploadCertificate, uploadTemplate, CertificateData } from '@/app/lib/api';
import { Upload, Loader2, LogOut, Plus, X, FileText, Settings2, Mail, Type, QrCode, Award, Sparkles } from 'lucide-react';
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
                    certificate_title: certificateTitle,
                    rank: rank,
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
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Premium Header Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-amber-200/50 p-6 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600"></div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent">
                                    Certificate Generator
                                </h1>
                                <p className="text-xs text-stone-500">Admin Dashboard</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all duration-200 border border-stone-200 hover:border-emerald-200"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-red-100 hover:border-red-200"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-amber-200/50 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-400"></div>

                    <div className="mb-6 space-y-5">
                        {/* Certificate Title */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
                                <Type className="w-4 h-4 text-amber-600" />
                                Certificate Title
                            </label>
                            <input
                                type="text"
                                value={certificateTitle}
                                onChange={(e) => setCertificateTitle(e.target.value)}
                                placeholder="e.g. Advanced React Certification"
                                className="block w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none text-stone-800 transition-all duration-200 placeholder:text-stone-400"
                            />
                        </div>

                        {/* Issue Date */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
                                <FileText className="w-4 h-4 text-amber-600" />
                                Issue Date
                            </label>
                            <input
                                type="date"
                                max={today}
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="block w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:bg-white outline-none text-stone-800 transition-all duration-200"
                            />
                        </div>

                        {/* Template Upload */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-2">
                                <FileText className="w-4 h-4 text-amber-600" />
                                Certificate Template
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleTemplateChange}
                                className="block w-full text-sm text-stone-600
                                    file:mr-4 file:py-2.5 file:px-5
                                    file:rounded-xl file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-gradient-to-r file:from-emerald-600 file:to-emerald-700 file:text-white
                                    hover:file:from-emerald-700 hover:file:to-emerald-800
                                    file:cursor-pointer file:transition-all file:duration-200
                                    file:shadow-md hover:file:shadow-lg"
                            />
                        </div>

                        {/* Data Source Toggle */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3">
                                <Settings2 className="w-4 h-4 text-amber-600" />
                                Data Source
                            </label>
                            <div className="flex bg-stone-100 p-1.5 rounded-xl mb-4 w-fit border border-stone-200">
                                <button
                                    onClick={() => setUploadMode('csv')}
                                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${uploadMode === 'csv'
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-stone-500 hover:text-emerald-700 hover:bg-white/50'}`}
                                >
                                    CSV Upload
                                </button>
                                <button
                                    onClick={() => setUploadMode('manual')}
                                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${uploadMode === 'manual'
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-stone-500 hover:text-emerald-700 hover:bg-white/50'}`}
                                >
                                    Manual Entry
                                </button>
                            </div>

                            {uploadMode === 'csv' ? (
                                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/50">
                                    <label className="block text-xs font-medium text-stone-500 mb-2">Select CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-stone-600
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-lg file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-amber-500 file:text-white
                                            hover:file:bg-amber-600
                                            file:cursor-pointer file:transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {manualEntries.map((entry, index) => (
                                        <div key={index} className="p-4 bg-gradient-to-br from-amber-50/50 to-emerald-50/30 rounded-xl border border-amber-200/50 relative group">
                                            <div className="absolute -left-3 -top-3 w-7 h-7 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                                {index + 1}
                                            </div>
                                            {manualEntries.length > 1 && (
                                                <button
                                                    onClick={() => removeManualEntry(index)}
                                                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                                    title="Remove Entry"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                            <div className="grid grid-cols-1 gap-3 ml-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-emerald-700 mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={entry.name}
                                                        onChange={(e) => updateManualEntry(index, 'name', e.target.value)}
                                                        placeholder="John Doe"
                                                        className="block w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-stone-800 text-sm transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-emerald-700 mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={entry.email}
                                                        onChange={(e) => updateManualEntry(index, 'email', e.target.value)}
                                                        placeholder="john@example.com"
                                                        className="block w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-stone-800 text-sm transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-emerald-700 mb-1">Rank (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={entry.rank}
                                                        onChange={(e) => updateManualEntry(index, 'rank', e.target.value)}
                                                        placeholder="First Place Winner"
                                                        className="block w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-stone-800 text-sm transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addManualEntry}
                                        className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 text-sm font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Another Record
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Formatting Options */}
                        <div className="p-5 bg-gradient-to-br from-stone-50 to-amber-50/30 rounded-xl border border-amber-200/50 space-y-5">

                            {/* Name Layout */}
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3 pb-2 border-b border-amber-200/50">
                                    <Type className="w-4 h-4 text-amber-600" />
                                    Name Layout
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Font Family</label>
                                        <select
                                            value={nameFont}
                                            onChange={(e) => setNameFont(e.target.value)}
                                            className="block w-full px-3 h-10 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 bg-white"
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
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Font Size</label>
                                        <input
                                            type="number"
                                            value={nameSize}
                                            onChange={(e) => setNameSize(Number(e.target.value))}
                                            className="block w-full px-3 h-10 text-sm border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
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
                                                className="block w-full px-2 h-10 text-xs font-mono border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 uppercase"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">X-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={nameXPos}
                                            onChange={(e) => setNameXPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Y-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={nameYPos}
                                            onChange={(e) => setNameYPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* QR Layout */}
                            <div>
                                <h3 className="text-sm font-semibold text-emerald-800 mb-3 border-b pb-1">QR Code Layout</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">X-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={qrXPos}
                                            onChange={(e) => setQrXPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1">Y-Axis (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={qrYPos}
                                            onChange={(e) => setQrYPos(Number(e.target.value))}
                                            className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Rank Layout (Conditional) */}
                            {hasRankData && (
                                <div>
                                    <h3 className="text-sm font-semibold text-emerald-800 mb-3 border-b pb-1">Rank Box Layout</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">Font Family</label>
                                            <select
                                                value={rankFont}
                                                onChange={(e) => setRankFont(e.target.value)}
                                                className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 bg-white"
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
                                            <label className="block text-xs font-medium text-stone-500 mb-1">Font Size</label>
                                            <input
                                                type="number"
                                                value={rankSize}
                                                onChange={(e) => setRankSize(Number(e.target.value))}
                                                className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">Color</label>
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
                                                    className="block w-full px-2 h-10 text-xs font-mono border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 uppercase"
                                                    placeholder="#000000"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">X-Axis (cm)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={rankXPos}
                                                onChange={(e) => setRankXPos(Number(e.target.value))}
                                                className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-500 mb-1">Y-Axis (cm)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={rankYPos}
                                                onChange={(e) => setRankYPos(Number(e.target.value))}
                                                className="block w-full px-2 h-10 text-sm border border-stone-200 rounded focus:ring-2 focus:ring-amber-400 outline-none text-stone-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Email Customization */}
                    <div className="mb-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3">
                            <Mail className="w-4 h-4 text-amber-600" />
                            Email Customization
                        </h3>
                        <div className="space-y-4 p-4 bg-stone-50 rounded-xl border border-amber-200/50">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="block w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 text-sm"
                                    placeholder="Your Certificate: {title}"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Body (HTML supported)</label>
                                <textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={4}
                                    className="block w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-stone-800 text-sm font-mono"
                                    placeholder="Dear {name}..."
                                />
                                <p className="text-xs text-stone-500 mt-1">
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
                                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 text-white hover:shadow-emerald-500/30 hover:shadow-xl'
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

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-6">
                        <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-stone-500">Processing certificates...</span>
                            <span className="text-xs font-semibold text-emerald-600">{progress}%</span>
                        </div>
                    </div>
                )}

                {/* Logs Terminal */}
                <div className="mt-6 bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs border border-emerald-800">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-800/50">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <span className="text-emerald-400/60 text-xs">output.log</span>
                    </div>
                    {logs.length === 0 ? (
                        <span className="text-emerald-500/50 flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Waiting for activity...
                        </span>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-amber-300 hover:text-amber-200 transition-colors">
                                <span className="text-emerald-500 mr-2">›</span>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
