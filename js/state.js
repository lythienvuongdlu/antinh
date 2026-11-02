// Nhật ký tu tập lưu trên máy người dùng (localStorage). Không gửi đi đâu.
const KEY = 'antinh.v1';

const blank = () => ({
  days: [],        // các ngày đã vào chùa, dạng YYYY-MM-DD
  mo: 0,           // tiếng mõ
  incense: 0,      // nén hương
  bell: 0,         // tiếng chuông
  meditateMin: 0,  // phút thiền
  draws: 0,        // lần xin xăm
  prayers: [],     // { text, at }
});

let s = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch (e) { /* trình duyệt chặn bộ nhớ: dùng tạm trong phiên */ }
  return blank();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* bỏ qua */ }
}

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function markVisit() {
  const t = today();
  if (!s.days.includes(t)) {
    s.days.push(t);
    s.days = s.days.slice(-400);
    save();
  }
}

export function streak() {
  const set = new Set(s.days);
  const d = new Date();
  // Chưa vào hôm nay thì vẫn tính chuỗi đến hôm qua
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function last7() {
  const set = new Set(s.days);
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    out.push({ key: today(d), wd: d.getDay(), on: set.has(today(d)) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function add(field, n = 1) {
  s[field] = (s[field] || 0) + n;
  save();
  return s[field];
}

export function addPrayer(text) {
  if (!text) return;
  s.prayers.unshift({ text: text.slice(0, 200), at: Date.now() });
  s.prayers = s.prayers.slice(0, 50);
  save();
}

export function clearPrayers() {
  s.prayers = [];
  save();
}

export const get = () => s;
