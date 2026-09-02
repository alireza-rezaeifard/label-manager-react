import { useEffect, useState } from 'react';
import { toFaDigits } from '../lib/persianDate';

/** PersianLabs/ui-style `use-time-ago` — relative Persian time, auto-updating. */
export function useTimeAgo(date?: Date | string | number, refreshMs = 60_000): string {
  const target = date === undefined || date === null ? null : new Date(date);

  const compute = (): string => {
    if (!target || isNaN(target.getTime())) return '';
    const diff = Date.now() - target.getTime();
    if (diff < 0) return 'اکنون';
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'چند لحظه پیش';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${toFaDigits(min)} دقیقه پیش`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr === 1 ? '۱ ساعت پیش' : `${toFaDigits(hr)} ساعت پیش`;
    const day = Math.floor(hr / 24);
    if (day < 7) return day === 1 ? 'دیروز' : `${toFaDigits(day)} روز پیش`;
    const week = Math.floor(day / 7);
    if (week < 5) return `${toFaDigits(week)} هفته پیش`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${toFaDigits(month)} ماه پیش`;
    return toFaDigits(Math.floor(day / 365)) + ' سال پیش';
  };

  // Derived value recomputed at render when `date` changes; interval only
  // refreshes over time (avoids setState-in-effect cascading renders).
  const [prevDate, setPrevDate] = useState(date);
  const [text, setText] = useState<string>(compute);
  if (date !== prevDate) {
    setPrevDate(date);
    setText(compute());
  }

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setText(compute()), refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, refreshMs]);

  return text;
}

export default useTimeAgo;