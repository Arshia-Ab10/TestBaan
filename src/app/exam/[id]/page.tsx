"use client";
import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toFaNum } from "@/lib/utils";
import Modal from "@/components/Modal";
import { TAG_PALETTE, TagItem } from "@/lib/tags";

interface CheckModalState {
  qNum: number;
  isCorrect: boolean;
  correctOpt: number;
  hasKey: boolean;
  showCorrect: boolean;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: "alert" | "confirm";
  variant: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sheetId } = use(params);

  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [tagsMap, setTagsMap] = useState<Record<number, string[]>>({});
  const [userTags, setUserTags] = useState<TagItem[]>([]);
  const [activeTagPopover, setActiveTagPopover] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // فرم تگ جدید سریع داخل پاپ‌اور
  const [quickTagName, setQuickTagName] = useState("");
  const [quickTagColor, setQuickTagColor] = useState(TAG_PALETTE[0].color);

  // مودال بررسی پاسخ سوال
  const [checkModal, setCheckModal] = useState<CheckModalState | null>(null);

  // مودال دیالوگ
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
    variant: "info",
  });

  const [cols, setCols] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const openAlert = (title: string, message: string, variant: "info" | "warning" | "danger" | "success" = "info") => {
    setDialog({ isOpen: true, title, message, type: "alert", variant, confirmText: "متوجه شدم" });
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void, variant: "warning" | "danger" = "warning") => {
    setDialog({ isOpen: true, title, message, type: "confirm", variant, confirmText: "تایید و ادامه", cancelText: "انصراف", onConfirm });
  };

  useEffect(() => {
    fetchUserTags();
  }, []);

  const fetchUserTags = async () => {
    const res = await fetch("/api/student/tags");
    if (res.ok) setUserTags(await res.json());
  };

  useEffect(() => {
    const updateLayout = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const firstBlock = document.getElementById("block-0");
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
  }, [exam]);

  useEffect(() => {
    if (!sheetId) return;
    const hash = window.location.hash;
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);

    fetch("/api/student/exam", { method: "POST", body: JSON.stringify({ action: "fetch", sheetId }) })
      .then(res => res.json())
      .then((data: any) => {
        if (data.error) { setErrorMsg(data.error); return; }
        setExam(data.exam);
        const localAns = JSON.parse(localStorage.getItem(`ans_${sheetId}`) || '{}');
        const localTags = JSON.parse(localStorage.getItem(`tags_${sheetId}`) || '{}');
        const cloudAns = data.progress?.draft_answers ? JSON.parse(data.progress.draft_answers) : {};
        const cloudTags = data.progress?.question_flags ? JSON.parse(data.progress.question_flags) : {};
        
        setAnswers({ ...localAns, ...cloudAns });
        setTagsMap({ ...localTags, ...cloudTags });
      });
  }, [sheetId]);

  useEffect(() => {
    if (!exam || exam.type !== 'exam' || !exam.duration_minutes) return;

    const timerKey = `timer_${sheetId}`;
    let endTimeStr = localStorage.getItem(timerKey);
    let endTime: number;

    if (!endTimeStr) {
      endTime = Date.now() + exam.duration_minutes * 60 * 1000;
      localStorage.setItem(timerKey, endTime.toString());
    } else {
      endTime = parseInt(endTimeStr);
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        if (!loading) {
          openAlert("⏳ اتمام زمان آزمون", "زمان آزمون به پایان رسید. سیستم در حال ثبت خودکار پاسخ‌برگ است...", "warning");
          executeSubmit();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  useEffect(() => {
    if (!exam) return;
    localStorage.setItem(`ans_${sheetId}`, JSON.stringify(answers));
    localStorage.setItem(`tags_${sheetId}`, JSON.stringify(tagsMap));
  }, [answers, tagsMap, sheetId, exam]);

  const handleSaveCloud = async () => {
    setLoading(true);
    await fetch("/api/student/exam", { method: "POST", body: JSON.stringify({ action: "save_cloud", sheetId, userAnswers: answers, questionFlags: tagsMap }) });
    openAlert("ذخیره در فضای ابری ☁️", "پیش‌نویس پاسخ‌ها و تگ‌های سوالات در فضای ابری ذخیره شدند.", "success");
    setLoading(false);
  };

  const executeSubmit = async () => {
    setLoading(true);
    const res = await fetch("/api/student/exam", { method: "POST", body: JSON.stringify({ action: "submit", sheetId, userAnswers: answers, questionFlags: tagsMap }) });
    const data = (await res.json()) as any;
    
    if (data.success) {
      localStorage.removeItem(`ans_${sheetId}`);
      localStorage.removeItem(`tags_${sheetId}`);
      localStorage.removeItem(`timer_${sheetId}`);
      router.push(`/result/${sheetId}`);
    } else {
      openAlert("خطا در ثبت نهایی", data.error || "مشکلی در صدور کارنامه پیش آمد.", "danger");
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    openConfirm(
      "ثبت نهایی و صدور کارنامه",
      "آیا از ثبت نهایی پاسخ‌برگ اطمینان دارید؟\nپس از ثبت، کارنامه صادر می‌گردد.",
      executeSubmit,
      "warning"
    );
  };

  const handleInstantCheck = async (qNum: number) => {
    if (!answers[qNum]) {
      openAlert("پاسخی ثبت نشده", "لطفاً ابتدا یکی از گزینه‌ها را انتخاب کنید.", "warning");
      return;
    }
    const res = await fetch("/api/student/exam", { method: "POST", body: JSON.stringify({ action: "instant_check", sheetId, qNum, userAnswers: answers }) });
    const data = (await res.json()) as any;
    setCheckModal({ 
      qNum, 
      isCorrect: data.isCorrect, 
      correctOpt: data.correctOpt, 
      hasKey: data.hasKey !== false,
      showCorrect: false 
    });
  };

  const toggleQuestionTag = (qNum: number, tagId: string) => {
    setTagsMap(prev => {
      const current = prev[qNum] || [];
      const updated = current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId];
      return { ...prev, [qNum]: updated };
    });
  };

  const handleCreateQuickTag = async (qNum: number) => {
    if (!quickTagName.trim()) return;
    const res = await fetch("/api/student/tags", {
      method: "POST",
      body: JSON.stringify({ name: quickTagName, color: quickTagColor })
    });
    if (res.ok) {
      const created = await res.json() as any;
      setUserTags(prev => [...prev, created]);
      toggleQuestionTag(qNum, created.id);
      setQuickTagName("");
    }
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${toFaNum(m)}:${toFaNum(s.toString().padStart(2, '0'))}`;
  };

  if (errorMsg) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">{errorMsg}</div>;
  if (!exam) return <div className="min-h-screen flex items-center justify-center font-bold">در حال بارگذاری...</div>;

  const blocks: number[][] = [];
  for (let i = 0; i < exam.total_questions; i += 10) {
    const chunk = [];
    for (let j = i; j < Math.min(i + 10, exam.total_questions); j++) { chunk.push(exam.start_question_number + j); }
    blocks.push(chunk);
  }

  const totalBlocks = blocks.length;
  const numRows = Math.max(1, Math.ceil(totalBlocks / cols));

  const orderedBlocks: (number[] | null)[] = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < cols; c++) {
      const blockIndex = c * numRows + r;
      if (blockIndex < totalBlocks) orderedBlocks.push(blocks[blockIndex]);
      else orderedBlocks.push(null);
    }
  }

  const answeredCount = Object.values(answers).filter(val => val > 0).length;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-16">
      {/* هدر بالایی */}
      <div className="sticky top-0 z-40 bg-blue-600/95 backdrop-blur text-white px-6 py-4 shadow-lg border-b border-blue-500 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{toFaNum(exam.title)}</h1>
            <p className="text-xs text-blue-100 mt-1">پاسخ داده شده: {toFaNum(answeredCount)} از {toFaNum(exam.total_questions)}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            {timeLeft !== null && (
              <div dir="ltr" className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 transition-colors ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-gray-900/50'}`}>
                ⏱️ {formatTimerDisplay(timeLeft)}
              </div>
            )}
            <Link href="/bookmarks" target="_blank" className="bg-blue-700 hover:bg-blue-800 px-3.5 py-2.5 rounded-xl font-bold text-sm transition shadow flex items-center gap-1.5">
              🏷️ بانک تست‌ها
            </Link>
            <button onClick={handleSaveCloud} disabled={loading} className="bg-blue-800 hover:bg-blue-900 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow">ذخیره ابری ☁️</button>
            <button onClick={handleSubmit} disabled={loading} className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2.5 rounded-xl font-bold shadow transition">ثبت نهایی</button>
          </div>
        </div>
      </div>

      {/* چیدمان بلوک‌های پاسخ‌برگ */}
      <div className="max-w-7xl mx-auto px-4" dir="ltr" ref={containerRef}>
        <div 
          className="grid gap-6 items-start"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {orderedBlocks.map((block, idx) => {
            if (!block) return <div key={`empty-${idx}`} />;
            const blockId = block[0] === exam.start_question_number ? "block-0" : undefined;
            return (
              <div key={idx} id={blockId} className="w-max mx-auto bg-white/90 dark:bg-gray-800/90 p-4 rounded-3xl border dark:border-gray-700 shadow-sm flex flex-col gap-2.5">
                {block.map(q => {
                  const assignedTagIds = tagsMap[q] || [];
                  const activeTags = assignedTagIds.map(tid => userTags.find(t => t.id === tid)).filter(Boolean);

                  return (
                    <div key={q} id={`q-${q}`} className="relative flex items-center justify-between gap-3 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition">
                      
                      {/* نشانگر تگ (چندرنگ) */}
                      <button 
                        onClick={() => setActiveTagPopover(activeTagPopover === q ? null : q)} 
                        title="تگ‌گذاری سوال"
                        className="w-4 h-4 rounded-full flex-shrink-0 flex overflow-hidden border border-gray-300 dark:border-gray-600 hover:scale-125 transition-transform"
                      >
                        {activeTags.length === 0 ? (
                          <span className="w-full h-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition" />
                        ) : (
                          activeTags.map((at: any, i) => (
                            <span key={i} className="h-full flex-1" style={{ backgroundColor: at.color }} />
                          ))
                        )}
                      </button>

                      {/* پاپ‌اور شناور تگ‌گذاری */}
                      {activeTagPopover === q && (
                        <div className="absolute top-10 right-0 z-50 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-2xl rounded-2xl p-4 text-right dir-rtl animate-in fade-in">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-700">
                            <span className="font-bold text-xs text-gray-700 dark:text-gray-300">تگ‌های سوال {toFaNum(q)}</span>
                            <button onClick={() => setActiveTagPopover(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                          </div>

                          {/* لیست تگ‌ها */}
                          <div className="space-y-1.5 max-h-36 overflow-y-auto mb-3 pr-1">
                            {userTags.map(t => (
                              <label key={t.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{t.name}</span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={assignedTagIds.includes(t.id)}
                                  onChange={() => toggleQuestionTag(q, t.id)}
                                  className="w-4 h-4 accent-blue-600 rounded"
                                />
                              </label>
                            ))}
                          </div>

                          {/* افزودن تگ سریع */}
                          <div className="pt-2 border-t dark:border-gray-700 flex flex-col gap-2">
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="تگ جدید..."
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-xs outline-none"
                                value={quickTagName}
                                onChange={e => setQuickTagName(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateQuickTag(q)}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition flex-shrink-0"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-1 overflow-x-auto pb-1">
                              {TAG_PALETTE.slice(0, 8).map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setQuickTagColor(p.color)}
                                  className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${quickTagColor === p.color ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                                  style={{ backgroundColor: p.color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <button onClick={() => handleInstantCheck(q)} className="font-bold text-sm text-gray-600 dark:text-gray-300 w-8 font-mono text-right hover:text-blue-500 cursor-pointer">
                        {toFaNum(q)}
                      </button>

                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(opt => (
                          <button key={opt} onClick={() => setAnswers(prev => ({ ...prev, [q]: prev[q] === opt ? 0 : opt }))}
                            className={`w-8 h-8 rounded-full font-bold text-sm border-2 transition-all flex items-center justify-center ${answers[q] === opt ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'}`}>
                            {toFaNum(opt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* مودال بررسی آنی سوال */}
      {checkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center border dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4">بررسی سوال {toFaNum(checkModal.qNum)}</h3>
            
            {!checkModal.hasKey ? (
              <div className="text-amber-600 text-sm font-bold mb-6 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 leading-relaxed">
                ⚠️ پاسخی برای این سوال توسط طراح مشخص نشده است.
              </div>
            ) : checkModal.isCorrect ? (
              <div className="text-emerald-600 text-2xl font-black mb-6">✅ صحیح!</div>
            ) : (
              <div className="text-red-600 text-2xl font-black mb-6">❌ غلط!</div>
            )}

            {checkModal.hasKey && !checkModal.isCorrect && !checkModal.showCorrect && (
              <button onClick={() => setCheckModal({...checkModal, showCorrect: true})} className="text-blue-600 underline text-sm mb-4 block w-full font-bold">
                نمایش گزینه صحیح
              </button>
            )}
            
            {checkModal.hasKey && checkModal.showCorrect && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-xl font-bold mb-4 border border-emerald-200 dark:border-emerald-800">
                گزینه صحیح: {toFaNum(checkModal.correctOpt)}
              </div>
            )}

            <button onClick={() => setCheckModal(null)} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-3 rounded-xl font-bold transition text-sm">
              بستن
            </button>
          </div>
        </div>
      )}

      {/* مودال دیالوگ */}
      <Modal
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        variant={dialog.variant}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
      />
    </div>
  );
}