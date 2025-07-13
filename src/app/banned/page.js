'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BannedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="mx-auto w-20 h-20 bg-error rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-error-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-error mb-2">บัญชีถูกระงับ</h1>
          
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>บัญชีของคุณถูกระงับการใช้งาน</span>
          </div>
          
          <div className="text-left space-y-2 mb-6">
            <p className="text-sm opacity-70">
              <strong>เหตุผล:</strong> บัญชีของคุณถูกระงับโดยผู้ดูแลระบบ
            </p>
            <p className="text-sm opacity-70">
              <strong>สถานะ:</strong> ไม่สามารถใช้งานได้ชั่วคราว
            </p>
          </div>
          
          <div className="divider"></div>
          
          <div className="space-y-3">
            <p className="text-sm">
              หากคุณคิดว่าการระงับนี้เป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
            </p>
            
            <div className="flex flex-col gap-2">
              <a 
                href="mailto:support@nextblog.com" 
                className="btn btn-outline btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ติดต่อฝ่ายสนับสนุน
              </a>
              
              <button 
                onClick={handleSignOut}
                className="btn btn-primary btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
