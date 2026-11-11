const { createCanvas } = require('@napi-rs/canvas');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== KONFIGURASI VIDEO ====================
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 30; // 30 Detik
const TOTAL_FRAMES = FPS * DURATION; // 900 Frame
const OUTPUT_FILE = path.join(__dirname, 'cara_kerja_mesin_motor.mp4');
const TEMP_DIR = path.join(__dirname, '.temp_audio');

// ==================== SKENARIO & NARASI SUARA (30 DETIK) ====================
const SCENES = [
  {
    id: 0,
    start: 0,
    end: 5,
    title: 'PRINSIP KERJA MESIN 4-TAK',
    subtitle: 'Pernah penasaran bagaimana mesin sepeda motor bekerja menghasilkan tenaga? Mari kita bedah siklus mesin empat tak.',
    voiceText: 'Pernah penasaran bagaimana mesin sepeda motor bekerja menghasilkan tenaga? Mari kita bedah siklus mesin empat tak.',
    strokePhase: 'INTRO',
    color: '#38bdf8'
  },
  {
    id: 1,
    start: 5,
    end: 11,
    title: '1. LANGKAH HISAP (INTAKE)',
    subtitle: 'Pertama, langkah hisap. Klep masuk terbuka, piston bergerak turun menghisap campuran udara dan bahan bakar.',
    voiceText: 'Pertama, langkah hisap. Klep masuk terbuka, piston bergerak turun menghisap campuran udara dan bahan bakar.',
    strokePhase: 'INTAKE',
    color: '#00f2fe'
  },
  {
    id: 2,
    start: 11,
    end: 17,
    title: '2. LANGKAH KOMPRESI (COMPRESSION)',
    subtitle: 'Kedua, langkah kompresi. Kedua klep menutup rapat, lalu piston naik memadatkan gas hingga bertekanan tinggi.',
    voiceText: 'Kedua, langkah kompresi. Kedua klep menutup rapat, lalu piston naik memadatkan gas hingga bertekanan tinggi.',
    strokePhase: 'COMPRESSION',
    color: '#f59e0b'
  },
  {
    id: 3,
    start: 17,
    end: 23,
    title: '3. LANGKAH USAHA (POWER)',
    subtitle: 'Ketiga, langkah usaha. Busi memercikkan api, memicu ledakan yang mendorong piston turun dengan tenaga besar.',
    voiceText: 'Ketiga, langkah usaha. Busi memercikkan api, memicu ledakan yang mendorong piston turun dengan tenaga besar.',
    strokePhase: 'POWER',
    color: '#ef4444'
  },
  {
    id: 4,
    start: 23,
    end: 28,
    title: '4. LANGKAH BUANG (EXHAUST)',
    subtitle: 'Terakhir, langkah buang. Klep buang terbuka dan piston naik mendorong sisa gas pembakaran keluar knalpot.',
    voiceText: 'Terakhir, langkah buang. Klep buang terbuka dan piston naik mendorong sisa gas pembakaran keluar knalpot.',
    strokePhase: 'EXHAUST',
    color: '#a855f7'
  },
  {
    id: 5,
    start: 28,
    end: 30,
    title: 'SIKLUS BERKELANJUTAN (HIGH RPM)',
    subtitle: 'Siklus ini berulang ribuan kali setiap menit untuk menggerakkan roda motor Anda!',
    voiceText: 'Siklus ini berulang ribuan kali setiap menit!',
    strokePhase: 'OUTRO',
    color: '#10b981'
  }
];

// ==================== FUNGSI EASING & MATEMATIKA ====================
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// ==================== GENERATOR SUARA NARATOR (TTS INDONESIA) ====================
function downloadTTS(text, destPath) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=id&client=tw-ob`;

    const file = fs.createWriteStream(destPath);
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Gagal mengunduh TTS, status: ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        }
      )
      .on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

async function prepareVoiceovers() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log('🎙️  Mengunduh suara narator Bahasa Indonesia...');
  const files = [];
  for (const scene of SCENES) {
    const filePath = path.join(TEMP_DIR, `voice_${scene.id}.mp3`);
    await downloadTTS(scene.voiceText, filePath);
    files.push({ path: filePath, delayMs: scene.start * 1000 });
  }
  return files;
}

// ==================== SISTEM PARTIKEL GAS & PEMBAKARAN ====================
const NUM_PARTICLES = 65;
const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => ({
  seedX: (Math.sin(i * 78.233) * 43758.5453) % 1,
  seedY: (Math.cos(i * 12.989) * 23421.6312) % 1,
  size: 4 + (i % 5) * 1.8,
  speedOffset: 0.7 + (i % 7) * 0.1
}));

// ==================== HELPER MENGGAMBAR UI & VEKTOR ====================
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGear(ctx, cx, cy, outerR, innerR, teeth, rotation, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  const step = (Math.PI * 2) / (teeth * 2);
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step;
    const aNext = (i + 0.7) * step;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(aNext) * r, Math.sin(aNext) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.restore();
}

function drawSpring(ctx, x, yTop, yBottom, width, coils) {
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  const h = yBottom - yTop;
  const step = h / (coils * 2);
  for (let i = 1; i < coils * 2; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    ctx.lineTo(x + dir * (width / 2), yTop + i * step);
  }
  ctx.lineTo(x, yBottom);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ==================== PENENTU SUDUT POROS ENGKOL (CRANK ANGLE) ====================
// 1 Siklus 4-Tak = 720 derajat (4 * PI radian)
// 0..180 = Hisap | 180..360 = Kompresi | 360..540 = Usaha | 540..720 = Buang
function getEngineKinematics(time) {
  let cycleDeg = 0;
  let rpm = 1200;
  let activeStrokeIndex = -1; // 0: Intake, 1: Comp, 2: Power, 3: Exhaust

  if (time < 5) {
    // Intro: Mesin berputar halus 2 siklus penuh
    const t = time / 5;
    cycleDeg = (t * 1440) % 720;
    rpm = Math.round(lerp(800, 1800, easeInOutCubic(t)));
    activeStrokeIndex = Math.floor(cycleDeg / 180);
  } else if (time < 11) {
    // Fokus Langkah 1: Hisap (0 -> 180 derajat)
    const t = easeInOutCubic((time - 5) / 6);
    cycleDeg = lerp(0, 180, t);
    rpm = 1500;
    activeStrokeIndex = 0;
  } else if (time < 17) {
    // Fokus Langkah 2: Kompresi (180 -> 360 derajat)
    const t = easeInOutCubic((time - 11) / 6);
    cycleDeg = lerp(180, 360, t);
    rpm = 2400;
    activeStrokeIndex = 1;
  } else if (time < 23) {
    // Fokus Langkah 3: Usaha (360 -> 540 derajat)
    const t = easeInOutCubic((time - 17) / 6);
    cycleDeg = lerp(360, 540, t);
    rpm = Math.round(lerp(3500, 6800, Math.sin(t * Math.PI)));
    activeStrokeIndex = 2;
  } else if (time < 28) {
    // Fokus Langkah 4: Buang (540 -> 720 derajat)
    const t = easeInOutCubic((time - 23) / 5);
    cycleDeg = lerp(540, 720, t);
    rpm = 3200;
    activeStrokeIndex = 3;
  } else {
    // Outro: Akselerasi RPM Tinggi
    const t = (time - 28) / 2;
    cycleDeg = (t * 2160) % 720;
    rpm = Math.round(lerp(4500, 9500, t));
    activeStrokeIndex = Math.floor(cycleDeg / 180);
  }

  const rad = (cycleDeg * Math.PI) / 180;

  // Pembukaan Klep (0.0 = Tutup, 1.0 = Buka Penuh)
  let intakeValve = 0;
  let exhaustValve = 0;
  if (cycleDeg >= 0 && cycleDeg <= 180) {
    intakeValve = Math.sin((cycleDeg / 180) * Math.PI);
  } else if (cycleDeg >= 540 && cycleDeg <= 720) {
    exhaustValve = Math.sin(((cycleDeg - 540) / 180) * Math.PI);
  }

  // Intensitas Api Busi & Ledakan (Sekitar 360 - 430 derajat)
  let sparkIntensity = 0;
  let explosionIntensity = 0;
  if (cycleDeg >= 352 && cycleDeg <= 395) {
    sparkIntensity = Math.sin(((cycleDeg - 352) / 43) * Math.PI);
  }
  if (cycleDeg >= 360 && cycleDeg <= 500) {
    explosionIntensity = Math.pow(1 - (cycleDeg - 360) / 140, 1.6);
  }

  return {
    cycleDeg,
    rad,
    rpm,
    activeStrokeIndex,
    intakeValve,
    exhaustValve,
    sparkIntensity,
    explosionIntensity
  };
}

// ==================== GAMBAR ILUSTRASI MESIN 4-TAK ====================
function drawEngineCutaway(ctx, time, kin) {
  const cx = 490; // Titik tengah silinder X
  const crankY = 735; // Titik pusat poros engkol Y
  const crankRadius = 78; // Jari-jari putaran engkol (r)
  const rodLength = 215; // Panjang stang seher (l)
  const boreWidth = 190; // Diameter dalam silinder
  const pistonHeight = 92;

  // Posisi Pena Engkol (Crankpin)
  // Sudut 0 = Titik Mati Atas (TMA / TDC), 180 = Titik Mati Bawah (TMB / BDC)
  const pinX = cx + crankRadius * Math.sin(kin.rad);
  const pinY = crankY - crankRadius * Math.cos(kin.rad);

  // Rumus Kinematika Posisi Pena Piston (Wrist Pin Y)
  const dy = Math.sqrt(Math.max(0, rodLength * rodLength - Math.pow(pinX - cx, 2)));
  const wristPinY = pinY - dy;
  const pistonTopY = wristPinY - 38;

  const tdcY = crankY - crankRadius - rodLength - 38; // ~404
  const bdcY = crankY + crankRadius - rodLength - 38; // ~560
  const headY = tdcY - 48; // Atap ruang bakar (~356)

  ctx.save();

  // 1. Kartu Latar Belakang Panel Mesin
  drawRoundedRect(ctx, 70, 130, 840, 810, 28);
  const panelGrad = ctx.createLinearGradient(70, 130, 70, 940);
  panelGrad.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
  panelGrad.addColorStop(1, 'rgba(10, 15, 29, 0.96)');
  ctx.fillStyle = panelGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.stroke();

  // Roda Gigi Dekoratif Berputar di Latar Panel
  drawGear(ctx, 165, 235, 52, 40, 12, time * 0.8, 'rgba(30, 41, 59, 0.7)');
  drawGear(ctx, 245, 285, 34, 25, 8, -time * 1.2, 'rgba(30, 41, 59, 0.7)');
  drawGear(ctx, 810, 830, 60, 46, 14, time * 0.6, 'rgba(30, 41, 59, 0.7)');

  // 2. Saluran Manifold Masuk (Kiri - Biru) & Knalpot Buang (Kanan - Ungu/Merah)
  // Intake Port
  ctx.beginPath();
  ctx.moveTo(cx - 230, headY - 55);
  ctx.quadraticCurveTo(cx - 110, headY - 55, cx - 55, headY);
  ctx.lineTo(cx - 20, headY);
  ctx.quadraticCurveTo(cx - 85, headY - 95, cx - 230, headY - 95);
  ctx.closePath();
  ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Exhaust Port
  ctx.beginPath();
  ctx.moveTo(cx + 230, headY - 55);
  ctx.quadraticCurveTo(cx + 110, headY - 55, cx + 55, headY);
  ctx.lineTo(cx + 20, headY);
  ctx.quadraticCurveTo(cx + 85, headY - 95, cx + 230, headY - 95);
  ctx.closePath();
  ctx.fillStyle = 'rgba(168, 85, 247, 0.18)';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Label INTAKE & EXHAUST
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText('UDARA + BENSIN (IN)', cx - 175, headY - 110);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('GAS BUANG (EX)', cx + 175, headY - 110);

  // 3. Sirip Pendingin Blok Silinder (Cooling Fins)
  for (let i = 0; i < 8; i++) {
    const finY = headY + 15 + i * 28;
    // Kiri
    drawRoundedRect(ctx, cx - boreWidth / 2 - 58, finY, 46, 14, 5);
    ctx.fillStyle = '#334155';
    ctx.fill();
    // Kanan
    drawRoundedRect(ctx, cx + boreWidth / 2 + 12, finY, 46, 14, 5);
    ctx.fill();
  }

  // 4. Warna Ruang Bakar (Combustion Chamber Glow)
  const chamberHeight = Math.max(10, pistonTopY - headY);
  const chamberGrad = ctx.createLinearGradient(cx, headY, cx, pistonTopY);
  if (kin.activeStrokeIndex === 0) {
    chamberGrad.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
    chamberGrad.addColorStop(1, 'rgba(14, 165, 233, 0.12)');
  } else if (kin.activeStrokeIndex === 1) {
    const compRatio = 1 - clamp((pistonTopY - tdcY) / (bdcY - tdcY), 0, 1);
    chamberGrad.addColorStop(0, `rgba(245, 158, 11, ${0.25 + compRatio * 0.55})`);
    chamberGrad.addColorStop(1, `rgba(239, 68, 68, ${0.15 + compRatio * 0.4})`);
  } else if (kin.activeStrokeIndex === 2) {
    chamberGrad.addColorStop(0, `rgba(254, 240, 138, ${0.4 + kin.explosionIntensity * 0.6})`);
    chamberGrad.addColorStop(0.5, `rgba(239, 68, 68, ${0.35 + kin.explosionIntensity * 0.5})`);
    chamberGrad.addColorStop(1, 'rgba(185, 28, 28, 0.2)');
  } else {
    chamberGrad.addColorStop(0, 'rgba(148, 163, 184, 0.35)');
    chamberGrad.addColorStop(1, 'rgba(71, 85, 105, 0.15)');
  }
  ctx.fillStyle = chamberGrad;
  ctx.fillRect(cx - boreWidth / 2, headY, boreWidth, chamberHeight);

  // 5. Partikel Gas di Dalam Silinder & Saluran
  particles.forEach((p, idx) => {
    const pxNorm = Math.abs((p.seedX + time * 0.15 * p.speedOffset) % 1);
    const pyNorm = Math.abs((p.seedY + time * 0.22 * p.speedOffset) % 1);

    let px = cx - boreWidth / 2 + 16 + pxNorm * (boreWidth - 32);
    let py = headY + 12 + pyNorm * Math.max(16, chamberHeight - 24);
    let pColor = 'rgba(56, 189, 248, 0.85)';
    let radius = p.size;

    if (kin.activeStrokeIndex === 0 && idx < 22) {
      // Sebagian partikel mengalir dari saluran Intake
      const flowT = (time * 1.8 + idx * 0.13) % 1;
      px = lerp(cx - 210, cx - 35, flowT);
      py = lerp(headY - 75, headY + 35, flowT * flowT);
      pColor = '#00f2fe';
    } else if (kin.activeStrokeIndex === 1) {
      pColor = '#fbbf24';
      radius = p.size * 0.9;
    } else if (kin.activeStrokeIndex === 2) {
      pColor = idx % 2 === 0 ? '#fef08a' : '#f97316';
      radius = p.size * (1 + kin.explosionIntensity * 0.8);
    } else if (kin.activeStrokeIndex === 3) {
      pColor = 'rgba(168, 162, 158, 0.75)';
      if (idx < 25) {
        // Partikel gas buang mengalir keluar knalpot
        const flowT = (time * 1.9 + idx * 0.11) % 1;
        px = lerp(cx + 35, cx + 215, flowT);
        py = lerp(headY + 25, headY - 75, flowT);
      }
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = pColor;
    ctx.fill();
  });

  // 6. Efek Gelombang Kejut Ledakan (Saat Langkah Usaha)
  if (kin.explosionIntensity > 0.05) {
    const shockR = (1 - kin.explosionIntensity) * 110;
    ctx.beginPath();
    ctx.arc(cx, headY + 24, shockR, 0, Math.PI);
    ctx.strokeStyle = `rgba(254, 240, 138, ${kin.explosionIntensity})`;
    ctx.lineWidth = 6 * kin.explosionIntensity;
    ctx.stroke();
  }

  // 7. Dinding Silinder & Ruang Crankcase
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';

  // Dinding Kiri & Kanan Silinder
  ctx.beginPath();
  ctx.moveTo(cx - boreWidth / 2, headY);
  ctx.lineTo(cx - boreWidth / 2, crankY - 95);
  ctx.arc(cx, crankY, 135, Math.PI * 1.23, Math.PI * 0.77, true);
  ctx.moveTo(cx + boreWidth / 2, headY);
  ctx.lineTo(cx + boreWidth / 2, crankY - 95);
  ctx.stroke();

  // Atap Kepala Silinder
  ctx.beginPath();
  ctx.moveTo(cx - boreWidth / 2 - 10, headY);
  ctx.lineTo(cx - 60, headY);
  ctx.moveTo(cx - 18, headY);
  ctx.lineTo(cx + 18, headY);
  ctx.moveTo(cx + 60, headY);
  ctx.lineTo(cx + boreWidth / 2 + 10, headY);
  ctx.stroke();

  // 8. Klep Masuk (Intake Valve - Kiri) & Klep Buang (Exhaust Valve - Kanan)
  const intakeLift = kin.intakeValve * 22;
  const exhaustLift = kin.exhaustValve * 22;

  // Pegas Klep (Valve Springs)
  drawSpring(ctx, cx - 39, headY - 95, headY - 22 + intakeLift, 24, 5);
  drawSpring(ctx, cx + 39, headY - 95, headY - 22 + exhaustLift, 24, 5);

  // Batang & Payung Klep Masuk
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx - 39, headY - 100);
  ctx.lineTo(cx - 39, headY + 4 + intakeLift);
  ctx.moveTo(cx - 60, headY + 4 + intakeLift);
  ctx.lineTo(cx - 18, headY + 4 + intakeLift);
  ctx.stroke();

  // Batang & Payung Klep Buang
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx + 39, headY - 100);
  ctx.lineTo(cx + 39, headY + 4 + exhaustLift);
  ctx.moveTo(cx + 18, headY + 4 + exhaustLift);
  ctx.lineTo(cx + 60, headY + 4 + exhaustLift);
  ctx.stroke();

  // Noken As / Camshaft Berputar di Atas Klep
  const camAngleIn = kin.rad / 2 - Math.PI * 0.25;
  const camAngleEx = kin.rad / 2 + Math.PI * 0.25;

  [
    { x: cx - 39, y: headY - 118, ang: camAngleIn, col: '#0284c7' },
    { x: cx + 39, y: headY - 118, ang: camAngleEx, col: '#9333ea' }
  ].forEach((cam) => {
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.ang);
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 21, 0, 0, Math.PI * 2);
    ctx.fillStyle = cam.col;
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();
  });

  // 9. Busi (Spark Plug) di Tengah Kepala Silinder
  drawRoundedRect(ctx, cx - 10, headY - 72, 20, 48, 4);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.fillRect(cx - 13, headY - 28, 26, 28);

  // Elektroda & Percikan Api Busi
  if (kin.sparkIntensity > 0.05) {
    ctx.save();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, headY);
    ctx.lineTo(cx - 8, headY + 10);
    ctx.lineTo(cx + 9, headY + 16);
    ctx.lineTo(cx - 4, headY + 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, headY + 10, 26 * kin.sparkIntensity, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(250, 204, 21, ${kin.sparkIntensity * 0.7})`;
    ctx.fill();
    ctx.restore();
  }

  // 10. Stang Piston (Connecting Rod)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, wristPinY);
  ctx.lineTo(pinX, pinY);
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#64748b';
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, wristPinY);
  ctx.lineTo(pinX, pinY);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#94a3b8';
  ctx.stroke();
  ctx.restore();

  // 11. Piston & Ring Piston
  const pLeft = cx - boreWidth / 2 + 6;
  const pWidth = boreWidth - 12;
  drawRoundedRect(ctx, pLeft, pistonTopY, pWidth, pistonHeight, 10);
  const pGrad = ctx.createLinearGradient(pLeft, pistonTopY, pLeft + pWidth, pistonTopY);
  pGrad.addColorStop(0, '#64748b');
  pGrad.addColorStop(0.5, '#cbd5e1');
  pGrad.addColorStop(1, '#475569');
  ctx.fillStyle = pGrad;
  ctx.fill();

  // 3 Garis Ring Piston (Kompresi 1, Kompresi 2, Ring Oli)
  [12, 22, 32].forEach((offsetY, i) => {
    ctx.fillStyle = i === 2 ? '#f59e0b' : '#1e293b';
    ctx.fillRect(pLeft - 2, pistonTopY + offsetY, pWidth + 4, 4);
  });

  // Pena Piston (Wrist Pin)
  ctx.beginPath();
  ctx.arc(cx, wristPinY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, wristPinY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  // 12. Poros Engkol (Crankshaft & Counterweight Web)
  ctx.save();
  ctx.translate(cx, crankY);
  ctx.rotate(kin.rad);

  // Bandul Penyeimbang (Counterweight)
  ctx.beginPath();
  ctx.arc(0, 0, 96, -Math.PI * 0.25, Math.PI * 1.25);
  ctx.lineTo(-32, -82);
  ctx.lineTo(32, -82);
  ctx.closePath();
  const cwGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 98);
  cwGrad.addColorStop(0, '#94a3b8');
  cwGrad.addColorStop(1, '#334155');
  ctx.fillStyle = cwGrad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  // Poros Tengah (Main Journal)
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Crankpin Journal (Titik Sambung Stang ke Kruk As)
  ctx.beginPath();
  ctx.arc(pinX, pinY, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();

  // Panah Arah Putaran Kruk As
  ctx.beginPath();
  ctx.arc(cx, crankY, 115, -Math.PI * 0.7, -Math.PI * 0.3);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Indikator Sudut Engkol & TMA / TMB
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('TMA (0°)', cx - boreWidth / 2 - 68, tdcY + 5);
  ctx.fillText('TMB (180°)', cx - boreWidth / 2 - 68, bdcY + 5);

  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`SUDUT ENGKOL: ${Math.round(kin.cycleDeg)}° / 720°`, cx, 905);

  ctx.restore();
}

// ==================== GAMBAR IKON VEKTOR 4 LANGKAH ====================
function drawStepIcon(ctx, stepIndex, x, y, radius, color, pulseTime) {
  ctx.save();
  ctx.translate(x, y);
  const scale = 1 + Math.sin(pulseTime * 5) * 0.08;
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = `${color}22`;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stepIndex === 0) {
    // Ikon Langkah Hisap: Panah Turun + Tetes Bahan Bakar
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 12);
    ctx.moveTo(-9, 3);
    ctx.lineTo(0, 13);
    ctx.lineTo(9, 3);
    ctx.stroke();
  } else if (stepIndex === 1) {
    // Ikon Langkah Kompresi: Panah Memadat ke Atas
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, -12);
    ctx.moveTo(0, 14);
    ctx.lineTo(0, -5);
    ctx.moveTo(-8, 3);
    ctx.lineTo(0, -6);
    ctx.lineTo(8, 3);
    ctx.stroke();
  } else if (stepIndex === 2) {
    // Ikon Langkah Usaha: Kilatan Petir / Api Busi
    ctx.beginPath();
    ctx.moveTo(4, -15);
    ctx.lineTo(-9, 2);
    ctx.lineTo(1, 2);
    ctx.lineTo(-4, 15);
    ctx.lineTo(10, -2);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();
  } else if (stepIndex === 3) {
    // Ikon Langkah Buang: Gelombang Gas Keluar
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-12, i * 8);
      ctx.quadraticCurveTo(-4, i * 8 - 5, 4, i * 8);
      ctx.quadraticCurveTo(10, i * 8 + 5, 14, i * 8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ==================== GAMBAR PANEL DASHBOARD & KARTU INFORMASI ====================
function drawRightDashboard(ctx, time, kin, activeScene) {
  const startX = 955;
  const panelW = 895;

  // 1. Kartu Header RPM & Status Mesin
  drawRoundedRect(ctx, startX, 130, panelW, 175, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.stroke();

  // Gauge Tachometer Lingkaran (Kiri Header)
  const gaugeX = startX + 105;
  const gaugeY = 225;
  ctx.beginPath();
  ctx.arc(gaugeX, gaugeY, 62, Math.PI * 0.8, Math.PI * 2.2);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  const rpmRatio = clamp(kin.rpm / 10000, 0, 1);
  ctx.beginPath();
  ctx.arc(gaugeX, gaugeY, 62, Math.PI * 0.8, Math.PI * (0.8 + rpmRatio * 1.4));
  ctx.strokeStyle = activeScene.color;
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${kin.rpm}`, gaugeX, gaugeY + 6);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('RPM', gaugeX, gaugeY + 26);

  // Teks Judul Fase Aktif di Header Kanan
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = activeScene.color;
  ctx.fillText('FASE SIKLUS AKTIF', startX + 200, 178);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(activeScene.title, startX + 200, 222);

  // Indikator Status Klep & Busi
  const badges = [
    { label: `KLEP MASUK: ${kin.intakeValve > 0.1 ? 'BUKA' : 'TUTUP'}`, active: kin.intakeValve > 0.1, col: '#00f2fe' },
    { label: `KLEP BUANG: ${kin.exhaustValve > 0.1 ? 'BUKA' : 'TUTUP'}`, active: kin.exhaustValve > 0.1, col: '#a855f7' },
    { label: `BUSI: ${kin.sparkIntensity > 0.1 ? 'MENYALA!' : 'SIAGA'}`, active: kin.sparkIntensity > 0.1, col: '#ef4444' }
  ];

  badges.forEach((b, i) => {
    const bx = startX + 200 + i * 220;
    const by = 245;
    drawRoundedRect(ctx, bx, by, 205, 36, 10);
    ctx.fillStyle = b.active ? `${b.col}33` : 'rgba(30, 41, 59, 0.8)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = b.active ? b.col : 'rgba(100, 116, 139, 0.3)';
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = b.active ? '#ffffff' : '#94a3b8';
    ctx.fillText(b.label, bx + 16, by + 23);
  });

  // 2. Empat Kartu Siklus 4-Tak dengan Animasi Spring
  const stepsInfo = [
    {
      name: '1. LANGKAH HISAP (INTAKE)',
      desc: 'Piston bergerak dari TMA ke TMB (0°–180°). Klep masuk terbuka menghisap campuran udara & bensin.',
      color: '#00f2fe'
    },
    {
      name: '2. LANGKAH KOMPRESI (COMPRESSION)',
      desc: 'Piston naik dari TMB ke TMA (180°–360°). Kedua klep menutup rapat, memampatkan gas hingga panas.',
      color: '#f59e0b'
    },
    {
      name: '3. LANGKAH USAHA (POWER)',
      desc: 'Busi memercikkan api di TMA (360°–540°). Ledakan gas mendorong piston turun memutar roda.',
      color: '#ef4444'
    },
    {
      name: '4. LANGKAH BUANG (EXHAUST)',
      desc: 'Piston naik kembali ke TMA (540°–720°). Klep buang terbuka mendorong asap keluar knalpot.',
      color: '#a855f7'
    }
  ];

  stepsInfo.forEach((step, idx) => {
    const isFocused = kin.activeStrokeIndex === idx;
    const cardEnter = easeOutBack(clamp((time - idx * 0.25) / 0.8, 0, 1));
    const offsetX = isFocused ? -14 : 0;
    const cardX = startX + offsetX + (1 - cardEnter) * 120;
    const cardY = 330 + idx * 155;
    const cardH = 136;

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, panelW, cardH, 20);
    ctx.fillStyle = isFocused ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.78)';
    ctx.fill();
    ctx.lineWidth = isFocused ? 3 : 1.5;
    ctx.strokeStyle = isFocused ? step.color : 'rgba(148, 163, 184, 0.18)';
    ctx.stroke();

    // Accent Bar di Sisi Kiri Kartu
    drawRoundedRect(ctx, cardX, cardY, 10, cardH, 5);
    ctx.fillStyle = isFocused ? step.color : '#334155';
    ctx.fill();

    // Ikon Vektor Langkah
    drawStepIcon(ctx, idx, cardX + 62, cardY + cardH / 2, 34, step.color, isFocused ? time : 0);

    // Teks Judul & Penjelasan Kartu
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = isFocused ? '#ffffff' : '#cbd5e1';
    ctx.fillText(step.name, cardX + 118, cardY + 50);

    ctx.font = '17px sans-serif';
    ctx.fillStyle = isFocused ? '#e2e8f0' : '#94a3b8';
    ctx.fillText(step.desc, cardX + 118, cardY + 88);

    // Badge AKTIF
    if (isFocused) {
      drawRoundedRect(ctx, cardX + panelW - 125, cardY + 22, 98, 30, 8);
      ctx.fillStyle = step.color;
      ctx.fill();
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.fillText('AKTIF', cardX + panelW - 76, cardY + 42);
    }
    ctx.restore();
  });
}

// ==================== GAMBAR HEADER, SUBTITLE NARATOR & TIMELINE ====================
function drawOverlayUI(ctx, time, activeScene) {
  // Header Atas
  ctx.textAlign = 'left';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('CARA KERJA MESIN SEPEDA MOTOR (4-TAK)', 70, 78);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('Edukasi Mekanik & Animasi Kinematika Siklus Pembakaran Dalam', 70, 106);

  // Badge Durasi Kanan Atas
  drawRoundedRect(ctx, WIDTH - 250, 48, 180, 46, 12);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`⏱ ${time.toFixed(1)}s / 30.0s`, WIDTH - 160, 77);

  // Bar Subtitle & Audio Waveform di Bawah
  drawRoundedRect(ctx, 70, 962, WIDTH - 140, 84, 18);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = activeScene.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Animasi Audio Waveform Narator (Kiri Bar Subtitle)
  const waveStartX = 105;
  const waveCenterY = 1004;
  for (let i = 0; i < 12; i++) {
    const barH = 10 + Math.abs(Math.sin(time * 12 + i * 0.7)) * 34;
    drawRoundedRect(ctx, waveStartX + i * 8, waveCenterY - barH / 2, 5, barH, 2.5);
    ctx.fillStyle = activeScene.color;
    ctx.fill();
  }

  // Teks Subtitle Narasi Suara
  ctx.textAlign = 'left';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`"${activeScene.subtitle}"`, 225, 1011);

  // Progress Bar Timeline Video di Paling Bawah
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, HEIGHT - 8, WIDTH, 8);
  ctx.fillStyle = activeScene.color;
  ctx.fillRect(0, HEIGHT - 8, WIDTH * (time / DURATION), 8);
}

// ==================== RENDER FRAME UTAMA ====================
function renderFrame(ctx, frameIndex) {
  const time = frameIndex / FPS;
  const activeScene =
    SCENES.find((s) => time >= s.start && time < s.end) || SCENES[SCENES.length - 1];
  const kin = getEngineKinematics(time);

  // 1. Background Gelap Bergradasi + Grid Blueprint
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
  ctx.lineWidth = 1;
  const gridOffset = (time * 20) % 60;
  for (let x = -gridOffset; x < WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  // 2. Gambar Mekanik Mesin (Kiri)
  drawEngineCutaway(ctx, time, kin);

  // 3. Gambar Dashboard & 4 Kartu Siklus (Kanan)
  drawRightDashboard(ctx, time, kin, activeScene);

  // 4. Gambar Header & Subtitle Narator (Atas & Bawah)
  drawOverlayUI(ctx, time, activeScene);
}

// ==================== PIPELINE RENDERING KE MP4 (FFMPEG) ====================
async function main() {
  const voiceFiles = await prepareVoiceovers();
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Susun argumen FFmpeg untuk menggabungkan pipa frame video + 6 segmen suara narator
  const ffmpegArgs = [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${WIDTH}x${HEIGHT}`,
    '-r', `${FPS}`,
    '-i', '-' // Input 0: Video stream dari Canvas
  ];

  // Input 1..6: File audio narator tiap scene
  voiceFiles.forEach((vf) => {
    ffmpegArgs.push('-i', vf.path);
  });

  // Filter audio: Atur waktu muncul (adelay) & percepat sedikit tempo suara (atempo=1.18) agar pas di tiap segmen
  const filterParts = [];
  const mixInputs = [];
  voiceFiles.forEach((vf, idx) => {
    const inputIdx = idx + 1;
    const d = vf.delayMs;
    filterParts.push(`[${inputIdx}:a]atempo=1.18,adelay=${d}|${d}[a${idx}]`);
    mixInputs.push(`[a${idx}]`);
  });

  filterParts.push(
    `${mixInputs.join('')}amix=inputs=${voiceFiles.length}:normalize=0,apad=whole_dur=${DURATION}[aout]`
  );

  ffmpegArgs.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', `${DURATION}`,
    OUTPUT_FILE
  );

  console.log('🎬 Memulai proses render 900 frame (30 detik @ 30 FPS)...');
  const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

  ffmpeg.stderr.on('data', () => {
    // Abaikan log standar FFmpeg agar terminal tetap rapi
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    renderFrame(ctx, frame);
    const rawBuffer = canvas.data(); // Buffer RGBA langsung dari memori

    const canWrite = ffmpeg.stdin.write(rawBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    if ((frame + 1) % 90 === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      console.log(`⏳ Progress Render: ${pct}% (${frame + 1}/${TOTAL_FRAMES} frame)`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg berhenti dengan kode: ${code}`));
    });
  });

  // Bersihkan file audio sementara
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.log(`✅ Selesai! Video berhasil dibuat di: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('❌ Terjadi kesalahan saat merender video:', err);
  process.exit(1);
});
