import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ไม่มีสิทธิ์เข้าถึง
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
