'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { verifyCertificate, Certificate, ApiResponse } from '@/app/lib/api';
import { CheckCircle, XCircle, Loader2, Calendar, User, FileText, Award, Shield, Sparkles } from 'lucide-react';

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-amber-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                        <div className="relative p-4 bg-white rounded-full shadow-xl">
                            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                        </div>
                    </div>
                    <p className="mt-4 text-stone-500 font-medium">Verifying certificate...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-stone-50 to-amber-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-red-200/50 p-8 max-w-md w-full text-center relative overflow-hidden">
                    {/* Top gradient bar */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-red-600 to-amber-500"></div>

                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-100/50 rounded-full"></div>
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-amber-100/50 rounded-full"></div>

                    {/* Icon with glow effect */}
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative w-full h-full bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 border-2 border-red-200">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>
                    </div>

                    {/* Error badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold mb-4">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                        Verification Error
                    </div>

                    <h1 className="text-2xl font-bold text-stone-800 mb-3">Certificate Not Found</h1>
                    <p className="text-stone-500 mb-6">{error}</p>

                    {/* Info box */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50">
                        <div className="flex items-start gap-3 text-left">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Shield className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-amber-800">What to do next?</p>
                                <p className="text-xs text-amber-600 mt-1">
                                    Double-check the certificate ID or contact <a href="mailto:gir-webad@ds.study.iitm.ac.in" className="underline hover:text-amber-800 transition-colors">gir-webad@ds.study.iitm.ac.in</a> for assistance.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-stone-100">
                        <p className="text-xs text-stone-400">
                            If you believe this is an error, please contact <a href="mailto:gir-webad@ds.study.iitm.ac.in" className="underline hover:text-stone-600 transition-colors">gir-webad@ds.study.iitm.ac.in</a>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Success Badge */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold shadow-lg shadow-emerald-500/10">
                        <CheckCircle className="w-4 h-4" />
                        Certificate Verified Successfully
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-amber-200/50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-500 px-8 py-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Award className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Certificate Verification</h1>
                                    <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Official Authenticated Record
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <Sparkles className="w-10 h-10 text-amber-200" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="space-y-6">
                            {/* Certificate Holder */}
                            <div className="p-4 bg-gradient-to-br from-amber-50/50 to-emerald-50/30 rounded-xl border border-amber-200/30">
                                <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                                    <User className="w-3 h-3 text-amber-600" />
                                    Certificate Holder
                                </label>
                                <div className="mt-2">
                                    <span className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent">
                                        {data.name}
                                    </span>
                                </div>
                            </div>

                            {/* Issued For */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/50">
                                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-amber-600" />
                                        Issued For
                                    </label>
                                    <div className="mt-2">
                                        <span className="text-lg font-semibold text-stone-800">{data.certificate_title}</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/50">
                                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-amber-600" />
                                        Issue Date
                                    </label>
                                    <div className="mt-2">
                                        <span className="text-lg font-semibold text-stone-800">
                                            {new Date(data.issue_date).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Status Footer */}
                            <div className="pt-6 border-t border-stone-200 flex flex-wrap justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-semibold ${data.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${data.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        {data.status === 'active' ? 'Active' : 'Revoked'} Certificate
                                    </div>
                                </div>
                                <div className="text-xs text-stone-400 font-mono bg-stone-100 px-3 py-1.5 rounded-lg">
                                    ID: {data.cert_id}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="text-center mt-6">
                    <p className="text-xs text-stone-400">
                        This certificate has been cryptographically verified and is authentic.
                    </p>
                </div>
            </div>
        </div>
    );
}
