"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // اطلاعات کاربر
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [hasPassword, setHasPassword] = useState(false);

  // فیلدهای تغییر ایمیل
  const [newEmail, setNewEmail] = useState("");
  const [emailOtpMode, setEmailOtpMode] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");

  // فیلدهای رمز عبور
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // وضعیت OTP رمز عبور
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    fetch("/api/student/profile")
      .then(res => res.json() as any)
      .then(data => {
        if (data.error) { window.location.href = '/'; return; }
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setCurrentEmail(data.email);
        setNewEmail(data.email);
        setHasPassword(data.has_password);
        setLoading(false);
      });
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  // ذخیره نام
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'update_name', firstName, lastName }) });
    const data = await res.json() as any;
    if (res.ok) showMessage('success', 'نام با موفقیت به‌روزرسانی شد.');
    else showMessage('error', data.error || 'خطا در ذخیره اطلاعات');
    setActionLoading(false);
  };

  // درخواست تغییر ایمیل
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'request_email_change', newEmail }) });
    const data = await res.json() as any;
    if (res.ok) {
      setEmailOtpMode(true);
      showMessage('success', 'کد تایید به ایمیل جدید ارسال شد. (پوشه Spam را چک کنید)');
    } else showMessage('error', data.error || 'خطا در ارسال کد');
    setActionLoading(false);
  };

  // تایید تغییر ایمیل
  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'verify_email_change', newEmail, code: emailOtpCode }) });
    const data = await res.json() as any;
    if (res.ok) {
      setCurrentEmail(newEmail); setEmailOtpMode(false); setEmailOtpCode("");
      showMessage('success', 'ایمیل با موفقیت تغییر کرد.');
    } else showMessage('error', data.error || 'کد اشتباه است');
    setActionLoading(false);
  };

  // تغییر رمز عبور (با رمز قبلی)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return showMessage('error', 'رمز عبور جدید و تکرار آن مطابقت ندارند.');
    setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'change_password', oldPassword, newPassword }) });
    const data = await res.json() as any;
    if (res.ok) {
      showMessage('success', 'رمز عبور با موفقیت تغییر کرد.');
      setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setHasPassword(true);
    } else showMessage('error', data.error || 'خطا در تغییر رمز عبور');
    setActionLoading(false);
  };

  // درخواست OTP برای تغییر رمز
  const handleRequestOTP = async () => {
    setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'send_otp' }) });
    const data = await res.json() as any;
    if (res.ok) {
      setOtpMode(true); showMessage('success', 'کد تایید به ایمیل شما ارسال شد. (پوشه Spam را نیز چک کنید)');
    } else showMessage('error', data.error || 'خطا در ارسال کد');
    setActionLoading(false);
  };

  // ثبت رمز جدید با OTP
  const handleVerifyOTPAndChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return showMessage('error', 'رمز عبور جدید و تکرار آن مطابقت ندارند.');
    setActionLoading(true);
    const res = await fetch("/api/student/profile", { method: "POST", body: JSON.stringify({ action: 'verify_otp_and_change', code: otpCode, newPassword }) });
    const data = await res.json() as any;
    if (res.ok) {
      showMessage('success', 'رمز عبور با موفقیت تنظیم شد.');
      setOtpMode(false); setOtpCode(""); setNewPassword(""); setConfirmPassword(""); setHasPassword(true);
    } else showMessage('error', data.error || 'کد اشتباه است');
    setActionLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-gray-800">
          <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400">تنظیمات حساب کاربری</h1>
          <Link href="/dashboard" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-bold transition">
            ← بازگشت به داشبورد
          </Link>
        </div>

        {msg.text && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border ${msg.type === 'success' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* بخش اطلاعات هویتی */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6 pb-2 border-b dark:border-gray-700">مشخصات فردی</h2>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">نام</label>
                  <input type="text" required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">نام خانوادگی</label>
                  <input type="text" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <button disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md mt-2">
                  ذخیره نام
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6 pb-2 border-b dark:border-gray-700">تغییر ایمیل</h2>
              {!emailOtpMode ? (
                <form onSubmit={handleRequestEmailChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">ایمیل جدید</label>
                    <input type="email" required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  </div>
                  {newEmail !== currentEmail && (
                    <button disabled={actionLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white p-3.5 rounded-xl font-bold transition shadow-md mt-2">
                      دریافت کد تایید ایمیل
                    </button>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                  <div className="text-sm text-gray-500 mb-2">کد ۶ رقمی به ایمیل جدید ارسال شد.</div>
                  <input type="text" required maxLength={6} placeholder="کد ۶ رقمی" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-center font-bold text-xl tracking-[0.3em]" dir="ltr" value={emailOtpCode} onChange={e => setEmailOtpCode(e.target.value)} />
                  <button disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                    تایید و تغییر ایمیل
                  </button>
                  <button type="button" onClick={() => setEmailOtpMode(false)} className="w-full text-xs text-gray-500 hover:text-gray-800 font-bold mt-2">انصراف</button>
                </form>
              )}
            </div>
          </div>

          {/* بخش امنیت و رمز عبور */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 h-fit">
            <h2 className="text-xl font-bold mb-6 pb-2 border-b dark:border-gray-700">امنیت و رمز عبور</h2>
            
            {!otpMode ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {hasPassword ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">رمز عبور فعلی</label>
                    <input type="password" required className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800 mb-4">
                    شما در حال حاضر رمز عبور ندارید. برای تنظیم رمز عبور، روی دکمه دریافت کد کلیک کنید.
                  </div>
                )}

                {hasPassword && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">رمز عبور جدید</label>
                      <input type="password" required minLength={8} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">تکرار رمز عبور جدید</label>
                      <input type="password" required minLength={8} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                      تغییر رمز عبور
                    </button>
                  </>
                )}

                <div className="pt-4 border-t dark:border-gray-700 mt-4 text-center">
                  <button type="button" onClick={handleRequestOTP} disabled={actionLoading} className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    {hasPassword ? 'رمز فعلی را فراموش کرده‌اید؟ (دریافت کد)' : 'دریافت کد تایید برای تنظیم رمز'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTPAndChange} className="space-y-4">
                <div className="text-sm text-gray-500 mb-2">کد ۶ رقمی به ایمیل شما ارسال شد.</div>
                <input type="text" required maxLength={6} placeholder="کد ۶ رقمی" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-center font-bold text-xl tracking-[0.3em]" dir="ltr" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">رمز عبور جدید</label>
                  <input type="password" required minLength={8} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-1">تکرار رمز عبور جدید</label>
                  <input type="password" required minLength={8} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none focus:border-blue-500 transition text-left" dir="ltr" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>

                <button disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">
                  تایید کد و ثبت رمز
                </button>
                <button type="button" onClick={() => setOtpMode(false)} className="w-full text-xs text-gray-500 hover:text-gray-800 font-bold mt-2">
                  انصراف
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}