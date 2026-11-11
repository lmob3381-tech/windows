```javascript
/**
 * render.js - Animasi Edukasi Cara Kerja Mesin Mobil 4-Tak & Komponen Utama
 * Format: Portrait 9:16 (1080x1920) | Durasi: 40.0 Detik | 30 FPS
 * Library: @napi-rs/canvas + ffmpeg CLI + global.generateStudioVoice
 */

const { createCanvas } = require('@napi-rs/canvas');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. KONFIGURASI SUARA & VIDEO
// ============================================================================
const VOICE_MODEL = 'char_mekanik_ahli';

// Resolusi 9:16 (Vertical Reels / Shorts / TikTok)
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 40; // Total tepat 40 detik
const TOTAL_FRAMES = FPS * DURATION;

// ============================================================================
// 2. SEGMEN NARASI & TIMELINE (ANTI-TABRAKAN AUDIO, FULL 40 DETIK)
// ============================================================================
// Setiap segmen memiliki jendela waktu longgar dan kecepatan kata yang terukur
// (~2.3 kata/detik) agar suara selesai sebelum segmen berikutnya dimulai.
const SEGMENTS = [
  {
    id: 0,
    start: 0.0,
    end: 5.5,
    phase: 'intro',
    badge: 'OVERVIEW MESIN',
    title: 'JANTUNG PACU MOBIL',
    subtitle: 'Mengubah Ledakan BBM Menjadi Gerak Roda',
    highlight: 'all',
    narration: 'Pernah penasaran bagaimana mesin mobil mengubah bensin menjadi tenaga luar biasa? Mari kita bedah cara kerjanya secara bertahap.'
  },
  {
    id: 1,
    start: 5.5,
    end: 12.5,
    phase: 'components',
    badge: 'KOMPONEN UTAMA',
    title: '5 KOMPONEN INTI',
    subtitle: 'Silinder • Piston • Stang • Kruk As • Katup & Busi',
    highlight: 'components',
    narration: 'Di dalam blok silinder, ada piston yang bergerak naik turun, stang piston sebagai penghubung, kruk as pemutar roda, serta katup dan busi.'
  },
  {
    id: 2,
    start: 12.5,
    end: 19.0,
    phase: 'intake',
    badge: 'LANGKAH 1 • INTAKE',
    title: 'LANGKAH HISAP',
    subtitle: 'Katup Masuk Terbuka • Campuran Udara & BBM Masuk',
    highlight: 'intake_valve',
    narration: 'Langkah pertama, hisap. Katup masuk terbuka dan piston bergerak turun, menyedot kabut campuran udara serta bahan bakar ke ruang bakar.'
  },
  {
    id: 3,
    start: 19.0,
    end: 25.5,
    phase: 'compression',
    badge: 'LANGKAH 2 • COMPRESSION',
    title: 'LANGKAH KOMPRESI',
    subtitle: 'Kedua Katup Tertutup • Tekanan & Suhu Naik Drastis',
    highlight: 'piston',
    narration: 'Langkah kedua, kompresi. Kedua katup menutup rapat lalu piston bergerak naik, memadatkan campuran tadi hingga bertekanan dan bersuhu sangat tinggi.'
  },
  {
    id: 4,
    start: 25.5,
    end: 32.5,
    phase: 'power',
    badge: 'LANGKAH 3 • POWER',
    title: 'LANGKAH USAHA',
    subtitle: 'Busi Memercik Api • Ledakan Mendorong Piston Turun',
    highlight: 'spark_plug',
    narration: 'Langkah ketiga, usaha. Busi memercikkan bunga api yang memicu ledakan dahsyat, menghempaskan piston ke bawah untuk memutar kruk as dengan kuat.'
  },
  {
    id: 5,
    start: 32.5,
    end: 40.0,
    phase: 'exhaust',
    badge: 'LANGKAH 4 • EXHAUST',
    title: 'LANGKAH BUANG & TORSI',
    subtitle: 'Katup Buang Terbuka • Siklus Ribuan RPM Menggerakkan Mobil',
    highlight: 'exhaust_valve',
    narration: 'Terakhir, langkah buang. Katup buang terbuka dan piston naik mendorong sisa asap keluar. Siklus ini berulang ribuan kali per menit untuk melajukan mobil!'
  }
];

// ============================================================================
// 3. SISTEM PARTIKEL & VFX ENGINE
// ============================================================================
const bgParticles = Array.from({ length: 45 }, (_, i) => ({
  x: (Math.sin(i * 78.233) * 0.5 + 0.5) * WIDTH,
  y: (Math.cos(i * 45.164) * 0.5 + 0.5) * HEIGHT,
  r: 1.5 + (i % 4) * 1.2,
  speedY: -15 - (i % 5) * 8,
  alpha: 0.15 + (i % 4) * 0.08,
  hue: i % 2 === 0 ? '#00f2fe' : '#ff9a00'
}));

const chamberParticles = Array.from({ length: 65 }, (_, i) => ({
  seedX: (Math.sin(i * 12.9898) * 43758.5453) % 1,
  seedY: (Math.cos(i * 78.233) * 23421.631) % 1,
  size: 4 + (i % 5) * 2.5,
  speed: 0.6 + (i % 7) * 0.15,
  offset: i * 0.37
}));

// Helper Matematika & Easing
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(t) {
  const x = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Helper Menggambar Rounded Rectangle
function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// ============================================================================
// 4. GENERATOR AUDIO TTS PRESISI & ANTI-OVERLAP
// ============================================================================
function getAudioDuration(filePath) {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const out = execSync(cmd).toString().trim();
    const parsed = parseFloat(out);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch (e) {
    return 0;
  }
}

async function generateVoiceSegment(text, outputPath) {
  if (typeof global.generateStudioVoice === 'function') {
    await global.generateStudioVoice(text, outputPath, VOICE_MODEL);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 100) {
      return;
    }
  }
  // Fallback darurat jika fungsi global mengalami kendala di environment tertentu
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 4.0 -q:a 9 -acodec libmp3lame "${outputPath}"`,
    { stdio: 'ignore' }
  );
}

async function buildMasterAudio(tempDir) {
  console.log('[AUDIO] Memulai pembuatan narasi suara bertahap (VOICE_MODEL: ' + VOICE_MODEL + ')...');
  const segmentFiles = [];

  for (let i = 0; i < SEGMENTS.length; i++) {
    const seg = SEGMENTS[i];
    const rawMp3 = path.join(tempDir, `seg_${i}_raw.mp3`);
    const fitWav = path.join(tempDir, `seg_${i}_fit.wav`);

    await generateVoiceSegment(seg.narration, rawMp3);

    const slotDuration = seg.end - seg.start;
    const safetyWindow = slotDuration - 0.35; // Jeda aman 0.35 detik antar kalimat agar tidak tabrakan
    const actualDur = getAudioDuration(rawMp3);

    // Jika durasi audio TTS melebihi slot aman, percepat sedikit secara dinamis (tanpa 1.18 statis)
    if (actualDur > safetyWindow && safetyWindow > 1.0) {
      const ratio = clamp(actualDur / safetyWindow, 1.01, 1.35).toFixed(3);
      execSync(
        `ffmpeg -y -i "${rawMp3}" -filter:a "atempo=${ratio}" -ar 44100 -ac 2 "${fitWav}"`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(
        `ffmpeg -y -i "${rawMp3}" -ar 44100 -ac 2 "${fitWav}"`,
        { stdio: 'ignore' }
      );
    }

    segmentFiles.push({
      path: fitWav,
      startMs: Math.round(seg.start * 1000)
    });
  }

  // Rangkai seluruh segmen audio tepat pada timestamp masing-masing + ambient mesin halus
  const masterWav = path.join(tempDir, 'master_audio.wav');
  const inputs = [];
  const filterParts = [];

  // Input 0: Track keheningan dasar 40 detik
  inputs.push('-f', 'lavfi', '-t', String(DURATION), '-i', 'anullsrc=r=44100:cl=stereo');

  segmentFiles.forEach((seg, idx) => {
    inputs.push('-i', seg.path);
    const inputIdx = idx + 1;
    filterParts.push(
      `[${inputIdx}:a]adelay=${seg.startMs}|${seg.startMs},volume=1.15[v${inputIdx}]`
    );
  });

  const mixLabels = ['[0:a]', ...segmentFiles.map((_, idx) => `[v${idx + 1}]`)].join('');
  const totalInputs = segmentFiles.length + 1;
  filterParts.push(
    `${mixLabels}amix=inputs=${totalInputs}:duration=first:dropout_transition=0,dynaudnorm=f=150:g=15[aout]`
  );

  const filterComplex = filterParts.join(';');
  const ffmpegArgs = [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[aout]',
    '-t',
    String(DURATION),
    '-ar',
    '44100',
    '-ac',
    '2',
    masterWav
  ];

  execSync(`ffmpeg ${ffmpegArgs.map((a) => `"${a}"`).join(' ')}`, { stdio: 'ignore' });
  console.log('[AUDIO] Master audio 40 detik berhasil disinkronkan tanpa tumpang tindih.');
  return masterWav;
}

// ============================================================================
// 5. KINEMATIKA MESIN 4-TAK & PARAMETER SIKLUS
// ============================================================================
function getEngineKinematics(timeSec, segment) {
  let crankAngle = 0; // 0..720 derajat untuk 1 siklus 4-tak penuh (2 putaran kruk as)
  let strokeType = 'intro';
  let rpmValue = 2400;
  let strokeProgress = 0;

  const segElapsed = timeSec - segment.start;
  const segDuration = segment.end - segment.start;
  const normT = clamp(segElapsed / segDuration, 0, 1);

  if (segment.phase === 'intro') {
    // Putaran cepat & bertenaga untuk pembuka
    crankAngle = (timeSec * 360) % 720;
    rpmValue = Math.round(lerp(1200, 3800, easeInOutCubic(normT)));
  } else if (segment.phase === 'components') {
    // Putaran lambat elegan saat membedah komponen satu per satu
    crankAngle = (timeSec * 150) % 720;
    rpmValue = 1500;
  } else if (segment.phase === 'intake') {
    // Fokus Langkah 1: Hisap (0 -> 180 derajat, Piston turun dari TMA ke TMB)
    // Diulang 2 kali secara halus agar visual gerakan menghisap terlihat sangat jelas
    const cycleT = (normT * 1.6) % 1;
    strokeProgress = easeInOutCubic(cycleT);
    crankAngle = lerp(0, 180, strokeProgress);
    rpmValue = 1800;
  } else if (segment.phase === 'compression') {
    // Fokus Langkah 2: Kompresi (180 -> 360 derajat, Piston naik dari TMB ke TMA)
    const cycleT = (normT * 1.6) % 1;
    strokeProgress = easeInOutCubic(cycleT);
    crankAngle = lerp(180, 360, strokeProgress);
    rpmValue = 2400;
  } else if (segment.phase === 'power') {
    // Fokus Langkah 3: Usaha / Ledakan (360 -> 540 derajat, Ledakan Busi -> Piston turun cepat)
    const cycleT = (normT * 1.8) % 1;
    strokeProgress = Math.pow(cycleT, 0.75); // Akselerasi cepat akibat ledakan
    crankAngle = lerp(360, 540, strokeProgress);
    rpmValue = 4500;
  } else if (segment.phase === 'exhaust') {
    // Fokus Langkah 4: Buang (540 -> 720 derajat) lalu transisi ke putaran kecepatan tinggi
    if (normT < 0.55) {
      const localT = normT / 0.55;
      strokeProgress = easeInOutCubic(localT);
      crankAngle = lerp(540, 720, strokeProgress);
      rpmValue = 2800;
    } else {
      const highSpeedT = (normT - 0.55) / 0.45;
      crankAngle = ((timeSec - segment.start) * 650) % 720;
      rpmValue = Math.round(lerp(3200, 6200, highSpeedT));
    }
  }

  // Tentukan langkah aktif berdasarkan sudut kruk as (0 - 720)
  const modAngle = ((crankAngle % 720) + 720) % 720;
  if (modAngle < 180) {
    strokeType = 'intake';
    strokeProgress = modAngle / 180;
  } else if (modAngle < 360) {
    strokeType = 'compression';
    strokeProgress = (modAngle - 180) / 180;
  } else if (modAngle < 540) {
    strokeType = 'power';
    strokeProgress = (modAngle - 360) / 180;
  } else {
    strokeType = 'exhaust';
    strokeProgress = (modAngle - 540) / 180;
  }

  // Bukaan katup (0 = tertutup rapat, 1 = terbuka penuh)
  const intakeValveOpen = strokeType === 'intake' ? Math.sin(strokeProgress * Math.PI) : 0;
  const exhaustValveOpen = strokeType === 'exhaust' ? Math.sin(strokeProgress * Math.PI) : 0;

  // Intensitas percikan busi & ledakan pada awal langkah Usaha (360 - 430 derajat)
  let sparkIntensity = 0;
  let explosionIntensity = 0;
  if (strokeType === 'power') {
    if (strokeProgress < 0.28) {
      sparkIntensity = Math.sin((strokeProgress / 0.28) * Math.PI);
    }
    explosionIntensity = Math.pow(1 - strokeProgress, 1.5);
  }

  return {
    crankAngle: modAngle,
    strokeType,
    strokeProgress,
    intakeValveOpen,
    exhaustValveOpen,
    sparkIntensity,
    explosionIntensity,
    rpmValue
  };
}

// ============================================================================
// 6. KOMPONEN VISUAL, IKON, & EFEK VFX
// ============================================================================

function drawBackgroundGridAndVFX(ctx, timeSec, kin) {
  // 1. Gradien Latar Belakang Engineering Gelap
  const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bgGrad.addColorStop(0, '#060b16');
  bgGrad.addColorStop(0.5, '#0b1528');
  bgGrad.addColorStop(1, '#050811');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Cahaya Ambient Dinamis Berdasarkan Langkah Mesin
  let glowColor = 'rgba(0, 242, 254, 0.14)';
  if (kin.strokeType === 'compression') glowColor = 'rgba(255, 174, 0, 0.16)';
  if (kin.strokeType === 'power') glowColor = 'rgba(255, 59, 48, 0.25)';
  if (kin.strokeType === 'exhaust') glowColor = 'rgba(160, 174, 192, 0.14)';

  const radGrad = ctx.createRadialGradient(WIDTH / 2, 960, 40, WIDTH / 2, 960, 620);
  radGrad.addColorStop(0, glowColor);
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 3. Grid Blueprint Otomotif
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 210, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  const offsetY = (timeSec * 20) % gridSize;
  for (let x = 0; x <= WIDTH; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = offsetY; y <= HEIGHT; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Partikel Energi Melayang
  ctx.save();
  for (const p of bgParticles) {
    const py = ((p.y + p.speedY * timeSec) % HEIGHT + HEIGHT) % HEIGHT;
    const px = p.x + Math.sin(timeSec * 1.5 + p.r) * 18;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.hue;
    ctx.globalAlpha = p.alpha;
    ctx.fill();
  }
  ctx.restore();
}

// Menggambar Ikon Kustom di Kartu Penjelasan Komponen
function drawComponentIcon(ctx, type, cx, cy, radius, accentColor, timeSec) {
  ctx.save();
  ctx.translate(cx, cy);

  // Lingkaran dasar ikon
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 22, 42, 0.9)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = accentColor;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'intake_valve' || type === 'exhaust_valve') {
    // Ikon Katup Payung + Aliran Gas
    const shiftY = Math.sin(timeSec * 6) * 5;
    ctx.beginPath();
    ctx.moveTo(0, -18 + shiftY);
    ctx.lineTo(0, 10 + shiftY);
    ctx.moveTo(-16, 10 + shiftY);
    ctx.lineTo(16, 10 + shiftY);
    ctx.lineTo(10, 4 + shiftY);
    ctx.moveTo(-16, 10 + shiftY);
    ctx.lineTo(-10, 4 + shiftY);
    ctx.stroke();
  } else if (type === 'piston') {
    // Ikon Silinder Piston & Ring
    drawRoundedRect(ctx, -15, -18, 30, 26, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-15, -10);
    ctx.lineTo(15, -10);
    ctx.moveTo(-15, -4);
    ctx.lineTo(15, -4);
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 22);
    ctx.stroke();
  } else if (type === 'spark_plug') {
    // Ikon Petir / Busi Pengapian
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(-12, 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(-6, 22);
    ctx.lineTo(14, -4);
    ctx.lineTo(0, -4);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'crankshaft') {
    // Ikon Roda Gigi / Putaran Kruk As
    ctx.rotate(timeSec * 2.5);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      ctx.stroke();
    }
  } else {
    // Ikon Mesin Utama
    drawRoundedRect(ctx, -18, -12, 36, 26, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -19);
    ctx.lineTo(10, -19);
    ctx.moveTo(0, -19);
    ctx.lineTo(0, -12);
    ctx.moveTo(18, 0);
    ctx.lineTo(24, 0);
    ctx.moveTo(24, -8);
    ctx.lineTo(24, 8);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// 7. SIMULASI UTAMA: MESIN 4-TAK + PARTIKEL + CALLOUT KOMPONEN
// ============================================================================
function drawEngineCutaway(ctx, timeSec, segment, kin) {
  const centerX = WIDTH / 2;
  const crankCenterY = 1170;
  const crankRadius = 115; // Jari-jari putaran kruk as
  const rodLength = 295;   // Panjang stang piston (connecting rod)

  const cylWidth = 290;
  const cylLeft = centerX - cylWidth / 2;
  const cylRight = centerX + cylWidth / 2;
  const cylTop = 530;      // Batas atas ruang bakar (Cylinder Head)
  const cylBottom = 975;   // Batas bawah dinding silinder
  const pistonHeight = 115;
  const pistonWidth = cylWidth - 16;

  // Sudut engkol dalam radian (0 derajat = Titik Mati Atas / TMA)
  const theta = (kin.crankAngle * Math.PI) / 180;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  // Posisi pena kruk as (Crankpin)
  const pinX = centerX + crankRadius * sinT;
  const pinY = crankCenterY - crankRadius * cosT;

  // Posisi pena piston (Wrist pin) menggunakan rumus kinematika slider-crank murni
  const dyRod = Math.sqrt(Math.max(1, rodLength * rodLength - Math.pow(crankRadius * sinT, 2)));
  const wristPinY = pinY - dyRod;
  const pistonTopY = wristPinY - pistonHeight * 0.45;
  const pistonBottomY = pistonTopY + pistonHeight;

  // Efek getaran kamera halus saat terjadi ledakan langkah Usaha (Power Stroke)
  const shakeX = kin.explosionIntensity > 0.3 ? Math.sin(timeSec * 90) * kin.explosionIntensity * 7 : 0;
  const shakeY = kin.explosionIntensity > 0.3 ? Math.cos(timeSec * 85) * kin.explosionIntensity * 7 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // --------------------------------------------------------------------------
  // A. SALURAN INTAKE (KIRI) & EXHAUST (KANAN) DI KEPALA SILINDER
  // --------------------------------------------------------------------------
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2d3f5e';

  // Saluran Masuk (Intake Manifold - Kiri)
  ctx.fillStyle = 'rgba(0, 195, 255, 0.14)';
  ctx.beginPath();
  ctx.moveTo(cylLeft - 140, cylTop - 95);
  ctx.quadraticCurveTo(cylLeft - 30, cylTop - 95, cylLeft + 30, cylTop);
  ctx.lineTo(cylLeft + 105, cylTop);
  ctx.quadraticCurveTo(cylLeft + 65, cylTop - 145, cylLeft - 140, cylTop - 145);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Saluran Buang (Exhaust Manifold - Kanan)
  ctx.fillStyle = 'rgba(255, 107, 74, 0.14)';
  ctx.beginPath();
  ctx.moveTo(cylRight + 140, cylTop - 95);
  ctx.quadraticCurveTo(cylRight + 30, cylTop - 95, cylRight - 30, cylTop);
  ctx.lineTo(cylRight - 105, cylTop);
  ctx.quadraticCurveTo(cylRight - 65, cylTop - 145, cylRight + 140, cylTop - 145);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --------------------------------------------------------------------------
  // B. RUANG BAKAR & VFX FLUIDA / PARTIKEL / LEDAKAN API
  // --------------------------------------------------------------------------
  const chamberHeight = Math.max(24, pistonTopY - cylTop);

  // Gradien warna di dalam ruang bakar sesuai siklus
  const chamberGrad = ctx.createLinearGradient(centerX, cylTop, centerX, pistonTopY);
  if (kin.strokeType === 'intake') {
    chamberGrad.addColorStop(0, 'rgba(0, 225, 255, 0.55)');
    chamberGrad.addColorStop(1, 'rgba(0, 140, 255, 0.20)');
  } else if (kin.strokeType === 'compression') {
    const compHeat = kin.strokeProgress;
    chamberGrad.addColorStop(0, `rgba(255, ${Math.round(lerp(200, 90, compHeat))}, 0, ${lerp(0.35, 0.82, compHeat).toFixed(2)})`);
    chamberGrad.addColorStop(1, `rgba(255, 160, 0, ${lerp(0.2, 0.65, compHeat).toFixed(2)})`);
  } else if (kin.strokeType === 'power') {
    const pwr = kin.explosionIntensity;
    chamberGrad.addColorStop(0, `rgba(255, 255, 210, ${clamp(pwr * 1.1, 0.2, 0.98).toFixed(2)})`);
    chamberGrad.addColorStop(0.35, `rgba(255, 95, 0, ${clamp(pwr * 0.95, 0.2, 0.9).toFixed(2)})`);
    chamberGrad.addColorStop(1, `rgba(220, 20, 20, ${clamp(pwr * 0.6, 0.1, 0.7).toFixed(2)})`);
  } else {
    // Exhaust (Asap abu-abu hangat)
    chamberGrad.addColorStop(0, 'rgba(140, 152, 170, 0.55)');
    chamberGrad.addColorStop(1, 'rgba(75, 85, 102, 0.25)');
  }

  ctx.fillStyle = chamberGrad;
  ctx.fillRect(cylLeft + 6, cylTop, cylWidth - 12, chamberHeight);

  // Simulasi Partikel di Dalam Ruang Bakar & Saluran Katup
  ctx.save();
  for (let i = 0; i < chamberParticles.length; i++) {
    const pt = chamberParticles[i];
    const animPhase = (timeSec * pt.speed + pt.offset) % 1;

    if (kin.strokeType === 'intake') {
      // Partikel biru muda mengalir masuk dari saluran kiri ke ruang bakar
      const px = lerp(cylLeft + 25, cylRight - 25, (pt.seedX + animPhase * 0.4) % 1);
      const py = lerp(cylTop - 30, pistonTopY - 12, animPhase);
      if (py >= cylTop - 40 && py <= pistonTopY - 8) {
        ctx.beginPath();
        ctx.arc(px, py, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#00f2fe' : '#70ffdf';
        ctx.globalAlpha = 0.75;
        ctx.fill();
      }
    } else if (kin.strokeType === 'compression') {
      // Partikel merapat dan bergetar cepat karena dipadatkan piston
      const jitter = Math.sin(timeSec * 35 + i) * 5 * kin.strokeProgress;
      const px = lerp(cylLeft + 22, cylRight - 22, Math.abs(pt.seedX)) + jitter;
      const py = lerp(cylTop + 14, pistonTopY - 14, Math.abs(pt.seedY));
      ctx.beginPath();
      ctx.arc(px, py, pt.size * lerp(1, 0.8, kin.strokeProgress), 0, Math.PI * 2);
      ctx.fillStyle = kin.strokeProgress > 0.5 ? '#ff9900' : '#00e5ff';
      ctx.globalAlpha = 0.85;
      ctx.fill();
    } else if (kin.strokeType === 'power') {
      // Bola api & gelombang kejut menyebar ke bawah mendorong piston
      const px = lerp(cylLeft + 20, cylRight - 20, Math.abs(pt.seedX));
      const py = lerp(cylTop + 10, pistonTopY - 10, (Math.abs(pt.seedY) + animPhase) % 1);
      ctx.beginPath();
      ctx.arc(px, py, pt.size * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#ffbe0b' : '#ff3b30';
      ctx.globalAlpha = clamp(kin.explosionIntensity * 0.9, 0.25, 0.95);
      ctx.fill();
    } else {
      // Partikel asap gas buang terdorong keluar melalui katup kanan
      const px = lerp(cylLeft + 30, cylRight + 70, (Math.abs(pt.seedX) + animPhase * 0.6) % 1);
      const py = lerp(pistonTopY - 12, cylTop - 65, animPhase);
      if (px <= cylRight - 10 || py < cylTop + 10) {
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = '#9aa8bc';
        ctx.globalAlpha = 0.55;
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // Gelombang Ledakan Shockwave saat Busi Memercik
  if (kin.explosionIntensity > 0.15) {
    ctx.save();
    const waveR = (1 - kin.explosionIntensity) * 190 + 25;
    ctx.beginPath();
    ctx.arc(centerX, cylTop + 28, waveR, 0, Math.PI);
    ctx.strokeStyle = `rgba(255, 230, 120, ${(kin.explosionIntensity * 0.9).toFixed(2)})`;
    ctx.lineWidth = 8 * kin.explosionIntensity;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // C. DINDING BLOK SILINDER & BAK ENGKOL (CRANKCASE)
  // --------------------------------------------------------------------------
  // Rumah Kruk As (Crankcase Bawah)
  ctx.beginPath();
  ctx.arc(centerX, crankCenterY, crankRadius + 75, -0.22 * Math.PI, 1.22 * Math.PI);
  ctx.fillStyle = '#0a1220';
  ctx.fill();
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#334768';
  ctx.stroke();

  // Sirip Pendingin Blok Silinder (Kiri & Kanan)
  ctx.fillStyle = '#243552';
  for (let fy = cylTop + 25; fy < cylBottom - 25; fy += 38) {
    drawRoundedRect(ctx, cylLeft - 42, fy, 30, 16, 4);
    ctx.fill();
    drawRoundedRect(ctx, cylRight + 12, fy, 30, 16, 4);
    ctx.fill();
  }

  // Dinding Silinder Utama (Baja)
  ctx.fillStyle = '#4a6084';
  drawRoundedRect(ctx, cylLeft - 14, cylTop - 10, 20, cylBottom - cylTop + 25, 6);
  ctx.fill();
  drawRoundedRect(ctx, cylRight - 6, cylTop - 10, 20, cylBottom - cylTop + 25, 6);
  ctx.fill();

  // Kepala Silinder Atas (Cylinder Head)
  ctx.fillStyle = '#2d4060';
  drawRoundedRect(ctx, cylLeft - 45, cylTop - 36, cylWidth + 90, 38, 10);
  ctx.fill();

  // --------------------------------------------------------------------------
  // D. KATUP MASUK (INTAKE VALVE) & KATUP BUANG (EXHAUST VALVE)
  // --------------------------------------------------------------------------
  const intakeX = centerX - 68;
  const exhaustX = centerX + 68;
  const intakeShift = kin.intakeValveOpen * 30;
  const exhaustShift = kin.exhaustValveOpen * 30;

  // Fungsi menggambar 1 unit katup lengkap dengan pegas (valve spring)
  function drawValveUnit(vx, shift, isOpen, activeColor, isHighlighted) {
    ctx.save();
    // Pegas Katup
    ctx.strokeStyle = isOpen ? activeColor : '#7c90b0';
    ctx.lineWidth = 3.5;
    const springTop = cylTop - 115;
    const springBot = cylTop - 35 + shift * 0.5;
    for (let s = 0; s < 5; s++) {
      const sy = lerp(springTop, springBot, s / 5);
      ctx.beginPath();
      ctx.moveTo(vx - 14, sy);
      ctx.lineTo(vx + 14, sy + 6);
      ctx.stroke();
    }

    // Batang & Payung Katup
    ctx.strokeStyle = isHighlighted ? '#00f2fe' : isOpen ? activeColor : '#dce6f7';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(vx, cylTop - 125 + shift);
    ctx.lineTo(vx, cylTop + 4 + shift);
    ctx.stroke();

    // Kepala Payung Katup
    ctx.beginPath();
    ctx.moveTo(vx - 30, cylTop + 4 + shift);
    ctx.lineTo(vx + 30, cylTop + 4 + shift);
    ctx.lineTo(vx + 18, cylTop - 6 + shift);
    ctx.lineTo(vx - 18, cylTop - 6 + shift);
    ctx.closePath();
    ctx.fill();

    // Panah Aliran saat Katup Terbuka
    if (isOpen > 0.2) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 4;
      const arrowY = cylTop + 32 + (timeSec * 60) % 25;
      ctx.beginPath();
      ctx.arc(vx, arrowY, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawValveUnit(
    intakeX,
    intakeShift,
    kin.intakeValveOpen > 0.05,
    '#00f2fe',
    segment.highlight === 'intake_valve' || segment.highlight === 'components'
  );
  drawValveUnit(
    exhaustX,
    exhaustShift,
    kin.exhaustValveOpen > 0.05,
    '#ff6b4a',
    segment.highlight === 'exhaust_valve' || segment.highlight === 'components'
  );

  // --------------------------------------------------------------------------
  // E. BUSI (SPARK PLUG) & BUSUR PETIR PENGAPIAN
  // --------------------------------------------------------------------------
  ctx.save();
  const sparkHighlight = segment.highlight === 'spark_plug' || segment.highlight === 'components';
  // Keramik isolator busi
  ctx.fillStyle = sparkHighlight ? '#fff3b0' : '#f1f5f9';
  drawRoundedRect(ctx, centerX - 15, cylTop - 135, 30, 75, 6);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ulir logam busi
  ctx.fillStyle = '#94a3b8';
  drawRoundedRect(ctx, centerX - 19, cylTop - 60, 38, 52, 4);
  ctx.fill();

  // Elektroda ujung busi di atap ruang bakar
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(centerX, cylTop - 8);
  ctx.lineTo(centerX, cylTop + 10);
  ctx.moveTo(centerX + 10, cylTop - 8);
  ctx.lineTo(centerX + 10, cylTop + 16);
  ctx.lineTo(centerX - 2, cylTop + 16);
  ctx.stroke();

  // Efek Kilatan Petir & Cahaya Busi saat Langkah Usaha
  if (kin.sparkIntensity > 0.05 || segment.highlight === 'spark_plug') {
    const glowAmt = Math.max(kin.sparkIntensity, segment.highlight === 'spark_plug' ? 0.65 : 0);
    const sparkGrad = ctx.createRadialGradient(centerX, cylTop + 16, 2, centerX, cylTop + 16, 75 * glowAmt);
    sparkGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sparkGrad.addColorStop(0.35, 'rgba(255, 230, 0, 0.85)');
    sparkGrad.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = sparkGrad;
    ctx.beginPath();
    ctx.arc(centerX, cylTop + 16, 75 * glowAmt, 0, Math.PI * 2);
    ctx.fill();

    // Cabang-cabang petir elektrik
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    for (let b = 0; b < 4; b++) {
      const angle = (b / 4) * Math.PI + 0.2;
      const len = 35 + ((timeSec * 120 + b * 19) % 30);
      ctx.beginPath();
      ctx.moveTo(centerX, cylTop + 14);
      ctx.lineTo(
        centerX + Math.cos(angle) * (len * 0.5) + Math.sin(timeSec * 80 + b) * 8,
        cylTop + 14 + Math.sin(angle) * (len * 0.5)
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * len,
        cylTop + 14 + Math.sin(angle) * len
      );
      ctx.stroke();
    }
  }
  ctx.restore();

  // --------------------------------------------------------------------------
  // F. STANG PISTON (CONNECTING ROD)
  // --------------------------------------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX - 18, wristPinY);
  ctx.lineTo(centerX + 18, wristPinY);
  ctx.lineTo(pinX + 28, pinY);
  ctx.lineTo(pinX - 28, pinY);
  ctx.closePath();

  const rodGrad = ctx.createLinearGradient(centerX - 25, wristPinY, pinX + 25, pinY);
  rodGrad.addColorStop(0, '#94a3b8');
  rodGrad.addColorStop(0.5, '#e2e8f0');
  rodGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = rodGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Tulang tengah I-Beam pada Stang Piston
  ctx.beginPath();
  ctx.moveTo(centerX, wristPinY + 22);
  ctx.lineTo(pinX, pinY - 22);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#475569';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // --------------------------------------------------------------------------
  // G. PISTON & RING KOMPRESI
  // --------------------------------------------------------------------------
  ctx.save();
  const pistonX = centerX - pistonWidth / 2;
  const pisGrad = ctx.createLinearGradient(pistonX, pistonTopY, pistonX + pistonWidth, pistonTopY);
  pisGrad.addColorStop(0, '#64748b');
  pisGrad.addColorStop(0.25, '#cbd5e1');
  pisGrad.addColorStop(0.5, '#f8fafc');
  pisGrad.addColorStop(0.75, '#cbd5e1');
  pisGrad.addColorStop(1, '#475569');

  ctx.fillStyle = pisGrad;
  drawRoundedRect(ctx, pistonX, pistonTopY, pistonWidth, pistonHeight, 12);
  ctx.fill();
  ctx.lineWidth = segment.highlight === 'piston' ? 5 : 3;
  ctx.strokeStyle = segment.highlight === 'piston' ? '#00f2fe' : '#1e293b';
  ctx.stroke();

  // 3 Ring Piston (Ring Kompresi 1, Ring Kompresi 2, Ring Oli)
  const ringColors = ['#fbbf24', '#38bdf8', '#f97316'];
  for (let r = 0; r < 3; r++) {
    const ry = pistonTopY + 16 + r * 12;
    ctx.fillStyle = ringColors[r];
    ctx.fillRect(pistonX - 3, ry, pistonWidth + 6, 5);
  }

  // Pena Piston (Wrist Pin / Gudgeon Pin)
  ctx.beginPath();
  ctx.arc(centerX, wristPinY, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#334155';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, wristPinY, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.restore();

  // --------------------------------------------------------------------------
  // H. KRUK AS (CRANKSHAFT) & BANDUL PENYEIMBANG (COUNTERWEIGHT)
  // --------------------------------------------------------------------------
  ctx.save();
  ctx.translate(centerX, crankCenterY);
  ctx.rotate(theta);

  // Bandul Kruk As (Counterweight Web)
  ctx.beginPath();
  ctx.arc(0, 0, 56, -0.25 * Math.PI, 1.25 * Math.PI);
  ctx.lineTo(-42, -crankRadius - 18);
  ctx.arc(0, -crankRadius, 42, Math.PI, 0, false);
  ctx.closePath();

  const crankGrad = ctx.createRadialGradient(0, -30, 10, 0, 0, 140);
  crankGrad.addColorStop(0, '#e2e8f0');
  crankGrad.addColorStop(0.6, '#94a3b8');
  crankGrad.addColorStop(1, '#334155');
  ctx.fillStyle = crankGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();

  // Poros Utama Kruk As (Main Journal)
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  // Pena Engkol (Crankpin Journal)
  ctx.beginPath();
  ctx.arc(0, -crankRadius, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();
  ctx.restore();

  // Panah Indikator Arah Putaran Kruk As
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 242, 254, 0.55)';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(centerX, crankCenterY, crankRadius + 46, -0.75 * Math.PI, -0.25 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // --------------------------------------------------------------------------
  // I. GARIS CALLOUT PENUNJUK KOMPONEN AKTIF (DINAMIS & JELAS)
  // --------------------------------------------------------------------------
  const calloutList = [
    {
      id: 'spark_plug',
      label: 'BUSI (SPARK PLUG)',
      desc: 'Pemantik Bunga Api',
      targetX: centerX,
      targetY: cylTop - 95,
      boxX: 55,
      boxY: 420,
      color: '#fbbf24'
    },
    {
      id: 'intake_valve',
      label: 'KATUP MASUK',
      desc: 'Udara + BBM Masuk',
      targetX: intakeX,
      targetY: cylTop - 10,
      boxX: 55,
      boxY: 575,
      color: '#00f2fe'
    },
    {
      id: 'exhaust_valve',
      label: 'KATUP BUANG',
      desc: 'Jalur Gas Sisa Keluar',
      targetX: exhaustX,
      targetY: cylTop - 10,
      boxX: 740,
      boxY: 575,
      color: '#ff6b4a'
    },
    {
      id: 'piston',
      label: 'PISTON & RING',
      desc: 'Kompresi & Terima Ledakan',
      targetX: centerX - pistonWidth / 2 + 10,
      targetY: pistonTopY + 45,
      boxX: 55,
      boxY: 790,
      color: '#38bdf8'
    },
    {
      id: 'crankshaft',
      label: 'STANG & KRUK AS',
      desc: 'Ubah Gerak Turun Jadi Putaran',
      targetX: pinX,
      targetY: pinY,
      boxX: 740,
      boxY: 1090,
      color: '#a855f7'
    }
  ];

  calloutList.forEach((item, idx) => {
    // Tampilkan semua callout saat segmen "components" atau fokus pada komponen langkah terkait
    const isFocused =
      segment.highlight === 'components' ||
      segment.highlight === 'all' ||
      segment.highlight === item.id ||
      (segment.phase === 'exhaust' && item.id === 'crankshaft');

    const alpha = isFocused ? 1.0 : 0.28;
    const pulse = isFocused ? Math.sin(timeSec * 6 + idx) * 3 : 0;

    ctx.save();
    ctx.globalAlpha = alpha;

    const boxW = 285;
    const boxH = 86;
    const anchorX = item.boxX < centerX ? item.boxX + boxW : item.boxX;
    const anchorY = item.boxY + boxH / 2;

    // Garis penghubung ke komponen mesin
    ctx.strokeStyle = item.color;
    ctx.lineWidth = isFocused ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo((anchorX + item.targetX) / 2, anchorY);
    ctx.lineTo(item.targetX, item.targetY);
    ctx.stroke();

    // Titik target pada komponen
    ctx.beginPath();
    ctx.arc(item.targetX, item.targetY, 7 + (isFocused ? 2 : 0), 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    // Kotak Label Callout
    ctx.fillStyle = 'rgba(9, 18, 36, 0.92)';
    drawRoundedRect(ctx, item.boxX, item.boxY + pulse, boxW, boxH, 14);
    ctx.fill();
    ctx.lineWidth = isFocused ? 3 : 1.5;
    ctx.strokeStyle = item.color;
    ctx.stroke();

    // Teks Callout Singkat (Bukan Narasi Penuh)
    ctx.fillStyle = item.color;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, item.boxX + 18, item.boxY + 34 + pulse);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '19px sans-serif';
    ctx.fillText(item.desc, item.boxX + 18, item.boxY + 64 + pulse);

    ctx.restore();
  });

  ctx.restore();
}

// ============================================================================
// 8. HUD ATAS, INDIKATOR 4 LANGKAH, & KARTU KOMPONEN BAWAH
// ============================================================================
function drawTopHeaderAndGauges(ctx, timeSec, segment, kin) {
  const segElapsed = timeSec - segment.start;
  const popScale = easeOutBack(clamp(segElapsed / 0.45, 0, 1));

  // 1. Badge Fase di Atas
  ctx.save();
  ctx.translate(WIDTH / 2, 115);
  ctx.scale(popScale, popScale);

  const badgeW = 390;
  const badgeH = 54;
  ctx.fillStyle = 'rgba(0, 242, 254, 0.16)';
  drawRoundedRect(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, 27);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00f2fe';
  ctx.stroke();

  ctx.fillStyle = '#00f2fe';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(segment.badge, 0, 0);
  ctx.restore();

  // 2. Judul Utama & Subjudul Ringkas (Tidak menumpuk teks narasi di layar)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText(segment.title, WIDTH / 2, 215);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '28px sans-serif';
  ctx.fillText(segment.subtitle, WIDTH / 2, 268);
  ctx.restore();

  // 3. Bar Indikator 4-Tak Interaktif (1. HISAP | 2. KOMPRESI | 3. USAHA | 4. BUANG)
  const steps = [
    { key: 'intake', label: '1. HISAP', color: '#00f2fe' },
    { key: 'compression', label: '2. KOMPRESI', color: '#fbbf24' },
    { key: 'power', label: '3. USAHA', color: '#ff3b30' },
    { key: 'exhaust', label: '4. BUANG', color: '#a855f7' }
  ];

  const pillW = 225;
  const pillH = 58;
  const gap = 18;
  const totalRowW = steps.length * pillW + (steps.length - 1) * gap;
  const startX = (WIDTH - totalRowW) / 2;
  const pillY = 310;

  steps.forEach((st, i) => {
    const px = startX + i * (pillW + gap);
    const isActive = kin.strokeType === st.key;

    ctx.save();
    ctx.fillStyle = isActive ? st.color : 'rgba(15, 28, 52, 0.85)';
    drawRoundedRect(ctx, px, pillY, pillW, pillH, 14);
    ctx.fill();

    ctx.lineWidth = isActive ? 3.5 : 2;
    ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(148, 163, 184, 0.35)';
    ctx.stroke();

    ctx.fillStyle = isActive ? '#060b16' : '#cbd5e1';
    ctx.font = 'bold 23px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.label, px + pillW / 2, pillY + pillH / 2);
    ctx.restore();
  });
}

function drawBottomDashboard(ctx, timeSec, segment, kin) {
  // Panel Kartu Fokus Komponen di Bawah Mesin
  const cardX = 65;
  const cardY = 1435;
  const cardW = WIDTH - 130;
  const cardH = 310;

  let accent = '#00f2fe';
  if (kin.strokeType === 'compression') accent = '#fbbf24';
  if (kin.strokeType === 'power') accent = '#ff3b30';
  if (kin.strokeType === 'exhaust') accent = '#a855f7';

  ctx.save();
  ctx.fillStyle = 'rgba(8, 17, 34, 0.92)';
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // Ikon Komponen Dinamis di Sisi Kiri Kartu
  drawComponentIcon(ctx, segment.highlight, cardX + 105, cardY + 115, 62, accent, timeSec);

  // Informasi Teknis Singkat & Padat (Visual Poin, Bukan Teks Narasi Panjang)
  const infoMap = {
    intro: {
      head: 'PRINSIP KERJA KONVERSI ENERGI',
      line1: '• Energi Kimia Bensin -> Energi Panas -> Gerak Mekanik',
      line2: '• Menggunakan Siklus 4-Langkah (Four-Stroke Cycle)'
    },
    components: {
      head: 'SINERGI KOMPONEN MESIN',
      line1: '• Piston & Stang menahan tekanan ledakan tinggi',
      line2: '• Kruk As mengubah gerak naik-turun menjadi torsi putar'
    },
    intake: {
      head: 'FASE 1: INTAKE (HISAP)',
      line1: '• Katup Masuk Terbuka | Katup Buang Tertutup',
      line2: '• Piston bergerak turun (TMA -> TMB) menghisap BBM + Udara'
    },
    compression: {
      head: 'FASE 2: COMPRESSION (KOMPRESI)',
      line1: '• Kedua Katup Menutup Rapat (Ruang Bakar Kedap)',
      line2: '• Piston naik (TMB -> TMA) memampatkan gas agar mudah meledak'
    },
    power: {
      head: 'FASE 3: POWER (USAHA / PEMBAKARAN)',
      line1: '• Busi memercikkan api tepat di Titik Mati Atas (TMA)',
      line2: '• Ledakan mendorong Piston turun keras memutar Kruk As'
    },
    exhaust: {
      head: 'FASE 4: EXHAUST (BUANG)',
      line1: '• Katup Buang Terbuka | Piston naik mendorong sisa gas',
      line2: '• Siklus berulang ribuan RPM menghasilkan tenaga ke roda'
    }
  };

  const activeInfo = infoMap[segment.phase] || infoMap.intro;

  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = 'bold 31px sans-serif';
  ctx.fillText(activeInfo.head, cardX + 195, cardY + 78);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '25px sans-serif';
  ctx.fillText(activeInfo.line1, cardX + 195, cardY + 128);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '25px sans-serif';
  ctx.fillText(activeInfo.line2, cardX + 195, cardY + 172);

  // Bar Metrik Real-time (RPM, Suhu Ruang Bakar, Sudut Kruk As)
  const metricY = cardY + 215;
  const metrics = [
    { label: 'PUTARAN MESIN', val: `${kin.rpmValue} RPM` },
    {
      label: 'SUHU RUANG BAKAR',
      val:
        kin.strokeType === 'power'
          ? '2.100 °C'
          : kin.strokeType === 'compression'
          ? '480 °C'
          : kin.strokeType === 'exhaust'
          ? '850 °C'
          : '95 °C'
    },
    { label: 'SUDUT KRUK AS', val: `${Math.round(kin.crankAngle)}° / 720°` }
  ];

  const mBoxW = 280;
  metrics.forEach((m, idx) => {
    const mx = cardX + 35 + idx * (mBoxW + 22);
    ctx.fillStyle = 'rgba(20, 36, 66, 0.85)';
    drawRoundedRect(ctx, mx, metricY, mBoxW, 72, 12);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(m.label, mx + 18, metricY + 27);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px sans-serif';
    ctx.fillText(m.val, mx + 18, metricY + 56);
  });

  ctx.restore();

  // Progress Bar Durasi Video 40 Detik di Bagian Paling Bawah
  const barX = 65;
  const barY = 1805;
  const barW = WIDTH - 130;
  const barH = 18;
  const progress = clamp(timeSec / DURATION, 0, 1);

  ctx.save();
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  drawRoundedRect(ctx, barX, barY, barW, barH, 9);
  ctx.fill();

  const progGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  progGrad.addColorStop(0, '#00f2fe');
  progGrad.addColorStop(0.5, '#fbbf24');
  progGrad.addColorStop(1, '#ff3b30');
  ctx.fillStyle = progGrad;
  drawRoundedRect(ctx, barX, barY, Math.max(18, barW * progress), barH, 9);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`TIMELINE EDUKASI • ${timeSec.toFixed(1)}s / ${DURATION}.0s`, barX + barW, barY + 50);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f2fe';
  ctx.fillText('ANIMASI MEKANIK 4-TAK', barX, barY + 50);
  ctx.restore();
}

// ============================================================================
// 9. PIPELINE UTAMA RENDER FRAME KE FFMPEG -> ./output.mp4
// ============================================================================
async function main() {
  const tempDir = path.join(__dirname, '.tmp_engine_render');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 1. Buat & sinkronkan audio narasi 40 detik penuh
    const masterAudioPath = await buildMasterAudio(tempDir);

    // 2. Siapkan Canvas @napi-rs/canvas
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    console.log(`[RENDER] Memulai proses rendering ${TOTAL_FRAMES} frame (${WIDTH}x${HEIGHT} @ ${FPS}fps)...`);

    // 3. Jalankan proses FFmpeg untuk menerima raw RGBA buffer dari canvas.data()
    const outputMp4 = path.resolve(__dirname, 'output.mp4');
    const ffmpegProc = spawn('ffmpeg', [
      '-y',
      '-f', 'rawvideo',
      '-vcodec', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${WIDTH}x${HEIGHT}`,
      '-r', String(FPS),
      '-i', '-',
      '-i', masterAudioPath,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outputMp4
    ]);

    let ffmpegErrorLog = '';
    ffmpegProc.stderr.on('data', (chunk) => {
      ffmpegErrorLog += chunk.toString();
    });

    // 4. Loop setiap frame (0 s.d. 1199)
    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      const timeSec = frame / FPS;

      // Cari segmen aktif saat ini
      const activeSegment =
        SEGMENTS.find((s) => timeSec >= s.start && timeSec < s.end) ||
        SEGMENTS[SEGMENTS.length - 1];

      // Hitung kinematika mesin & VFX pada frame ini
      const kin = getEngineKinematics(timeSec, activeSegment);

      // Gambar seluruh lapisan visual
      drawBackgroundGridAndVFX(ctx, timeSec, kin);
      drawTopHeaderAndGauges(ctx, timeSec, activeSegment, kin);
      drawEngineCutaway(ctx, timeSec, activeSegment, kin);
      drawBottomDashboard(ctx, timeSec, activeSegment, kin);

      // Ambil raw buffer RGBA langsung dari @napi-rs/canvas
      const rawBuffer = canvas.data();

      const canContinue = ffmpegProc.stdin.write(rawBuffer);
      if (!canContinue) {
        await new Promise((resolve) => ffmpegProc.stdin.once('drain', resolve));
      }

      if ((frame + 1) % (FPS * 5) === 0 || frame === TOTAL_FRAMES - 1) {
        const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
        console.log(`[RENDER] Progress: ${pct}% (${frame + 1}/${TOTAL_FRAMES} frames)`);
      }
    }

    ffmpegProc.stdin.end();

    await new Promise((resolve, reject) => {
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg keluar dengan kode ${code}: ${ffmpegErrorLog}`));
      });
      ffmpegProc.on('error', reject);
    });

    console.log(`[SUKSES] Video selesai dirender ke: ${outputMp4}`);
  } finally {
    // Bersihkan direktori sementara
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Abaikan jika gagal hapus tmp
    }
  }
}

main().catch((err) => {
  console.error('[ERROR] Gagal menjalankan render.js:', err);
  process.exit(1);
});
```
