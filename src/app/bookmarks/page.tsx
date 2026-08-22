"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toFaNum } from "@/lib/utils";
import { TAG_PALETTE, TagItem } from "@/lib/tags";

export default function BookmarksPage() {
  const [data, setData] = useState<any[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // فیلترها
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // مودال مدیریت تگ‌ها
  const [manageTagsOpen, setManageTagsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0].color);
  const [tagActionLoading, setTagActionLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const [bookmarksRes, tagsRes] = await Promise.all([
      fetch("/api/student/bookmarks"),
      fetch("/api/student/tags")
    ]);
    if (bookmarksRes.ok) setData(await bookmarksRes.json());
    if (tagsRes.ok) setTags(await tagsRes.json());
    setLoading(false);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagActionLoading(true);
    const res = await fetch("/api/student/tags", {
      method: "POST",
      body: JSON.stringify({ name: newTagName, color: newTagColor })
    });
    if (res.ok) {
      const created = await res.json() as any;
      setTags(prev => [...prev, created]);
      setNewTagName("");
    }
    setTagActionLoading(false);
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("آیا از حذف این تگ اطمینان دارید؟")) return;
    await fetch(`/api/student/tags?id=${id}`, { method: "DELETE" });
    setTags(prev => prev.filter(t => t.id !== id));
    fetchInitialData();
  };

  // استخراج لیست کتاب‌ها برای فیلتر
  const booksMap = new Map();
  data.forEach(item => booksMap.set(item.bookId, item.bookTitle));
  const uniqueBooks = Array.from(booksMap.entries());

  // فیلتر کردن داده‌ها
  const filteredData = data.filter(item => {
    if (selectedTag && !item.tags.some((t: any) => t.id === selectedTag)) return false;
    if (selectedBook && item.bookId !== selectedBook) return false;
    if (selectedStatus && item.status !== selectedStatus) return false;
    if (searchTerm) {
      const qFa = toFaNum(item.questionNumber);
      const text = `${item.bookTitle} ${item.sheetTitle} سوال ${item.questionNumber} ${qFa}`.toLowerCase();
      if (!text.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'correct':
        return <span className="text-xs bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg">✅ پاسخ درست</span>;
      case 'wrong':
        return <span className="text-xs bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold px-2.5 py-1 rounded-lg">❌ پاسخ غلط</span>;
      case 'empty':
        return <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold px-2.5 py-1 rounded-lg">⚪ نزده</span>;
      default:
        return <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-lg">⚠️ بدون کلید</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        
        {/* هدر */}
        <div className="flex flex-wrap justify-between items-center mb-8 border-b pb-4 dark:border-gray-800 gap-4">
          <div>
            <h1 className="text-3xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-3">
              بانک تست‌های نشان‌دار 🏷️
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              مجموعاً {toFaNum(data.length)} تست نشان‌گذاری شده در حساب شما
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setManageTagsOpen(true)} className="bg-white dark:bg-gray-800 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition">
              مدیریت تگ‌ها ⚙️
            </button>
            <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow transition">
              ← بازگشت به داشبورد
            </Link>
          </div>
        </div>

        {/* فیلتر تگ‌ها (Chips) */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm border ${
              selectedTag === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            همه تگ‌ها ({toFaNum(data.length)})
          </button>
          {tags.map(tag => {
            const count = data.filter(d => d.tags.some((t: any) => t.id === tag.id)).length;
            const isSelected = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm border ${
                  isSelected ? 'ring-2 ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-transparent' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                <span>{tag.name}</span>
                <span className="opacity-60 font-mono">({toFaNum(count)})</span>
              </button>
            );
          })}
        </div>

        {/* فیلترهای تکمیلی (کتاب، وضعیت، جستجو) */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
          <input
            type="text"
            placeholder="جستجو در عنوان کتاب، آزمون یا شماره سوال..."
            className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none text-sm focus:border-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none text-sm font-bold"
            value={selectedBook || ""}
            onChange={e => setSelectedBook(e.target.value || null)}
          >
            <option value="">همه کتاب‌ها و مجموعه‌ها</option>
            {uniqueBooks.map(([id, title]) => (
              <option key={id} value={id}>{toFaNum(title)}</option>
            ))}
          </select>

          <select
            className="p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 outline-none text-sm font-bold"
            value={selectedStatus || ""}
            onChange={e => setSelectedStatus(e.target.value || null)}
          >
            <option value="">همه وضعیت‌های پاسخ</option>
            <option value="correct">فقط پاسخ‌های درست</option>
            <option value="wrong">فقط پاسخ‌های غلط</option>
            <option value="empty">فقط نزده‌ها</option>
            <option value="no_key">بدون کلید / حذف‌شده</option>
          </select>
        </div>

        {/* لیست سوالات نشان‌دار */}
        {loading ? (
          <div className="py-20 text-center text-gray-400 font-bold">در حال بارگذاری تست‌های نشان‌دار...</div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-16 rounded-3xl text-center border dark:border-gray-700 shadow-sm">
            <span className="text-5xl block mb-4">🏷️</span>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">هیچ تستی با این فیلترها یافت نشد!</h3>
            <p className="text-sm text-gray-500">می‌توانید در حین برگزاری هر آزمون با کلیک روی نشانگر کنار سوال، آن را علامت‌گذاری کنید.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredData.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border dark:border-gray-700 shadow-sm flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-gray-400">{toFaNum(item.bookTitle)}</span>
                    {getStatusBadge(item.status)}
                  </div>

                  <h4 className="text-lg font-bold mb-3 flex items-center justify-between">
                    <span>{toFaNum(item.sheetTitle)}</span>
                    <span className="text-blue-600 dark:text-blue-400 text-xl font-black font-mono">
                      سوال {toFaNum(item.questionNumber)}
                    </span>
                  </h4>

                  {/* تگ‌های سوال */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {item.tags.map((t: any) => (
                      <span
                        key={t.id}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white shadow-sm flex items-center gap-1"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t dark:border-gray-700 flex justify-between items-center gap-2">
                  <div className="text-xs text-gray-500 font-bold">
                    {item.userAnswer ? `شما: ${toFaNum(item.userAnswer)}` : 'بدون پاسخ'}
                    {item.correctAnswer && ` | کلید: ${toFaNum(item.correctAnswer)}`}
                  </div>

                  <Link
                    href={`/exam/${item.sheetId}#q-${item.questionNumber}`}
                    className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
                  >
                    مشاهده سوال ←
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* مودال مدیریت تگ‌ها */}
      {manageTagsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-2 border-b dark:border-gray-700">
              <h3 className="text-xl font-bold">مدیریت تگ‌های اختصاصی</h3>
              <button onClick={() => setManageTagsOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            {/* فرم ساخت تگ جدید */}
            <form onSubmit={handleCreateTag} className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-500">افزودن تگ جدید:</h4>
              <input
                type="text"
                required
                placeholder="عنوان تگ (مثلا: مرور فرمول‌ها)"
                className="w-full p-3 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-600 text-sm outline-none"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">انتخاب رنگ تگ:</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_PALETTE.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewTagColor(p.color)}
                      className={`w-6 h-6 rounded-full transition-transform ${newTagColor === p.color ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`}
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
              </div>

              <button disabled={tagActionLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold text-xs transition shadow">
                {tagActionLoading ? "در حال ایجاد..." : "+ ایجاد تگ"}
              </button>
            </form>

            {/* لیست تگ‌های موجود */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {tags.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: t.color }} />
                    <span className="font-bold text-sm">{t.name}</span>
                  </div>
                  <button onClick={() => handleDeleteTag(t.id)} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-lg transition font-bold">
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setManageTagsOpen(false)} className="w-full mt-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 p-3 rounded-xl font-bold text-sm transition">
              بستن
            </button>
          </div>
        </div>
      )}

    </div>
  );
}