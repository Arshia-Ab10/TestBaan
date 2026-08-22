"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import GoogleIcon from "@/components/GoogleIcon";
import { useState, useEffect } from "react";

type AuthMode = 'login' | 'register' | 'register_verify' | 'forgot' | 'reset_verify' | 'reset_password' | 'otp_send' | 'otp_verify';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then(res => { if(res.ok) return res.json(); throw new Error(); })
      .then(() => setUser(true))
      .catch(() => setUser(false))
      .finally(() => setLoadingUser(false));
  }, []);

  const clearMessages = () => { setErrorMsg(""); setSuccessMsg(""); };

  // هندل کردن ورود و درخواست ثبت‌نام
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    if (mode === 'register' && password !== confirmPassword) {
      setErrorMsg("رمز عبور و تکرار آن مطابقت ندارند");
      setLoadingAction(false); return;
    }

    const res = await fetch('/api/auth/password', { 
      method: 'POST', 
      body: JSON.stringify({ action: mode, email, password, firstName, lastName }) 
    });
    const data = await res.json() as any;
    
    if (res.ok) {
      if (mode === 'register') {
        setSuccessMsg("کد تایید به ایمیل شما ارسال شد.");
        setMode('register_verify');
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      setErrorMsg(data.error || 'خطایی رخ داد');
    }
    setLoadingAction(false);
  };

  // تایید نهایی ثبت‌نام
  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    const res = await fetch('/api/auth/password', { 
      method: 'POST', 
      body: JSON.stringify({ action: 'register_verify', email, password, firstName, lastName, code: otp }) 
    });
    const data = await res.json() as any;
    
    if (res.ok) window.location.href = '/dashboard';
    else setErrorMsg(data.error || 'کد اشتباه است');
    
    setLoadingAction(false);
  };

  // هندل کردن فراموشی رمز عبور
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    const res = await fetch('/api/auth/password', { method: 'POST', body: JSON.stringify({ action: 'forgot', email }) });
    const data = await res.json() as any;
    
    if (res.ok) {
      setSuccessMsg("کد بازیابی به ایمیل شما ارسال شد.");
      setMode('reset_verify');
    } else setErrorMsg(data.error || 'خطا در ارسال کد');
    
    setLoadingAction(false);
  };

  // مرحله اول بازیابی: تایید کد
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    const res = await fetch('/api/auth/password', { method: 'POST', body: JSON.stringify({ action: 'verify_reset_code', email, code: otp }) });
    const data = await res.json() as any;
    
    if (res.ok) {
      setSuccessMsg("کد تایید شد. لطفاً رمز عبور جدید خود را وارد کنید.");
      setMode('reset_password');
    } else setErrorMsg(data.error || 'کد اشتباه است');
    
    setLoadingAction(false);
  };

  // مرحله دوم بازیابی: ثبت رمز جدید
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    if (password !== confirmPassword) {
      setErrorMsg("رمز عبور و تکرار آن مطابقت ندارند");
      setLoadingAction(false); return;
    }

    const res = await fetch('/api/auth/password', { method: 'POST', body: JSON.stringify({ action: 'reset', email, code: otp, password }) });
    const data = await res.json() as any;
    
    if (res.ok) {
      setSuccessMsg("رمز عبور با موفقیت تغییر کرد. حالا وارد شوید.");
      setMode('login'); setPassword(""); setConfirmPassword(""); setOtp("");
    } else setErrorMsg(data.error || 'خطایی رخ داد');
    
    setLoadingAction(false);
  };

  // هندل کردن ورود با OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    const res = await fetch('/api/auth/otp/send', { method: 'POST', body: JSON.stringify({ email }) });
    const data = await res.json() as any;
    
    if (res.ok) setMode('otp_verify');
    else setErrorMsg(data.error || 'خطا در ارسال کد');
    
    setLoadingAction(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true); clearMessages();
    
    const res = await fetch('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code: otp }) });
    const data = await res.json() as any;
    
    if (res.ok) window.location.href = '/dashboard';
    else { setErrorMsg(data.error || 'کد اشتباه است'); setLoadingAction(false); }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border dark:border-gray-700 text-center relative overflow-hidden">
        
        <div className="flex items-center justify-center gap-3 mb-3">
          <Logo className="w-12 h-12" />
          <h1 className="text-4xl font-black text-blue-600 dark:text-blue-400">تست‌بان</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-8">سامانه آنلاین برگزاری آزمون الکترونیکی</p>

        {errorMsg && <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-bold border border-red-200">{errorMsg}</div>}
        {successMsg && <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-xl text-sm font-bold border border-green-200">{successMsg}</div>}

        {loadingUser ? (
           <div className="py-10 text-gray-400 font-bold">در حال بررسی اطلاعات شما...</div>
        ) : user ? (
          <div className="space-y-4">
            <Link href="/dashboard" className="block w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-lg">ورود به داشبورد آزمون‌ها ←</Link>
            <Link href="/admin" className="block w-full bg-gray-800 hover:bg-gray-900 text-white p-3.5 rounded-xl font-bold transition shadow-lg">ورود به پنل مدیریت ⚙️</Link>
            <a href="/api/auth/logout" className="block text-xs text-red-500 hover:underline pt-2">خروج از حساب کاربری</a>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* فرم ورود و ثبت‌نام */}
            {(mode === 'login' || mode === 'register') && (
              <form onSubmit={handlePasswordAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" required placeholder="نام" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition" value={firstName} onChange={e => setFirstName(e.target.value)} />
                    <input type="text" placeholder="نام خانوادگی (اختیاری)" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                )}
                
                <input type="email" required placeholder="ایمیل" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" required placeholder="رمز عبور" minLength={8} className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} />
                
                {mode === 'register' && (
                  <input type="password" required placeholder="تکرار رمز عبور" minLength={8} className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                )}
                
                <button disabled={loadingAction} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال پردازش..." : (mode === 'login' ? "ورود به حساب" : "ثبت‌نام")}
                </button>
                
                <div className="flex justify-between text-xs text-gray-500 font-bold px-1">
                  <button type="button" onClick={() => {setMode(mode === 'login' ? 'register' : 'login'); clearMessages();}} className="hover:text-blue-600">
                    {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
                  </button>
                  {mode === 'login' && (
                    <button type="button" onClick={() => {setMode('forgot'); clearMessages();}} className="hover:text-red-500">فراموشی رمز؟</button>
                  )}
                </div>
              </form>
            )}

            {/* تایید ایمیل ثبت‌نام */}
            {mode === 'register_verify' && (
              <form onSubmit={handleRegisterVerify} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2">کد ۶ رقمی به ایمیل <strong className="text-blue-600" dir="ltr">{email}</strong> ارسال شد.</div>
                <input type="text" required maxLength={6} placeholder="کد ۶ رقمی" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-center font-bold text-2xl tracking-[0.3em]" dir="ltr" value={otp} onChange={e => setOtp(e.target.value)} />
                
                <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800">
                  ⚠️ لطفاً پوشه اسپم (Spam) را نیز بررسی کنید.
                </div>

                <button disabled={loadingAction} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال بررسی..." : "تایید ایمیل و تکمیل ثبت‌نام"}
                </button>
                <button type="button" onClick={() => setMode('register')} className="text-xs text-gray-500 hover:text-gray-800 font-bold">اصلاح اطلاعات</button>
              </form>
            )}

            {/* فرم فراموشی رمز عبور */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-600 font-bold mb-2">ایمیل خود را برای دریافت کد بازیابی وارد کنید:</p>
                <input type="email" required placeholder="ایمیل" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
                <button disabled={loadingAction} className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال ارسال..." : "ارسال کد بازیابی"}
                </button>
                <button type="button" onClick={() => setMode('login')} className="text-xs text-gray-500 hover:text-gray-800 font-bold">بازگشت به ورود</button>
              </form>
            )}

            {/* مرحله اول بازیابی: تایید کد */}
            {mode === 'reset_verify' && (
              <form onSubmit={handleVerifyResetCode} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2">کد ۶ رقمی به ایمیل <strong className="text-blue-600" dir="ltr">{email}</strong> ارسال شد.</div>
                <input type="text" required maxLength={6} placeholder="کد ۶ رقمی" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-center font-bold text-2xl tracking-[0.3em]" dir="ltr" value={otp} onChange={e => setOtp(e.target.value)} />
                
                <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800">
                  ⚠️ لطفاً پوشه اسپم (Spam) را نیز بررسی کنید.
                </div>

                <button disabled={loadingAction} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال بررسی..." : "تایید کد"}
                </button>
                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-gray-500 hover:text-gray-800 font-bold">اصلاح ایمیل</button>
              </form>
            )}

            {/* مرحله دوم بازیابی: ثبت رمز جدید */}
            {mode === 'reset_password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-gray-600 font-bold mb-2">رمز عبور جدید خود را وارد کنید:</p>
                <input type="password" required placeholder="رمز عبور جدید" minLength={8} className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} />
                <input type="password" required placeholder="تکرار رمز عبور جدید" minLength={8} className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <button disabled={loadingAction} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال ثبت..." : "تغییر رمز عبور"}
                </button>
              </form>
            )}

            {/* فرم ورود با OTP */}
            {mode === 'otp_send' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <input type="email" required placeholder="ایمیل" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
                <button disabled={loadingAction} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال ارسال..." : "ارسال کد یک‌بار مصرف"}
                </button>
                <button type="button" onClick={() => setMode('login')} className="text-xs text-gray-500 hover:text-gray-800 font-bold">بازگشت به ورود با رمز</button>
              </form>
            )}

            {mode === 'otp_verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2">کد ۶ رقمی به ایمیل <strong className="text-blue-600" dir="ltr">{email}</strong> ارسال شد.</div>
                <input type="text" required maxLength={6} placeholder="کد ۶ رقمی" className="w-full p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-center font-bold text-2xl tracking-[0.3em]" dir="ltr" value={otp} onChange={e => setOtp(e.target.value)} />
                
                <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800">
                  ⚠️ لطفاً پوشه اسپم (Spam) را نیز بررسی کنید.
                </div>

                <button disabled={loadingAction} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  {loadingAction ? "در حال بررسی..." : "تایید کد و ورود"}
                </button>
                <button type="button" onClick={() => setMode('otp_send')} className="text-xs text-gray-500 hover:text-gray-800 font-bold">اصلاح ایمیل</button>
              </form>
            )}

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold">یا</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            <div className="space-y-3">
              {(mode === 'login' || mode === 'register') && (
                <button onClick={() => {setMode('otp_send'); clearMessages();}} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-3.5 rounded-xl font-bold transition shadow-sm">
                  ورود با کد یک‌بار مصرف (بدون رمز)
                </button>
              )}
              
              <a href="/api/auth/google" className="flex items-center justify-center gap-3 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white p-3.5 rounded-xl font-bold transition shadow-sm">
                <GoogleIcon className="w-6 h-6" />
                ورود سریع با حساب گوگل
              </a>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}