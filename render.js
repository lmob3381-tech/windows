const { createCanvas } = require('canvas');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ================= KONFIGURASI VIDEO =================
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 26; // 26 detik
const TOTAL_FRAMES = FPS * DURATION;
const OUTPUT_FILE = path.join(__dirname, 'hari_pahlawan_10_november.mp4');
const AUDIO_FILE = path.join(__dirname, 'temp_audio.wav');

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// ================= FUNGSI EASING & MATEMATIKA =================
const clamp = (val, min = 0, max = 1) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * clamp(t);
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOutCubic = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const easeOutBack = (t) => {
  t = clamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ================= GENERATOR AUDIO PROSEDURAL (WAV) =================
function generateCinematicAudio() {
  console.log('[*] Membuat audio latar sinematik & efek radio morse...');
  const sampleRate = 44100;
  const numSamples = sampleRate * DURATION;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // Header WAV
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // 1. Deep Cinematic Drone (A1 = 55Hz + E2 = 82.4Hz)
    const drone =
      Math.sin(2 * Math.PI * 55 * t) * 0.25 +
      Math.sin(2 * Math.PI * 82.41 * t) * 0.15 +
      Math.sin(2 * Math.PI * 110 * t) * 0.1;
    sample += drone;

    // 2. Detak Drum Perjuangan (setiap 0.75 detik)
    const beatPeriod = t % 0.75;
    if (beatPeriod < 0.2) {
      const env = Math.exp(-beatPeriod * 22);
      const freq = 90 * Math.exp(-beatPeriod * 12) + 35;
      sample += Math.sin(2 * Math.PI * freq * beatPeriod) * env * 0.55;
    }

    // 3. Sirene Ketegangan Ultimatum (Detik 5 - 10)
    if (t >= 5 && t < 10) {
      const tick = t % 0.5;
      if (tick < 0.06) {
        sample += Math.sin(2 * Math.PI * 880 * t) * Math.exp(-tick * 40) * 0.2;
      }
    }

    // 4. Sinyal Morse Radio Bung Tomo (Detik 10 - 16)
    if (t >= 10 && t < 16) {
      const morsePattern = Math.sin(t * 28) > 0.2 ? 1 : 0;
      const radioBeep = Math.sin(2 * Math.PI * 1046.5 * t) * morsePattern * 0.08;
      sample += radioBeep;
    }

    // 5. Harmoni Kemenangan / Heroik (Detik 21 - 26)
    if (t >= 21) {
      const fadeOut = clamp((DURATION - t) / 2.5);
      const chord =
        Math.sin(2 * Math.PI * 220 * t) * 0.12 +
        Math.sin(2 * Math.PI * 277.18 * t) * 0.1 +
        Math.sin(2 * Math.PI * 329.63 * t) * 0.12;
      sample += chord * fadeOut;
    }

    const fadeMaster = clamp(t / 1.0) * clamp((DURATION - t) / 1.5);
    const val = Math.max(-1, Math.min(1, sample * fadeMaster));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
  }

  fs.writeFileSync(AUDIO_FILE, buffer);
}

// ================= PARTIKEL BARA API =================
const particles = Array.from({ length: 95 }, (_, i) => ({
  x: (i * 137.5) % WIDTH,
  y: (i * 293.7) % HEIGHT,
  size: 2 + (i % 5) * 1.3,
  speedY: 1.5 + (i % 7) * 0.6,
  speedX: ((i % 5) - 2) * 0.5,
  alpha: 0.3 + (i % 6) * 0.1,
  color: i % 3 === 0 ? '#FF4500' : i % 3 === 1 ? '#FFA500' : '#FFD700',
}));

function drawBackgroundAndEmbers(frame, intensity = 1) {
  // Latar belakang gradien dramatis merah tua - hitam arang
  const grad = ctx.createRadialGradient(
    WIDTH / 2, HEIGHT / 2, 100,
    WIDTH / 2, HEIGHT / 2, WIDTH * 0.75
  );
  grad.addColorStop(0, '#2b0909');
  grad.addColorStop(0.6, '#140505');
  grad.addColorStop(1, '#070202');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid taktis tipis di latar belakang
  ctx.strokeStyle = 'rgba(255, 80, 50, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 80;
  const offset = (frame * 0.5) % gridSize;
  for (let x = offset; x < WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = offset; y < HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // Partikel bara api (Embers)
  ctx.save();
  particles.forEach((p, idx) => {
    const curY = (p.y - frame * p.speedY * intensity) % HEIGHT;
    const drawY = curY < 0 ? curY + HEIGHT : curY;
    const drawX = (p.x + Math.sin(frame * 0.03 + idx) * 30 + frame * p.speedX) % WIDTH;
    const finalX = drawX < 0 ? drawX + WIDTH : drawX;

    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(frame * 0.1 + idx));
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.arc(finalX, drawY, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// ================= KUMPULAN IKON VEKTOR TEMATIK =================

// 1. Ikon Tugu Pahlawan & Bambu Runcing Menyilang
function drawTuguDanBambuIcon(cx, cy, scale, progress, frame) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale * easeOutBack(progress), scale * easeOutBack(progress));

  // Lingkaran cahaya belakang
  ctx.beginPath();
  ctx.arc(0, 0, 145, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.15)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#EF4444';
  ctx.stroke();

  // Dua Bambu Runcing Menyilang di Belakang
  [-0.45, 0.45].forEach((angle) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    // Batang bambu
    ctx.beginPath();
    ctx.moveTo(-8, 120);
    ctx.lineTo(-8, -110);
    ctx.lineTo(0, -155); // Ujung runcing
    ctx.lineTo(8, -110);
    ctx.lineTo(8, 120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ruas bambu
    for (let y = -70; y <= 80; y += 50) {
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(10, y);
      ctx.stroke();
    }

    // Pita Merah Putih di ujung bambu
    const wave = Math.sin(frame * 0.15 + angle * 5) * 12;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(0, -110);
    ctx.quadraticCurveTo(35, -105 + wave, 65, -90 + wave);
    ctx.lineTo(65, -80 + wave);
    ctx.quadraticCurveTo(35, -95 + wave, 0, -100);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.quadraticCurveTo(35, -95 + wave, 65, -80 + wave);
    ctx.lineTo(65, -70 + wave);
    ctx.quadraticCurveTo(35, -85 + wave, 0, -90);
    ctx.fill();
    ctx.restore();
  });

  // Monumen Tugu Pahlawan di Tengah
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;

  // Pondasi bertingkat
  ctx.fillRect(-55, 95, 110, 18);
  ctx.fillRect(-40, 78, 80, 17);

  // Badan Tugu (trapesium tinggi bergaris)
  ctx.beginPath();
  ctx.moveTo(-24, 78);
  ctx.lineTo(-14, -95);
  ctx.lineTo(14, -95);
  ctx.lineTo(24, 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Puncak runcing Tugu
  ctx.beginPath();
  ctx.moveTo(-14, -95);
  ctx.lineTo(0, -135);
  ctx.lineTo(14, -95);
  ctx.closePath();
  ctx.fillStyle = '#FBBF24';
  ctx.fill();

  // Garis-garis kanelur tugu
  ctx.strokeStyle = '#475569';
  [-8, 0, 8].forEach((xOff) => {
    ctx.beginPath();
    ctx.moveTo(xOff * 1.4, 75);
    ctx.lineTo(xOff * 0.8, -90);
    ctx.stroke();
  });

  ctx.restore();
}

// 2. Ikon Jam Ultimatum 10 November & Sinyal Darurat
function drawUltimatumClockIcon(cx, cy, scale, progress, frame) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = scale * easeOutBack(progress);
  ctx.scale(s, s);

  // Gelombang kejut merah berdenyut (Siren Radar)
  for (let i = 0; i < 3; i++) {
    const pulse = ((frame * 0.025 + i * 0.33) % 1);
    ctx.beginPath();
    ctx.arc(0, 0, 110 + pulse * 95, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${(1 - pulse) * 0.6})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Badan Jam Saku Militer
  ctx.beginPath();
  ctx.arc(0, 0, 115, 0, Math.PI * 2);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#F59E0B';
  ctx.stroke();

  // Crown jam di atas
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-16, -135, 32, 16);
  ctx.beginPath();
  ctx.arc(0, -145, 22, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.stroke();

  // Indeks angka jam
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI) / 6;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = i % 3 === 0 ? '#EF4444' : '#E2E8F0';
    ctx.fillRect(-3, -98, 6, i % 3 === 0 ? 20 : 10);
    ctx.restore();
  }

  // Jarum Jam menuju 06:00 (Batas Waktu Ultimatum Pagi 10 November)
  const minuteAngle = frame * 0.18;
  const hourAngle = Math.PI - 0.3 + Math.min(0.3, progress * 0.3);

  // Jarum Pendek (Jam -> angka 6)
  ctx.save();
  ctx.rotate(hourAngle);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-5, -10, 10, -58);
  ctx.restore();

  // Jarum Panjang (Menit berputar cepat)
  ctx.save();
  ctx.rotate(minuteAngle);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-3, -15, 6, -82);
  ctx.restore();

  // Titik poros tengah
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#F59E0B';
  ctx.fill();

  ctx.restore();
}

// 3. Ikon Mikrofon Radio Bung Tomo & Gelombang Suara Perjuangan
function drawRadioBungTomoIcon(cx, cy, scale, progress, frame) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = scale * easeOutBack(progress);
  ctx.scale(s, s);

  // Pancaran Gelombang Radio Kiri & Kanan
  for (let i = 1; i <= 4; i++) {
    const waveAlpha = 0.25 + 0.65 * Math.max(0, Math.sin(frame * 0.2 - i * 0.8));
    ctx.strokeStyle = `rgba(251, 191, 36, ${waveAlpha})`;
    ctx.lineWidth = 5;

    // Kanan
    ctx.beginPath();
    ctx.arc(20, -25, 45 + i * 32, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();

    // Kiri
    ctx.beginPath();
    ctx.arc(-20, -25, 45 + i * 32, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();
  }

  // Kapsul Mikrofon Klasik 1945
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.roundRect(-38, -95, 76, 115, 38);
  ctx.fill();
  ctx.stroke();

  // Kisi-kisi (Grill) Mikrofon Vintage
  ctx.fillStyle = '#1E293B';
  for (let y = -72; y <= -5; y += 16) {
    ctx.fillRect(-26, y, 52, 8);
  }

  // Garis tengah vertikal mikrofon
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-4, -95, 8, 115);

  // Penyangga U-Bracket & Tiang
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -20, 56, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // Tiang dan Alas Meja Siaran
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-8, 36, 16, 65);
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.roundRect(-55, 95, 110, 20, 8);
  ctx.fill();

  ctx.restore();
}

// 4. Ikon Globe Dunia & Gelombang Kejut Kedaulatan
function drawWorldShockwaveIcon(cx, cy, scale, progress, frame) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = scale * easeOutBack(progress);
  ctx.scale(s, s);

  // Lingkaran Bola Dunia
  const radius = 115;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#38BDF8';
  ctx.stroke();

  // Garis Lintang (Latitude)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 2;
  [-60, -30, 0, 30, 60].forEach((lat) => {
    const w = Math.sqrt(radius * radius - lat * lat);
    ctx.beginPath();
    ctx.moveTo(-w, lat);
    ctx.lineTo(w, lat);
    ctx.stroke();
  });

  // Garis Bujur Berputar (Longitude)
  const rot = (frame * 0.02) % Math.PI;
  for (let i = 0; i < 4; i++) {
    const phase = rot + (i * Math.PI) / 4;
    const rx = Math.abs(Math.cos(phase)) * radius;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(2, rx), radius, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Titik Episentrum Surabaya (Merah Menyala + Shockwave ke Seluruh Dunia)
  const epicX = 25;
  const epicY = 18;
  for (let i = 0; i < 3; i++) {
    const p = (frame * 0.03 + i * 0.33) % 1;
    ctx.beginPath();
    ctx.arc(epicX, epicY, 10 + p * 140, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${1 - p})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(epicX, epicY, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#EF4444';
  ctx.shadowColor = '#EF4444';
  ctx.shadowBlur = 15;
  ctx.fill();

  ctx.restore();
}

// 5. Ikon Bintang Kehormatan & Api Abadi Hari Pahlawan
function drawHeroMedalAndFlameIcon(cx, cy, scale, progress, frame) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = scale * easeOutBack(progress);
  ctx.scale(s, s);

  // Sinar Kemuliaan Berputar di Belakang
  ctx.save();
  ctx.rotate(frame * 0.01);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -170);
    ctx.lineTo(18, -170);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Pita Merah Putih Gantung
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-45, -145, 45, 70);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, -145, 45, 70);

  // Bintang Sudut 5 Emas
  ctx.beginPath();
  const spikes = 5;
  const outerR = 110;
  const innerR = 48;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r + 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#FBBF24';
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 25;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FEF08A';
  ctx.stroke();

  // Api Abadi Berkilau di Tengah Bintang
  const flicker = Math.sin(frame * 0.25) * 6;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.bezierCurveTo(-35, 30, -30, -15, 0, -42 + flicker);
  ctx.bezierCurveTo(30, -15, 35, 30, 0, 48);
  ctx.fillStyle = '#DC2626';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 45);
  ctx.bezierCurveTo(-18, 30, -15, 0, 0, -20 - flicker * 0.5);
  ctx.bezierCurveTo(15, 0, 18, 30, 0, 45);
  ctx.fillStyle = '#FEF08A';
  ctx.fill();

  ctx.restore();
}

// ================= HELPER TEKS ANIMASI & BANNER =================
function drawAnimatedText(text, x, y, font, color, progress, align = 'center', shadow = true) {
  if (progress <= 0) return;
  ctx.save();
  const p = easeOutCubic(progress);
  ctx.globalAlpha = p;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
  }
  ctx.fillText(text, x, y + (1 - p) * 35);
  ctx.restore();
}

function drawTopBottomBars(frame, sceneTitle) {
  // Cinematic Letterbox + Header Status
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, WIDTH, 78);
  ctx.fillRect(0, HEIGHT - 78, WIDTH, 78);

  // Garis aksen Merah Putih
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(0, 78, WIDTH / 2, 4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(WIDTH / 2, 78, WIDTH / 2, 4);

  // Label babak di kiri atas
  ctx.font = 'bold 24px DejaVu Sans, Liberation Sans, sans-serif';
  ctx.fillStyle = '#FBBF24';
  ctx.textAlign = 'left';
  ctx.fillText(`● SEJARAH BANGSA  |  ${sceneTitle}`, 50, 48);

  // Progress bar waktu di bawah
  const totalProgress = frame / TOTAL_FRAMES;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(50, HEIGHT - 42, WIDTH - 100, 8);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(50, HEIGHT - 42, (WIDTH - 100) * totalProgress, 8);
}

// ================= RENDER TIAP SCENE =================
function renderFrame(frame) {
  const t = frame / FPS; // Waktu dalam detik

  // Intensitas partikel lebih tinggi saat pertempuran (Scene 3)
  const emberIntensity = t >= 10 && t < 16 ? 2.4 : 1.0;
  drawBackgroundAndEmbers(frame, emberIntensity);

  // ---------------- SCENE 1: AKAR PERTEMPURAN SURABAYA (0s - 5s) ----------------
  if (t < 5) {
    const st = t;
    drawTopBottomBars(frame, 'SURABAYA, 10 NOVEMBER 1945');

    drawTuguDanBambuIcon(WIDTH / 2, 340, 1.25, st / 1.2, frame);

    drawAnimatedText(
      'PERTEMPURAN SURABAYA 1945',
      WIDTH / 2, 620,
      'bold 64px DejaVu Sans, Liberation Sans, sans-serif',
      '#FBBF24', (st - 0.4) / 0.8
    );
    drawAnimatedText(
      'Rakyat dan para pemuda bersatu melawan pasukan Sekutu',
      WIDTH / 2, 710,
      '38px DejaVu Sans, Liberation Sans, sans-serif',
      '#F8FAFC', (st - 0.9) / 0.8
    );
    drawAnimatedText(
      'demi mempertahankan kemerdekaan Indonesia.',
      WIDTH / 2, 765,
      'bold 40px DejaVu Sans, Liberation Sans, sans-serif',
      '#EF4444', (st - 1.3) / 0.8
    );
  }

  // ---------------- SCENE 2: ULTIMATUM 10 NOVEMBER (5s - 10s) ----------------
  else if (t >= 5 && t < 10) {
    const st = t - 5;
    drawTopBottomBars(frame, 'KETEGANGAN & ULTIMATUM SEKUTU');

    drawUltimatumClockIcon(WIDTH / 2, 330, 1.2, st / 1.0, frame);

    drawAnimatedText(
      'TEWASNYA BRIGJEN MALLABY & ULTIMATUM INGGRIS',
      WIDTH / 2, 600,
      'bold 52px DejaVu Sans, Liberation Sans, sans-serif',
      '#EF4444', (st - 0.3) / 0.7
    );
    drawAnimatedText(
      'Memicu ultimatum agar pejuang Surabaya menyerah tanpa syarat',
      WIDTH / 2, 690,
      '38px DejaVu Sans, Liberation Sans, sans-serif',
      '#F8FAFC', (st - 0.8) / 0.7
    );
    drawAnimatedText(
      'sebelum batas waktu pagi hari 10 November 1945.',
      WIDTH / 2, 750,
      'bold 42px DejaVu Sans, Liberation Sans, sans-serif',
      '#FBBF24', (st - 1.2) / 0.7
    );
  }

  // ---------------- SCENE 3: BUNG TOMO & PERLAWANAN SEMESTA (10s - 16s) ----------------
  else if (t >= 10 && t < 16) {
    const st = t - 10;
    drawTopBottomBars(frame, 'GELOMBANG RADIO PERJUANGAN');

    drawRadioBungTomoIcon(WIDTH / 2, 300, 1.15, st / 1.0, frame);

    // Audio Visualizer gelombang suara Bung Tomo
    ctx.save();
    const bars = 40;
    const barWidth = 14;
    const gap = 8;
    const totalW = bars * (barWidth + gap);
    const startX = (WIDTH - totalW) / 2;
    for (let i = 0; i < bars; i++) {
      const h = 15 + Math.abs(Math.sin(frame * 0.35 + i * 0.45)) * 65 * clamp((st - 0.5) / 0.5);
      ctx.fillStyle = i % 2 === 0 ? '#EF4444' : '#FBBF24';
      ctx.fillRect(startX + i * (barWidth + gap), 515 - h / 2, barWidth, h);
    }
    ctx.restore();

    drawAnimatedText(
      'MENOLAK TUNDUK! Arek Suroboyo, Ulama, Santri & Laskar Rakyat Bangkit!',
      WIDTH / 2, 615,
      'bold 38px DejaVu Sans, Liberation Sans, sans-serif',
      '#F8FAFC', (st - 0.4) / 0.7
    );

    // Efek Getar Kinetik pada pekikan "MERDEKA ATAU MATI!"
    if (st > 1.2) {
      const shakeX = Math.sin(frame * 1.7) * 4;
      const shakeY = Math.cos(frame * 2.1) * 4;
      drawAnimatedText(
        '"MERDEKA ATAU MATI!"',
        WIDTH / 2 + shakeX, 735 + shakeY,
        'bold 86px DejaVu Sans, Liberation Sans, sans-serif',
        '#FBBF24', (st - 1.2) / 0.5
      );
      drawAnimatedText(
        '— Pekikan Legendaris Bung Tomo Lewat Gelombang Radio —',
        WIDTH / 2, 815,
        'italic 34px DejaVu Sans, Liberation Sans, sans-serif',
        '#EF4444', (st - 1.6) / 0.6
      );
    }
  }

  // ---------------- SCENE 4: MENGGUNCANG MATA DUNIA (16s - 21s) ----------------
  else if (t >= 16 && t < 21) {
    const st = t - 16;
    drawTopBottomBars(frame, 'KEDAULATAN YANG TAK BISA DITAWAR');

    drawWorldShockwaveIcon(WIDTH / 2, 330, 1.25, st / 1.0, frame);

    drawAnimatedText(
      'MENGGUNCANG MATA DUNIA',
      WIDTH / 2, 600,
      'bold 62px DejaVu Sans, Liberation Sans, sans-serif',
      '#38BDF8', (st - 0.3) / 0.7
    );
    drawAnimatedText(
      'Kendati persenjataan kalah telak dan ribuan nyawa gugur,',
      WIDTH / 2, 685,
      '38px DejaVu Sans, Liberation Sans, sans-serif',
      '#F8FAFC', (st - 0.8) / 0.7
    );
    drawAnimatedText(
      'perlawanan gigih membuktikan kedaulatan bangsa tidak bisa ditawar!',
      WIDTH / 2, 745,
      'bold 40px DejaVu Sans, Liberation Sans, sans-serif',
      '#FBBF24', (st - 1.2) / 0.7
    );
  }

  // ---------------- SCENE 5: HARI PAHLAWAN - PENGINGAT ABADI (21s - 26s) ----------------
  else {
    const st = t - 21;
    drawTopBottomBars(frame, 'PERINGATAN HARI PAHLAWAN NASIONAL');

    drawHeroMedalAndFlameIcon(WIDTH / 2, 320, 1.2, st / 1.0, frame);

    drawAnimatedText(
      'HARI PAHLAWAN — 10 NOVEMBER',
      WIDTH / 2, 595,
      'bold 68px DejaVu Sans, Liberation Sans, sans-serif',
      '#FBBF24', (st - 0.3) / 0.7
    );
    drawAnimatedText(
      'Pengingat Abadi Tentang Pengorbanan Besar Warga Surabaya:',
      WIDTH / 2, 680,
      '36px DejaVu Sans, Liberation Sans, sans-serif',
      '#E2E8F0', (st - 0.8) / 0.7
    );

    // 3 Pilar Nilai Pahlawan dengan Badge
    const pillars = ['KEBERANIAN', 'PERSATUAN', 'KETEGUHAN MEMBELA TANAH AIR'];
    const pProg = easeOutCubic((st - 1.3) / 0.8);
    if (pProg > 0) {
      ctx.save();
      ctx.globalAlpha = pProg;
      ctx.font = 'bold 34px DejaVu Sans, Liberation Sans, sans-serif';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText(pillars.join('   ★   '), WIDTH / 2, 765 + (1 - pProg) * 25);
      ctx.restore();
    }
  }

  // Efek Flash Transisi Antar Scene
  const sceneBoundaries = [0, 5, 10, 16, 21];
  sceneBoundaries.forEach((b) => {
    const dist = Math.abs(t - b);
    if (dist < 0.25) {
      const alpha = (1 - dist / 0.25) * 0.45;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  });
}

// ================= PIPELINE ENCODING FFMPEG =================
async function main() {
  generateCinematicAudio();

  console.log(`[*] Memulai proses render video (${WIDTH}x${HEIGHT} @ ${FPS}fps, ${DURATION} detik)...`);

  const ffmpegArgs = [
    '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${WIDTH}x${HEIGHT}`,
    '-r', String(FPS),
    '-i', '-',
    '-i', AUDIO_FILE,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    OUTPUT_FILE
  ];

  const ffmpeg = spawn('ffmpeg', ffmpegArgs);

  ffmpeg.stderr.on('data', () => {
    // Abaikan log verbose ffmpeg agar terminal rapi
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    renderFrame(frame);

    const imgData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const buffer = Buffer.from(imgData.data.buffer);

    const canWrite = ffmpeg.stdin.write(buffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    if (frame % FPS === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      console.log(`    -> Progress Render: ${pct}% (${frame + 1}/${TOTAL_FRAMES} frame)`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (fs.existsSync(AUDIO_FILE)) fs.unlinkSync(AUDIO_FILE);
      if (code === 0) {
        // Buat salinan juga ke output.mp4 untuk kompatibilitas umum
        fs.copyFileSync(OUTPUT_FILE, path.join(__dirname, 'output.mp4'));
        console.log(`[✓] Render selesai! Video tersimpan di: ${OUTPUT_FILE}`);
        resolve();
      } else {
        reject(new Error(`FFmpeg keluar dengan kode error: ${code}`));
      }
    });
  });
}

main().catch((err) => {
  console.error('[!] Terjadi kesalahan saat merender:', err);
  process.exit(1);
});
