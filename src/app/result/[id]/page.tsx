"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { toFaNum, toEnNum } from "@/lib/utils";

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sheetId } = use(params);

  const [versions, setVersions] = useState<any[]>([]);
  const [selectedV, setSelectedV] = useState<number>(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sheetId) return;
    fetch(`/api/student/result?sheetId=${sheetId}`)
      .then(res => res.json())
      .then((data: any) => {
        if(Array.isArray(data)) setVersions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sheetId]);

  if (loading) return <div className="text-center mt-20 font-bold text-gray-500">در حال دریافت کارنامه...</div>;
  if (!versions.length) return <div className="text-center mt-20 font-bold text-red-500">هیچ کارنامه‌ای برای این پاسخ‌برگ یافت نشد.</div>;

  const result = versions[selectedV];
  const userAns = JSON.parse(result.user_answers || '{}');
  const correctAns = JSON.parse(result.correct_keys || '{}');
  const questions = Array.from({ length: result.total_questions }, (_, i) => result.start_question_number + i);

  let correctCount = 0, wrongCount = 0, emptyCount = 0, noKeyCount = 0;
  
  questions.forEach(q => {
    const key = correctAns[q];
    const hasKey = typeof key === 'number' && key >= 1 && key <= 4;
    
    if (!hasKey) {
      noKeyCount++;
    } else {
      if (!userAns[q]) emptyCount++;
      else if (userAns[q] === key) correctCount++;
      else wrongCount++;
    }
  });

  // پردازش مباحث با در نظر گرفتن سوالات دارای کلید معتبر
  const parseSubjects = (mapStr: string) => {
    if (!mapStr) return [];
    const subjects: { name: string, questions: number[], correct: number, wrong: number, empty: number, score: number }[] = [];
    const parts = mapStr.split('|');
    
    for (const part of parts) {
      const [name, ranges] = part.split(':');
      if (!name || !ranges) continue;
      
      const qList = new Set<number>();
      const rangeParts = ranges.split(',');
      
      for (const r of rangeParts) {
        const bounds = r.trim().split('-');
        if (bounds.length === 2) {
          const start = parseInt(toEnNum(bounds[0]));
          const end = parseInt(toEnNum(bounds[1]));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) qList.add(i);
          }
        } else {
          const q = parseInt(toEnNum(bounds[0]));
          if (!isNaN(q)) qList.add(q);
        }
      }

      let sCorrect = 0, sWrong = 0, sEmpty = 0, sValid = 0;
      qList.forEach(q => {
        const key = correctAns[q];
        const hasKey = typeof key === 'number' && key >= 1 && key <= 4;
        if (hasKey) {
          sValid++;
          if (!userAns[q]) sEmpty++;
          else if (userAns[q] === key) sCorrect++;
          else sWrong++;
        }
      });

      let score = sValid > 0 ? ((sCorrect * 3) - sWrong) / (sValid * 3) * 100 : 0;

      subjects.push({
        name: name.trim(),
        questions: Array.from(qList),
        correct: sCorrect,
        wrong: sWrong,
        empty: sEmpty,
        score: parseFloat(score.toFixed(2))
      });
    }
    return subjects;
  };

  const subjectsData = parseSubjects(result.subjects_map);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center mb-8 border dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <Link href={`/dashboard#sheet-${sheetId}`} className="text-blue-600 font-bold hover:underline">← بازگشت</Link>
            <select className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl font-bold outline-none" value={selectedV} onChange={e => setSelectedV(Number(e.target.value))}>
              {versions.map((v, idx) => <option key={v.id} value={idx}>نسخه {toFaNum(v.version)}</option>)}
            </select>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">کارنامه: {toFaNum(result.title)}</h1>
          <div className="text-6xl font-black my-6 text-blue-600 dark:text-blue-400" dir="ltr">
            <span className={result.score_percentage >= 0 ? '' : 'text-red-500'}>%{toFaNum(result.score_percentage)}</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm font-bold mb-8">
            <span className="text-green-600 bg-green-100 dark:bg-green-900/40 px-4 py-2 rounded-xl">درست: {toFaNum(correctCount)}</span>
            <span className="text-red-600 bg-red-100 dark:bg-red-900/40 px-4 py-2 rounded-xl">غلط: {toFaNum(wrongCount)}</span>
            <span className="text-gray-600 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl">نزده: {toFaNum(emptyCount)}</span>
            {noKeyCount > 0 && (
              <span className="text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 px-4 py-2 rounded-xl">بدون کلید / حذف‌شده: {toFaNum(noKeyCount)}</span>
            )}
          </div>

          <label className="flex items-center justify-center gap-3 cursor-pointer bg-gray-100 dark:bg-gray-700 w-fit mx-auto px-4 py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <input type="checkbox" checked={showCorrect} onChange={e => setShowCorrect(e.target.checked)} className="w-5 h-5 accent-blue-600" />
            <span className="font-bold text-sm">نمایش کلیدهای صحیح در کارنامه</span>
          </label>
        </div>

        {subjectsData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 mb-8 border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 border-b dark:border-gray-700 pb-3">تحلیل درس به درس / مبحثی</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-4 rounded-r-xl font-bold">نام مبحث / درس</th>
                    <th className="p-4 font-bold text-center">تعداد سوال</th>
                    <th className="p-4 font-bold text-center text-green-600">درست</th>
                    <th className="p-4 font-bold text-center text-red-600">غلط</th>
                    <th className="p-4 font-bold text-center text-gray-500">نزده</th>
                    <th className="p-4 rounded-l-xl font-bold text-left">درصد</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsData.map((sub, idx) => (
                    <tr key={idx} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{toFaNum(sub.name)}</td>
                      <td className="p-4 text-center font-bold">{toFaNum(sub.questions.length)}</td>
                      <td className="p-4 text-center font-bold text-green-600">{toFaNum(sub.correct)}</td>
                      <td className="p-4 text-center font-bold text-red-600">{toFaNum(sub.wrong)}</td>
                      <td className="p-4 text-center font-bold text-gray-500">{toFaNum(sub.empty)}</td>
                      <td className="p-4 text-left font-black text-lg" dir="ltr">
                        <span className={sub.score >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}>
                          %{toFaNum(sub.score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4" dir="ltr">
          {questions.map(q => {
            const key = correctAns[q];
            const hasKey = typeof key === 'number' && key >= 1 && key <= 4;
            const isCorrect = hasKey && userAns[q] === key;
            const isEmpty = !userAns[q];
            
            let bgColor = 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
            if (!hasKey) {
              bgColor = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300';
            } else if (!isEmpty) {
              bgColor = isCorrect ? 'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800';
            }

            return (
              <Link href={`/exam/${sheetId}#q-${q}`} key={q} className={`p-3 rounded-xl border flex justify-between items-center hover:scale-105 transition ${bgColor}`}>
                <span className="font-bold">{toFaNum(q)}</span>
                <div className="text-xs text-right">
                  <div className="font-bold">شما: {userAns[q] ? toFaNum(userAns[q]) : '-'}</div>
                  {showCorrect && (
                    <div className="font-bold opacity-70 mt-1">
                      {hasKey ? `کلید: ${toFaNum(key)}` : 'کلید: نامشخص'}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}