"use client";
import { useState, useEffect, useRef } from "react";
import { toFaNum, toEnNum } from "@/lib/utils";
import Modal from "@/components/Modal";

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("exams");
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [answerSheets, setAnswerSheets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [allSheets, setAllSheets] = useState<any[]>([]);
  const [adminResults, setAdminResults] = useState<any[]>([]);
  
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // مودال تاییدیه ادمین
  const [confirmDialog, setConfirmDialog] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [bookTitle, setBookTitle] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetType, setSheetType] = useState("practice");
  const [duration, setDuration] = useState("");
  const [startNum, setStartNum] = useState("1");
  const [totalQuestions, setTotalQuestions] = useState("10");
  const [subjectsMap, setSubjectsMap] = useState("");
  const [keys, setKeys] = useState<Record<number, number>>({});
  const [fastPasteText, setFastPasteText] = useState("");

  const [cols, setCols] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [forwardHistory, setForwardHistory] = useState<any[]>([]);

  useEffect(() => { 
    fetchBooks(); 
    fetchAllSheets(); 
  }, []);

  useEffect(() => { 
    if (selectedBook) fetchAnswerSheets(selectedBook.id); 
  }, [selectedBook]);

  useEffect(() => { 
    if (selectedUser) fetchPermissions(selectedUser.id); 
  }, [selectedUser]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setForwardHistory([]);
    setMessage("");

    if (tab === 'exams') {
      setSelectedBook(null);
      fetchBooks();
      fetchAllSheets();
    } else if (tab === 'users') {
      setSelectedUser(null);
      fetchUsers();
      fetchBooks();
      fetchAllSheets();
    } else if (tab === 'results') {
      fetchAdminResults();
    }
  };

  const fetchBooks = async () => { const res = await fetch("/api/books"); if (res.ok) setBooks(await res.json()); };
  const fetchAllSheets = async () => { const res = await fetch("/api/answer-sheets"); if (res.ok) setAllSheets(await res.json()); };
  const fetchAnswerSheets = async (bookId: string) => { const res = await fetch(`/api/answer-sheets?book_id=${bookId}`); if (res.ok) setAnswerSheets(await res.json()); };
  const fetchUsers = async () => { const res = await fetch("/api/admin/users"); if (res.ok) setUsers(await res.json()); };
  const fetchPermissions = async (userId: string) => { const res = await fetch(`/api/admin/permissions?userId=${userId}`); if (res.ok) setUserPermissions(await res.json()); };
  const fetchAdminResults = async () => { 
    const res = await fetch("/api/admin/results"); 
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAdminResults(data);
    }
  };

  const generateFastPasteString = (start: number, total: number, currentKeys: Record<number, number>) => {
    let str = "";
    for (let i = 0; i < total; i++) {
      const q = start + i;
      const k = currentKeys[q];
      str += (k && k >= 1 && k <= 4) ? String(k) : "?";
    }
    return str;
  };

  const toggleKey = (qNum: number, opt: number) => {
    setKeys(prev => {
      const newOpt = prev[qNum] === opt ? 0 : opt;
      const nextKeys = { ...prev, [qNum]: newOpt };
      const s = parseInt(toEnNum(startNum)) || 1;
      const t = parseInt(toEnNum(totalQuestions)) || 10;
      setFastPasteText(generateFastPasteString(s, t, nextKeys));
      return nextKeys;
    });
  };

  const handleFastPasteChange = (text: string) => {
    const enText = toEnNum(text);
    setFastPasteText(enText);
    const chars = enText.split('');
    const newKeys: Record<number, number> = {};
    const start = parseInt(toEnNum(startNum)) || 1;
    const total = parseInt(toEnNum(totalQuestions)) || 10;

    chars.forEach((char, index) => {
      if (index < total) {
        const q = start + index;
        if (['1', '2', '3', '4'].includes(char)) {
          newKeys[q] = parseInt(char, 10);
        } else {
          newKeys[q] = 0;
        }
      }
    });

    setKeys(prev => ({ ...prev, ...newKeys }));
  };

  const handleTotalQuestionsChange = (val: string) => {
    setTotalQuestions(val);
    const s = parseInt(toEnNum(startNum)) || 1;
    const t = parseInt(toEnNum(val)) || 1;
    setFastPasteText(generateFastPasteString(s, t, keys));
  };

  const handleStartNumChange = (val: string) => {
    setStartNum(val);
    const s = parseInt(toEnNum(val)) || 1;
    const t = parseInt(toEnNum(totalQuestions)) || 10;
    setFastPasteText(generateFastPasteString(s, t, keys));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (e.key === 'ArrowRight') {
          if (editingSheetId) { setForwardHistory(prev => [...prev, { type: 'sheet', id: editingSheetId }]); setEditingSheetId(null); }
          else if (selectedBook) { setForwardHistory(prev => [...prev, { type: 'book', book: selectedBook }]); setSelectedBook(null); }
          else if (activeTab !== 'exams') { setForwardHistory(prev => [...prev, { type: 'tab', tab: activeTab }]); handleTabChange('exams'); }
        } else if (e.key === 'ArrowLeft') {
          if (forwardHistory.length > 0) {
            const last = forwardHistory[forwardHistory.length - 1];
            setForwardHistory(prev => prev.slice(0, -1));
            if (last.type === 'sheet') setEditingSheetId(last.id);
            else if (last.type === 'book') setSelectedBook(last.book);
            else if (last.type === 'tab') handleTabChange(last.tab);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedBook, editingSheetId, forwardHistory]);

  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current && parseInt(toEnNum(totalQuestions)) > 0) {
        const width = containerRef.current.clientWidth;
        const firstBlock = document.getElementById("admin-block-0");
        const blockWidth = firstBlock ? firstBlock.offsetWidth : 250;
        const gap = 24; 
        let calculatedCols = Math.floor((width + gap) / (blockWidth + gap));
        setCols(calculatedCols > 0 ? calculatedCols : 1);
      }
    };
    updateLayout();
    const timer = setTimeout(updateLayout, 100);
    window.addEventListener('resize', updateLayout);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateLayout); };
  }, [totalQuestions, activeTab, selectedBook, editingSheetId]);

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const method = editingBookId ? "PUT" : "POST";
    const payload = editingBookId ? { id: editingBookId, title: bookTitle, description: bookDesc } : { title: bookTitle, description: bookDesc };
    const res = await fetch("/api/books", { method, body: JSON.stringify(payload) });
    if (res.ok) { 
      setMessage(editingBookId ? "✅ مجموعه ویرایش شد" : "✅ مجموعه اضافه شد"); 
      setBookTitle(""); setBookDesc(""); setEditingBookId(null); fetchBooks(); 
    }
    setLoading(false);
  };

  const startEditBook = (b: any) => { setEditingBookId(b.id); setBookTitle(b.title); setBookDesc(b.description || ""); };

  const handleDeleteBook = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "حذف مجموعه",
      message: "آیا از حذف این مجموعه اطمینان دارید؟\nتمام پاسخ‌برگ‌ها و نتایج زیرمجموعه آن نیز حذف خواهند شد.",
      onConfirm: async () => {
        await fetch(`/api/books?id=${id}`, { method: "DELETE" });
        fetchBooks();
        if (selectedBook?.id === id) setSelectedBook(null);
      },
    });
  };

  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const s = parseInt(toEnNum(startNum)) || 1;
    const t = parseInt(toEnNum(totalQuestions)) || 10;
    
    const payload = {
      id: editingSheetId, book_id: selectedBook.id, title: sheetTitle, type: sheetType,
      duration_minutes: duration ? parseInt(toEnNum(duration)) : null, 
      start_question_number: s, 
      total_questions: t, 
      correct_keys: keys,
      subjects_map: subjectsMap
    };
    const res = await fetch("/api/answer-sheets", { method: editingSheetId ? "PUT" : "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      setMessage(editingSheetId ? "✅ پاسخ‌برگ ویرایش شد" : "✅ پاسخ‌برگ ساخته شد");
      setSheetTitle(""); setKeys({}); setEditingSheetId(null); setFastPasteText(""); setSubjectsMap("");
      fetchAnswerSheets(selectedBook.id); fetchAllSheets();
    }
    setLoading(false);
  };

  const startEditSheet = (s: any) => {
    setEditingSheetId(s.id); setSheetTitle(s.title); setSheetType(s.type);
    setDuration(s.duration_minutes ? String(s.duration_minutes) : ""); 
    setStartNum(String(s.start_question_number)); 
    setTotalQuestions(String(s.total_questions)); 
    const k = s.correct_keys || {};
    setKeys(k);
    setSubjectsMap(s.subjects_map || "");
    setFastPasteText(generateFastPasteString(s.start_question_number, s.total_questions, k));
  };

  const handleDeleteSheet = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "حذف پاسخ‌برگ",
      message: "آیا از حذف این پاسخ‌برگ اطمینان دارید؟\nتمام کارنامه‌ها و پیش‌نویس‌های مرتبط با آن حذف خواهند شد.",
      onConfirm: async () => {
        await fetch(`/api/answer-sheets?id=${id}`, { method: "DELETE" });
        fetchAnswerSheets(selectedBook.id);
        fetchAllSheets();
      },
    });
  };

  const moveSheet = async (index: number, direction: 'up' | 'down') => {
    const newSheets = [...answerSheets];
    if (direction === 'up' && index > 0) [newSheets[index - 1], newSheets[index]] = [newSheets[index], newSheets[index - 1]];
    else if (direction === 'down' && index < newSheets.length - 1) [newSheets[index + 1], newSheets[index]] = [newSheets[index], newSheets[index + 1]];
    else return;
    setAnswerSheets(newSheets);
    await fetch('/api/answer-sheets', { method: 'PATCH', body: JSON.stringify({ orderedIds: newSheets.map(s => s.id) }) });
    fetchAllSheets();
  };

  const handleSavePermissions = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/permissions", { method: "POST", body: JSON.stringify({ userId: selectedUser.id, sheetIds: userPermissions }) });
    if (res.ok) setMessage("✅ دسترسی‌ها ذخیره شد");
    setLoading(false);
  };

  const togglePermission = (sheetId: string) => { setUserPermissions(prev => prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]); };

  const parsedStart = parseInt(toEnNum(startNum)) || 1;
  const parsedTotal = parseInt(toEnNum(totalQuestions)) || 10;

  const adminBlocks: number[][] = [];
  for (let i = 0; i < parsedTotal; i += 10) {
    const chunk = [];
    for (let j = i; j < Math.min(i + 10, parsedTotal); j++) chunk.push(parsedStart + j);
    adminBlocks.push(chunk);
  }

  const adminTotalBlocks = adminBlocks.length;
  const adminNumRows = Math.max(1, Math.ceil(adminTotalBlocks / cols));

  const adminOrderedBlocks: (number[] | null)[] = [];
  for (let r = 0; r < adminNumRows; r++) {
    for (let c = 0; c < cols; c++) {
      const blockIndex = c * adminNumRows + r;
      if (blockIndex < adminTotalBlocks) adminOrderedBlocks.push(adminBlocks[blockIndex]);
      else adminOrderedBlocks.push(null);
    }
  }

  const formatPersianDate = (dateString: string) => {
    if (!dateString) return '-';
    try { 
      const clean = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
      return new Date(clean).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); 
    } catch { return '-'; }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-6 border-b pb-4 dark:border-gray-800 gap-4">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">پنل مدیریت تست‌بان</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleTabChange('exams')} className={`px-5 py-2.5 rounded-xl font-bold transition shadow-sm ${activeTab === 'exams' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-700'}`}>آزمون‌ها</button>
            <button onClick={() => handleTabChange('users')} className={`px-5 py-2.5 rounded-xl font-bold transition shadow-sm ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-700'}`}>کاربران</button>
            <button onClick={() => handleTabChange('results')} className={`px-5 py-2.5 rounded-xl font-bold transition shadow-sm ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border dark:border-gray-700'}`}>کارنامه‌ها</button>
            <a href="/" className="px-5 py-2.5 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-900 shadow-sm transition mr-auto">صفحه اصلی</a>
          </div>
        </div>

        {message && <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-2xl text-center font-bold border border-green-200">{message}</div>}

        {activeTab === 'results' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700">
            <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-3">
              <h2 className="text-xl font-bold">آخرین کارنامه‌های صادر شده</h2>
              <button onClick={fetchAdminResults} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition">
                🔄 تازه‌سازی داده‌ها
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-4 rounded-r-xl font-bold">دانش‌آموز</th>
                    <th className="p-4 font-bold">نام آزمون</th>
                    <th className="p-4 font-bold">نسخه</th>
                    <th className="p-4 font-bold">درصد کل</th>
                    <th className="p-4 rounded-l-xl text-left font-bold">تاریخ ثبت نهایی</th>
                  </tr>
                </thead>
                <tbody>
                  {adminResults.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{r.first_name || r.last_name ? `${r.first_name || ''} ${r.last_name || ''}` : 'کاربر بدون نام'}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">{r.email}</div>
                      </td>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400">{toFaNum(r.exam_title)}</td>
                      <td className="p-4 font-bold text-gray-500">v{toFaNum(r.version)}</td>
                      <td className="p-4 font-black text-lg" dir="ltr">
                        <span className={r.score_percentage >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}>
                          %{toFaNum(r.score_percentage)}
                        </span>
                      </td>
                      <td className="p-4 text-left text-xs text-gray-500">{formatPersianDate(r.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminResults.length === 0 && <div className="text-center p-12 text-gray-500 font-bold">هیچ کارنامه‌ای یافت نشد.</div>}
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          !selectedBook ? (
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 h-fit">
                <h2 className="text-lg font-bold mb-5">{editingBookId ? 'ویرایش مجموعه' : 'افزودن مجموعه جدید'}</h2>
                <form onSubmit={handleSaveBook} className="space-y-4">
                  <input required placeholder="نام کتاب یا آزمون" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
                  <textarea placeholder="توضیحات" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={bookDesc} onChange={e => setBookDesc(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition">{editingBookId ? 'ذخیره تغییرات' : 'ثبت مجموعه'}</button>
                    {editingBookId && <button type="button" onClick={() => {setEditingBookId(null); setBookTitle(""); setBookDesc("");}} className="bg-gray-500 hover:bg-gray-600 text-white px-4 rounded-xl font-bold transition">انصراف</button>}
                  </div>
                </form>
              </div>
              <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                {books.map(b => (
                  <div key={b.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-xl">{toFaNum(b.title)}</h3>
                        <button onClick={() => startEditBook(b)} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold hover:bg-amber-200 transition">ویرایش ✏️</button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{toFaNum(b.description)}</p>
                    </div>
                    <div className="flex gap-2 mt-6 pt-4 border-t dark:border-gray-700">
                      <button onClick={() => {setSelectedBook(b); setForwardHistory([]);}} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold transition">مدیریت پاسخ‌برگ‌ها</button>
                      <button onClick={() => handleDeleteBook(b.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm transition font-bold">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <button onClick={() => {setSelectedBook(null); setForwardHistory([]);}} className="bg-white dark:bg-gray-800 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">← بازگشت به مجموعه‌ها</button>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 md:col-span-3">
                  <h3 className="text-xl font-bold mb-6 pb-2 border-b dark:border-gray-700">{editingSheetId ? 'ویرایش پاسخ‌برگ' : 'افزودن پاسخ‌برگ جدید'}</h3>
                  <form onSubmit={handleSaveSheet} className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <input required placeholder="عنوان (مثلا فصل ۱)" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={sheetTitle} onChange={e => setSheetTitle(e.target.value)} />
                      <select className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={sheetType} onChange={e => setSheetType(e.target.value)}><option value="practice">تست عادی</option><option value="exam">آزمون زمان‌دار</option></select>
                      <input type="text" inputMode="numeric" placeholder="زمان (دقیقه)" disabled={sheetType === 'practice'} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50" value={duration} onChange={e => setDuration(e.target.value)} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <input type="text" inputMode="numeric" placeholder="شروع سوال" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={startNum} onChange={e => handleStartNumChange(e.target.value)} />
                      <input type="text" inputMode="numeric" placeholder="تعداد سوال" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={totalQuestions} onChange={e => handleTotalQuestionsChange(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 text-blue-600 dark:text-blue-400">دسته‌بندی مباحث (اختیاری):</label>
                      <input type="text" placeholder="مثال: ریاضی: 1-10, 15 | فیزیک: 11-14, 16-20" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-left" dir="ltr" value={subjectsMap} onChange={e => setSubjectsMap(e.target.value)} />
                      <p className="text-xs text-gray-500 mt-1">با این کار، در کارنامه درصد هر درس/مبحث به صورت جداگانه محاسبه می‌شود.</p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-blue-600 dark:text-blue-400">ورود سریع کلیدها (برای سوالات بدون پاسخ از ? استفاده کنید):</label>
                        <span className="text-xs text-gray-400 font-mono">طول: {fastPasteText.length} از {parsedTotal}</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="مثال: 1234?1234..." 
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-mono tracking-[0.25em] text-left uppercase" 
                        dir="ltr" 
                        value={fastPasteText} 
                        onChange={e => handleFastPasteChange(e.target.value)} 
                      />
                    </div>

                    <div className="mt-8 bg-gray-50/50 dark:bg-gray-900/30 p-6 rounded-3xl border dark:border-gray-700" dir="ltr" ref={containerRef}>
                      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {adminOrderedBlocks.map((block, bIdx) => {
                          if (!block) return <div key={`admin-empty-${bIdx}`} />;
                          const blockId = block[0] === parsedStart ? "admin-block-0" : undefined;
                          return (
                            <div key={bIdx} id={blockId} className="w-max mx-auto bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm flex flex-col gap-2.5">
                              {block.map(qNum => (
                                <div key={qNum} className="flex items-center justify-start gap-4 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition">
                                  <span className="font-bold text-sm text-gray-600 dark:text-gray-300 w-8 font-mono text-right dir-ltr">
                                    {toFaNum(qNum)}
                                  </span>
                                  <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(opt => (
                                      <button key={opt} type="button" onClick={() => toggleKey(qNum, opt)}
                                        className={`w-8 h-8 rounded-full text-sm font-bold border-2 transition-all flex items-center justify-center ${keys[qNum] === opt ? 'bg-emerald-600 text-white border-emerald-600 shadow scale-105' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-500'}`}>
                                        {toFaNum(opt)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t dark:border-gray-700">
                      <button disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-bold transition shadow-md">{editingSheetId ? 'ذخیره تغییرات' : 'ثبت پاسخ‌برگ'}</button>
                      {editingSheetId && <button type="button" onClick={() => {setEditingSheetId(null); setSheetTitle(""); setKeys({}); setFastPasteText(""); setSubjectsMap("");}} className="bg-gray-500 hover:bg-gray-600 text-white px-8 rounded-xl font-bold transition">انصراف</button>}
                    </div>
                  </form>
                </div>

                <div className="md:col-span-3 space-y-4">
                  <h3 className="text-xl font-bold mb-4">پاسخ‌برگ‌های این مجموعه</h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {answerSheets.map((s, index) => (
                      <div key={s.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 flex flex-col justify-between relative group">
                        <div className="absolute top-4 left-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveSheet(index, 'up')} disabled={index === 0} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg disabled:opacity-30 transition">⬆️</button>
                          <button onClick={() => moveSheet(index, 'down')} disabled={index === answerSheets.length - 1} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg disabled:opacity-30 transition">⬇️</button>
                        </div>
                        <div>
                          <span className="font-bold text-xl">{toFaNum(s.title)}</span>
                          <p className="text-sm text-gray-500 mt-2">{toFaNum(s.total_questions)} سوال | {s.type === 'exam' ? `زمان‌دار (${toFaNum(s.duration_minutes)} دقیقه)` : 'تست عادی'}</p>
                        </div>
                        <div className="flex gap-2 mt-6 pt-4 border-t dark:border-gray-700">
                          <button onClick={() => startEditSheet(s)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold transition">ویرایش</button>
                          <button onClick={() => handleDeleteSheet(s.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">حذف</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'users' && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border dark:border-gray-700 h-fit">
              <div className="flex justify-between items-center mb-6 pb-2 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold">لیست کاربران</h2>
                <button onClick={fetchUsers} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-100 transition">
                  🔄
                </button>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {users.map(u => (
                  <button key={u.id} onClick={() => setSelectedUser(u)} className={`w-full text-right p-4 rounded-2xl border transition ${selectedUser?.id === u.id ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-500 shadow-sm' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-700'}`}>
                    <div className="font-bold flex justify-between items-center">
                      <span className="text-lg">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : 'کاربر بدون نام'}</span>
                      {u.role === 'admin' && <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 px-2.5 py-1 rounded-full font-bold">مدیر</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 font-mono">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedUser && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border dark:border-gray-700">
                <h2 className="text-xl font-bold mb-6 pb-3 border-b dark:border-gray-700">مدیریت دسترسی: <span className="text-blue-600 dark:text-blue-400">{selectedUser.first_name || selectedUser.last_name ? `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}` : selectedUser.email}</span></h2>
                <div className="space-y-6 max-h-[500px] overflow-y-auto mb-8 pr-3">
                  {books.map(book => {
                    const bookSheets = allSheets.filter(s => s.book_id === book.id);
                    if(bookSheets.length === 0) return null;
                    return (
                      <div key={book.id} className="border dark:border-gray-700 rounded-2xl p-5 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">{toFaNum(book.title)}</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {bookSheets.map(sheet => (
                            <label key={sheet.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 cursor-pointer hover:border-blue-400 transition shadow-sm">
                              <input type="checkbox" checked={userPermissions.includes(sheet.id)} onChange={() => togglePermission(sheet.id)} className="w-5 h-5 accent-blue-600 rounded" />
                              <span className="text-sm font-bold">{toFaNum(sheet.title)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button onClick={handleSavePermissions} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-bold text-lg transition shadow-lg">ذخیره نهایی دسترسی‌ها</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* مودال تایید حذف ادمین */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="confirm"
        variant="danger"
        confirmText="حذف نهایی"
        cancelText="انصراف"
      />
    </div>
  );
}