export interface TagItem {
  id: string;
  name: string;
  color: string;
}

export const TAG_PALETTE = [
  { id: 'red', name: 'قرمز', color: '#ef4444' },
  { id: 'rose', name: 'رز', color: '#f43f5e' },
  { id: 'pink', name: 'صورتی', color: '#ec4899' },
  { id: 'fuchsia', name: 'سرخابی', color: '#d946ef' },
  { id: 'purple', name: 'بنفش', color: '#a855f7' },
  { id: 'violet', name: 'یاسی', color: '#8b5cf6' },
  { id: 'indigo', name: 'نیلی', color: '#6366f1' },
  { id: 'blue', name: 'آبی', color: '#3b82f6' },
  { id: 'sky', name: 'آسمانی', color: '#0ea5e9' },
  { id: 'cyan', name: 'فیروزه‌ای', color: '#06b6d4' },
  { id: 'teal', name: 'کله‌غازی', color: '#14b8a6' },
  { id: 'emerald', name: 'زمردی', color: '#10b981' },
  { id: 'green', name: 'سبز', color: '#22c55e' },
  { id: 'lime', name: 'فسفری', color: '#84cc16' },
  { id: 'yellow', name: 'زرد', color: '#eab308' },
  { id: 'amber', name: 'کهربایی', color: '#f59e0b' },
  { id: 'orange', name: 'نارنجی', color: '#f97316' },
  { id: 'warm', name: 'آجری', color: '#ea580c' },
  { id: 'stone', name: 'سنگ', color: '#78716c' },
  { id: 'slate', name: 'سربی', color: '#64748b' },
];

export const DEFAULT_TAGS = [
  { name: 'سخت و چالشی', color: '#ef4444' },
  { name: 'مرور مجدد', color: '#f59e0b' },
  { name: 'نکته‌دار آموزشی', color: '#3b82f6' },
  { name: 'بی‌دقتی محاسباتی', color: '#f97316' },
  { name: 'مهم کنکوری', color: '#a855f7' },
];