'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorType) => {
    switch (errorType) {
      case 'AccessDenied':
        return {
          title: 'บัญชีถูกระงับ',
          message: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
          icon: (
            <svg className="w-16 h-16 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          )
        };
      case 'Configuration':
        return {
          title: 'ข้อผิดพลาดในการตั้งค่า',
          message: 'เกิดข้อผิดพลาดในการตั้งค่าระบบ กรุณาลองใหม่อีกครั้ง',
          icon: (
            <svg className="w-16 h-16 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        };
      default:
        return {
          title: 'เกิดข้อผิดพลาด',
          message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง',
          icon: (
            <svg className="w-16 h-16 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="mx-auto mb-6">
            {errorInfo.icon}
          </div>
          
          <h1 className="text-2xl font-bold mb-4">{errorInfo.title}</h1>
          
          <div className="alert alert-error mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorInfo.message}</span>
          </div>
          
          {error === 'AccessDenied' && (
            <div className="text-left space-y-2 mb-6">
              <p className="text-sm opacity-70">
                <strong>สาเหตุ:</strong> บัญชีของคุณถูกระงับโดยผู้ดูแลระบบ
              </p>
              <p className="text-sm opacity-70">
                <strong>การแก้ไข:</strong> ติดต่อฝ่ายสนับสนุนเพื่อขอความช่วยเหลือ
              </p>
            </div>
          )}
          
          <div className="divider"></div>
          
          <div className="space-y-3">
            {error === 'AccessDenied' ? (
              <a 
                href="mailto:support@nextblog.com" 
                className="btn btn-primary btn-sm w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ติดต่อฝ่ายสนับสนุน
              </a>
            ) : (
              <Link href="/auth/signin" className="btn btn-primary btn-sm w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                ลองเข้าสู่ระบบอีกครั้ง
              </Link>
            )}
            
            <Link href="/" className="btn btn-ghost btn-sm w-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
