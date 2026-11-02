import { createTemple } from './scene.js';
import * as audio from './audio.js';
import * as state from './state.js';
import { LOI_DAY } from './data.js';

const $ = (id) => document.getElementById(id);
const temple = createTemple($('scene'));

// ---------- tiện ích giao diện ----------
let toastTimer = 0;
function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function floater(cls, text, x, y) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  // Giữ chữ trong màn hình khi vật nằm sát mép (điện thoại màn dọc)
  const pad = cls === 'wish' ? Math.min(window.innerWidth * 0.4, 210) : 70;
  el.style.left = `${Math.min(Math.max(x, pad), window.innerWidth - pad)}px`;
  el.style.top = `${y}px`;
  $('floaters').append(el);
  el.addEventListener('animationend', () => el.remove());
}

function refreshStreak() {
  $('streakN').textContent = state.streak();
}

// Đóng sheet khi chạm ra ngoài hoặc bấm nút data-close
document.querySelectorAll('dialog').forEach((d) => {
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) d.close('cancel');
  });
});

// ---------- vào chùa ----------
$('enter').addEventListener('click', () => {
  audio.unlock();
  $('welcome').classList.add('fade');
  setTimeout(() => $('welcome').remove(), 1300);
  temple.intro();
  state.markVisit();
  refreshStreak();
  setTimeout(() => audio.bell(0.7), 600);
  setTimeout(() => {
    $('topbar').classList.remove('hidden');
    $('dock').classList.remove('hidden');
    toast('Chạm vào lư hương, mõ hay chuông để bắt đầu.');
  }, 4200);
});

let ambientOn = false;
$('soundBtn').addEventListener('click', () => {
  audio.unlock();
  ambientOn = !ambientOn;
  audio.setAmbient(ambientOn);
  $('soundBtn').setAttribute('aria-pressed', String(ambientOn));
});

// ---------- hành động ----------
const actions = {
  incense: openIncense,
  mo: strikeMo,
  bell: ringBell,
  meditate: () => $('meditateDlg').showModal(),
  draw: openDraw,
  lotus: () => {
    const q = LOI_DAY[Math.floor(Math.random() * LOI_DAY.length)];
    toast(`“${q.text}”`, 6000);
  },
};
document.querySelectorAll('.dock [data-act]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.act]()));
temple.onPick((name) => actions[name]?.());

function strikeMo() {
  audio.unlock();
  audio.mo();
  temple.strikeMo();
  const n = state.add('mo');
  const p = temple.screenOf('mo');
  floater('plus', 'Công đức +1', p.x + (Math.random() - 0.5) * 30, p.y);
  if (n % 108 === 0) toast(`Bạn đã gõ ${n} tiếng mõ. Một tràng hạt trọn vẹn.`);
}

let lastBell = 0;
function ringBell() {
  audio.unlock();
  // Chuông cần ngân: không cho thỉnh dồn dập
  if (performance.now() - lastBell < 2500) return;
  lastBell = performance.now();
  audio.bell();
  temple.ringBell();
  state.add('bell');
}

// ---------- thắp hương ----------
function openIncense() {
  $('prayer').value = '';
  $('prayerCount').textContent = '0/200';
  $('incenseDlg').showModal();
}
$('prayer').addEventListener('input', (e) => { $('prayerCount').textContent = `${e.target.value.length}/200`; });
$('incenseDlg').addEventListener('close', () => {
  if ($('incenseDlg').returnValue !== 'ok') return;
  audio.unlock();
  const n = Number(new FormData($('incenseDlg').querySelector('form')).get('sticks')) || 1;
  const wish = $('prayer').value.trim();
  temple.focusIncense();
  setTimeout(() => {
    temple.lightIncense(n);
    state.add('incense', n);
    state.addPrayer(wish);
    audio.bell(0.45);
  }, 1500);
  setTimeout(() => {
    const p = temple.screenOf('incense');
    if (wish) floater('wish', wish, p.x, p.y - 40);
    else toast('Nén hương đã được thắp. Hãy đứng yên vài hơi thở.');
  }, 2600);
  setTimeout(() => temple.home(), wish ? 9000 : 6500);
});

// ---------- thiền ----------
let med = null;
$('meditateDlg').addEventListener('close', () => {
  if ($('meditateDlg').returnValue !== 'ok') return;
  const min = Number(new FormData($('meditateDlg').querySelector('form')).get('min')) || 3;
  startMeditation(min);
});
function fmt(sec) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
function startMeditation(min) {
  audio.unlock();
  audio.bell(0.8);
  $('meditation').classList.remove('hidden');
  $('dock').classList.add('hidden');
  const total = min * 60;
  const t0 = performance.now();
  // Đặt lại animation vòng thở để khớp chữ "Hít vào/Thở ra"
  const ring = document.querySelector('.breath-ring');
  ring.style.animation = 'none';
  void ring.offsetWidth;
  ring.style.animation = '';
  const tick = () => {
    const el = (performance.now() - t0) / 1000;
    $('medTimer').textContent = fmt(Math.max(total - el, 0));
    $('breathLabel').textContent = el % 10 < 4 ? 'Hít vào' : 'Thở ra';
    if (el >= total) endMeditation(true);
  };
  tick();
  med = { t0, total, timer: setInterval(tick, 250) };
}
function endMeditation(done) {
  if (!med) return;
  clearInterval(med.timer);
  const mins = Math.floor((performance.now() - med.t0) / 60000);
  med = null;
  $('meditation').classList.add('hidden');
  $('dock').classList.remove('hidden');
  if (mins > 0) state.add('meditateMin', mins);
  if (done) {
    audio.bell(0.8);
    setTimeout(() => audio.bell(0.6), 3000);
    setTimeout(() => audio.bell(0.5), 6000);
    toast('Hoàn thành buổi thiền. Mang sự yên tĩnh này vào việc kế tiếp nhé.', 5000);
  }
}
$('medStop').addEventListener('click', () => endMeditation(false));

// ---------- xin xăm ----------
let currentCard = null;
function openDraw() {
  $('drawStage').classList.remove('hidden');
  $('drawCard').classList.add('hidden');
  $('poppedStick').classList.remove('pop');
  $('shakeBtn').disabled = false;
  $('drawDlg').showModal();
}
$('shakeBtn').addEventListener('click', () => {
  audio.unlock();
  $('shakeBtn').disabled = true;
  $('tube').classList.add('shake');
  audio.rattle(1.5);
  setTimeout(() => {
    $('tube').classList.remove('shake');
    $('poppedStick').classList.add('pop');
    audio.mo();
  }, 1500);
  setTimeout(() => {
    const i = Math.floor(Math.random() * LOI_DAY.length);
    currentCard = { no: i + 1, ...LOI_DAY[i] };
    $('cardNo').textContent = `Thẻ số ${currentCard.no}`;
    $('cardText').textContent = `“${currentCard.text}”`;
    $('cardSrc').textContent = currentCard.src;
    $('cardAsk').textContent = currentCard.ask;
    $('drawStage').classList.add('hidden');
    $('drawCard').classList.remove('hidden');
    state.add('draws');
  }, 2500);
});
$('drawClose').addEventListener('click', () => $('drawDlg').close());
$('drawShare').addEventListener('click', () => {
  $('drawDlg').close();
  openShare(currentCard);
});

// ---------- nhật ký ----------
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function openJournal() {
  const s = state.get();
  $('week').innerHTML = state.last7().map((d) => `<div class="${d.on ? 'on' : ''}">${WD[d.wd]}<div class="dot"></div></div>`).join('');
  const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
  $('stats').innerHTML = [
    stat(state.streak(), 'ngày liên tiếp'),
    stat(s.incense, 'nén hương'),
    stat(s.mo, 'tiếng mõ'),
    stat(s.meditateMin, 'phút thiền'),
  ].join('');
  const list = $('prayerList');
  list.innerHTML = '';
  if (!s.prayers.length) list.innerHTML = '<li class="empty">Chưa có lời nguyện nào.</li>';
  for (const p of s.prayers.slice(0, 8)) {
    const li = document.createElement('li');
    li.textContent = p.text;
    const sm = document.createElement('small');
    sm.textContent = new Date(p.at).toLocaleDateString('vi-VN');
    li.append(sm);
    list.append(li);
  }
  $('journalDlg').showModal();
}
$('streakChip').addEventListener('click', openJournal);
$('clearPrayers').addEventListener('click', () => {
  if (!confirm('Xóa toàn bộ lời nguyện đã lưu trên máy này?')) return;
  state.clearPrayers();
  openJournal();
});

// ---------- chia sẻ ảnh 9:16 ----------
function wrap(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function buildShareImage(card) {
  const W = 1080;
  const H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = new Image();
  img.src = temple.capture();
  await img.decode();
  const sc = Math.max(W / img.width, H / img.height);
  g.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(8,4,2,0.75)');
  grad.addColorStop(0.3, 'rgba(8,4,2,0.1)');
  grad.addColorStop(0.55, 'rgba(8,4,2,0.35)');
  grad.addColorStop(1, 'rgba(8,4,2,0.95)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // Canvas không tự tải font: ép tải đúng các kiểu chữ sẽ vẽ
  await Promise.all([
    '600 30px "Be Vietnam Pro"', '500 30px "Be Vietnam Pro"', '700 96px "Noto Serif"', 'italic 500 54px "Noto Serif"',
  ].map((f) => document.fonts.load(f, 'Ăn Tịnh')));

  g.textAlign = 'center';
  g.fillStyle = '#e8c27a';
  g.font = '600 30px "Be Vietnam Pro"';
  g.fillText('C H Ù A   T R Ê N   M Â Y', W / 2, 150);
  g.fillStyle = '#f3d394';
  g.font = '700 96px "Noto Serif"';
  g.fillText('An Tịnh', W / 2, 255);

  const s = state.get();
  const q = card || LOI_DAY[(s.mo + s.incense) % LOI_DAY.length];
  g.fillStyle = '#fff4e2';
  g.font = 'italic 500 54px "Noto Serif"';
  const lines = wrap(g, `“${q.text}”`, W - 180);
  let y = H - 560 - (lines.length - 1) * 76;
  for (const l of lines) { g.fillText(l, W / 2, y); y += 76; }
  g.fillStyle = '#e8c27a';
  g.font = '500 32px "Be Vietnam Pro"';
  g.fillText(q.src, W / 2, y + 10);

  const items = [[state.streak(), 'ngày'], [s.incense, 'nén hương'], [s.mo, 'tiếng mõ'], [s.meditateMin, 'phút thiền']];
  const colW = (W - 120) / 4;
  items.forEach(([n, label], i) => {
    const x = 60 + colW * i + colW / 2;
    g.fillStyle = '#f3d394';
    g.font = '700 64px "Noto Serif"';
    g.fillText(String(n), x, H - 250);
    g.fillStyle = '#cdb898';
    g.font = '500 28px "Be Vietnam Pro"';
    g.fillText(label, x, H - 205);
  });
  g.fillStyle = 'rgba(244,233,216,0.7)';
  g.font = '500 30px "Be Vietnam Pro"';
  g.fillText(`${location.host || 'an-tinh'} · hôm nay mình đã ghé chùa`, W / 2, H - 100);
  return c;
}

let shareBlob = null;
async function openShare(card) {
  const c = await buildShareImage(card);
  shareBlob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const url = URL.createObjectURL(shareBlob);
  $('shareImg').src = url;
  $('shareDownload').href = url;
  const file = new File([shareBlob], 'an-tinh.jpg', { type: 'image/jpeg' });
  $('shareNative').classList.toggle('hidden', !(navigator.canShare && navigator.canShare({ files: [file] })));
  $('shareDlg').showModal();
}
$('shareBtn').addEventListener('click', () => openShare(null));
$('shareNative').addEventListener('click', async () => {
  const file = new File([shareBlob], 'an-tinh.jpg', { type: 'image/jpeg' });
  try {
    await navigator.share({ files: [file], title: 'An Tịnh', text: 'Hôm nay mình đã ghé chùa trên mây.' });
  } catch (e) { /* người dùng huỷ */ }
});

refreshStreak();
