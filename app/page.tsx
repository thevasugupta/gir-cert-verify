import Link from 'next/link';
import { Upload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">Certificate System</h1>
        <p className="text-gray-600 text-lg">Secure verification and management platform</p>

        <div className="flex justify-center mt-12">
          <Link href="/admin/login" className="group w-full max-w-sm">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 h-full flex flex-col items-center justify-center space-y-4 group-hover:border-blue-200">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Admin Login</h2>
              <p className="text-gray-500 text-sm">Login to upload certificates</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
