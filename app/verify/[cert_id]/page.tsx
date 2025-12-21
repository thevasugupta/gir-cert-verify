'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { verifyCertificate, Certificate, ApiResponse } from '@/app/lib/api';
import { CheckCircle, XCircle, Loader2, Calendar, User, FileText } from 'lucide-react';

export default function VerifyPage() {
    const params = useParams();
    const cert_id = params.cert_id as string;
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<Certificate | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cert_id) {
            verifyCertificate(cert_id).then((res: ApiResponse) => {
                if (res.status === 'success' && res.data) {
                    setData(res.data);
                } else {
                    setError(res.message || 'Invalid certificate');
                }
                setLoading(false);
            });
        }
    }, [cert_id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;



    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 px-8 py-6 text-white flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Certificate Verification</h1>
                        <p className="text-blue-100 text-sm mt-1">Official Record</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-blue-200" />
                </div>

                <div className="p-8">
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">Certificate Holder</label>
                            <div className="mt-1 flex items-center gap-3">
                                <User className="w-5 h-5 text-gray-400" />
                                <span className="text-xl font-semibold text-gray-900">{data.name}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">Issued For</label>
                            <div className="mt-1 flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="text-lg text-gray-900">{data.certificate_title}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-500 uppercase tracking-wider">Issue Date</label>
                            <div className="mt-1 flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <span className="text-lg text-gray-900">
                                    {new Date(data.issue_date).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${data.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="font-medium text-gray-700 capitalize">{data.status} Status</span>
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                                ID: {data.cert_id}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
