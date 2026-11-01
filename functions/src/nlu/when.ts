/**
 * Reads a requested appointment time from a customer's message: "tomorrow
 * 10am", "Saturday 2:30pm", "today by 4pm", "12/11 at 9am". Ghana is on
 * GMT all year, so UTC arithmetic is local time.
 *
 * It is a best guess for the merchant to confirm, never a booking by itself.
 * `at` is set only when both a day and a time were found.
 */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface WhenReading {
  phrase: string | null;
  at: Date | null;
}

export function readWhen(text: string, now = new Date()): WhenReading {
  const lower = text.toLowerCase();
  const parts: string[] = [];
  let day: Date | null = null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (/\btoday\b|\btonight\b/.test(lower)) { day = today; parts.push('today'); }
  else if (/\b(tomorrow|tmrw|tmr|2moro)\b/.test(lower)) { day = addDays(today, 1); parts.push('tomorrow'); }
  else {
    const dayIdx = DAYS.findIndex((d, i) => new RegExp(`\\b(${d}|${SHORT_DAYS[i]})\\b`).test(lower));
    if (dayIdx >= 0) {
      const diff = (dayIdx - today.getUTCDay() + 7) % 7 || 7;
      day = addDays(today, diff);
      parts.push(DAYS[dayIdx]);
    } else {
      const dm = lower.match(/\b(\d{1,2})[/.-](\d{1,2})\b/);
      if (dm) {
        const d = Number(dm[1]);
        const m = Number(dm[2]) - 1;
        if (d >= 1 && d <= 31 && m >= 0 && m <= 11) {
          let candidate = new Date(Date.UTC(today.getUTCFullYear(), m, d));
          if (candidate < today) candidate = new Date(Date.UTC(today.getUTCFullYear() + 1, m, d));
          day = candidate;
          parts.push(dm[0]);
        }
      }
    }
  }

  let minutes: number | null = null;
  const ampm = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const clock = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[3] === 'pm') h += 12;
    minutes = h * 60 + Number(ampm[2] ?? 0);
    parts.push(ampm[0]);
  } else if (clock) {
    minutes = Number(clock[1]) * 60 + Number(clock[2]);
    parts.push(clock[0]);
  } else if (/\bnoon\b/.test(lower)) {
    minutes = 12 * 60;
    parts.push('noon');
  }

  // A time with no day means the next time that clock time comes round.
  if (minutes !== null && !day) {
    day = today;
    if (today.getTime() + minutes * 60000 <= now.getTime()) day = addDays(today, 1);
  }

  return {
    phrase: parts.length ? parts.join(' ') : null,
    at: day && minutes !== null ? new Date(day.getTime() + minutes * 60000) : null,
  };
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
