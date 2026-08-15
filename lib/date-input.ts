/**
 * Local-timezone "yyyy-MM-dd" for today, matching what `<input type="date">`
 * expects for both `value` and `min`. Deliberately NOT `toISOString().slice(0, 10)`
 * — that converts to UTC first, which rolls over to the wrong calendar day
 * for any timezone ahead of UTC in the evening (e.g. it's already tomorrow
 * in UTC at 7pm ICT).
 */
export function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
