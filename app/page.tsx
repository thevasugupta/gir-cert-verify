import Link from 'next/link';
import { ShieldCheck, Upload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">Certificate System</h1>
        <p className="text-gray-600 text-lg">Secure verification and management platform</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/admin/upload" className="group">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 h-full flex flex-col items-center justify-center space-y-4 group-hover:border-blue-200">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Admin Upload</h2>
              <p className="text-gray-500 text-sm">Upload new certificates via CSV</p>
            </div>
          </Link>

          <Link href="/verify/demo-id" className="group">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 h-full flex flex-col items-center justify-center space-y-4 group-hover:border-green-200">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Public Verification</h2>
              <p className="text-gray-500 text-sm">Verify certificate authenticity</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
