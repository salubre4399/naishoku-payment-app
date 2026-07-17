import React, { useState } from 'react';
import { Lock, ShieldAlert, LogOut, Loader2 } from 'lucide-react';
import { googleSignIn, logoutGoogle } from '../lib/firebaseAuth';

/** 起動時・認証確認中のローディング表示 */
export function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3 font-sans">
      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      <p className="text-xs text-slate-500 font-bold">{message}</p>
    </div>
  );
}

/** Googleログイン画面（本物の認証ゲート） */
export function GoogleLoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await googleSignIn();
      // 成功後は onAuthStateChanged が拾ってアプリ側で画面遷移する
    } catch (e: any) {
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        setError('ログインがキャンセルされました。');
      } else if (e?.code === 'auth/unauthorized-domain') {
        setError('このドメインはFirebaseで許可されていません。管理者にご連絡ください。');
      } else {
        setError('ログインに失敗しました。時間をおいて再度お試しください。');
      }
      console.error('Google Sign-In failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-center text-2xl font-black text-slate-900 tracking-tight">
            内職報酬管理システム
          </h2>
          <p className="mt-1.5 text-center text-xs text-slate-500 font-bold tracking-wider uppercase">
            Homeworkers Payroll &amp; Progress Monitor
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-150 pb-4">
            <h3 className="text-sm font-black text-slate-800">Googleアカウントで認証</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
              許可された職員・管理者のGoogleアカウントのみご利用いただけます。
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2.5 py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            )}
            {loading ? 'ログイン中...' : 'Googleでログイン'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 許可されていないアカウントで入った場合の拒否画面 */
export function AccessDeniedScreen({ email }: { email?: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-6 text-center">
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black tracking-tight text-slate-900">アクセス権がありません</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            このアカウントはシステムの利用を許可されていません。
            利用をご希望の場合は、システム管理者に連絡してアカウントの登録を依頼してください。
          </p>
          {email && (
            <p className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-lg inline-block">
              {email}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => logoutGoogle()}
          className="w-full flex justify-center items-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          別のアカウントでログイン
        </button>
      </div>
    </div>
  );
}
