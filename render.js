```javascript
const VOICE_MODEL = "id_brian_narrator";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");
const ffmpegPath = require("ffmpeg-static");

// Konfigurasi Video 15 Detik (Full HD 1080p @ 30 FPS)
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 15;
const TOTAL_FRAMES = DURATION * FPS;
const OUTPUT_MP4 = "./cara_kerja_mesin_mobil.mp4";

// Definisi 4 Adegan Siklus Mesin 4-Tak (15 Detik)
const SCENES = [
  {
    id: 1,
    tag: "LANGKAH 01 // INTAKE STROKE",
    title: "1. LANGKAH HISAP",
    desc: "Katup hisap membuka, piston bergerak turun dari TMA ke TMB menghisap campuran udara & bahan bakar.",
    voiceText:
      "Cara kerja mesin mobil empat tak. Pertama, langkah hisap: katup hisap terbuka dan piston turun menghisap campuran udara serta bahan bakar.",
    fileMp3: "./vo_langkah_1.mp3",
    startSec: 0.0,
    endSec: 3.75,
    delayMs: 100,
    color: "#00E5FF",
    rgb: [0, 229, 255],
    rpm: 2400,
    bar: 1.0,
    temp: 135,
  },
  {
    id: 2,
    tag: "LANGKAH 02 // COMPRESSION STROKE",
    title: "2. LANGKAH KOMPRESI",
    desc: "Kedua katup menutup rapat, piston bergerak naik dari TMB ke TMA memampatkan gas hingga suhu & tekanan tinggi.",
    voiceText:
      "Kedua, langkah kompresi: kedua katup menutup rapat, lalu piston naik memampatkan campuran hingga bertekanan tinggi.",
    fileMp3: "./vo_langkah_2.mp3",
    startSec: 3.75,
    endSec: 7.5,
    delayMs: 3850,
    color: "#FFB300",
    rgb: [255, 179, 0],
    rpm: 3600,
    bar: 16.5,
    temp: 520,
  },
  {
    id: 3,
    tag: "LANGKAH 03 // POWER / COMBUSTION STROKE",
    title: "3. LANGKAH USAHA",
    desc: "Busi memercikkan bunga api listrik, ledakan pembakaran mendorong piston turun dengan gaya mekanis besar.",
    voiceText:
      "Ketiga, langkah usaha: busi memercikkan api, memicu ledakan yang mendorong piston turun untuk menghasilkan tenaga putar.",
    fileMp3: "./vo_langkah_3.mp3",
    startSec: 7.5,
    endSec: 11.25,
    delayMs: 7600,
    color: "#FF3D00",
    rgb: [255, 61, 0],
    rpm: 6200,
    bar: 54.0,
    temp: 2250,
  },
  {
    id: 4,
    tag: "LANGKAH 04 // EXHAUST STROKE",
    title: "4. LANGKAH BUANG",
    desc: "Katup buang membuka, piston bergerak naik mendorong gas sisa pembakaran keluar menuju knalpot.",
    voiceText:
      "Keempat, langkah buang: katup buang terbuka, piston naik mendorong sisa gas keluar, dan siklus terus berulang menggerakkan mobil.",
    fileMp3: "./vo_langkah_4.mp3",
    startSec: 11.25,
    endSec: 15.0,
    delayMs: 11350,
    color: "#B0BEC5",
    rgb: [176, 190, 197],
    rpm: 4500,
    bar: 2.2,
    temp: 780,
  },
];

// 1. Generate Voiceover Studio untuk setiap langkah
for (const s of SCENES) {
  global.generateStudioVoice(s.voiceText, s.fileMp3, VOICE_MODEL);
}

// Helper Matematika & Easing
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const springOut = (t) => {
  const x = clamp(t, 0, 1);
  return 1 - Math.cos(x * Math.PI * 2.5) * Math.exp(-x * 6);
};
const rgba = (r, g, b, a = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(a, 0, 1)})`;

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// Partikel Dinamis di Ruang Bakar
const PARTICLES = Array.from({ length: 110 }, (_, i) => ({
  u: ((i * 67 + 13) % 100) / 100,
  v: ((i * 37 + 29) % 100) / 100,
  size: 2.2 + (i % 4) * 1.3,
  speed: 1.1 + (i % 5) * 0.4,
  phase: i * 0.51,
}));

// Menggambar Pegas Heliks (Valve Spring)
function drawValveSpring(ctx, x, topY, bottomY, width, coils) {
  ctx.beginPath();
  const h = bottomY - topY;
  const step = h / coils;
  ctx.moveTo(x - width / 2, topY);
  for (let i = 0; i < coils; i++) {
    const y1 = topY + i * step + step * 0.25;
    const y2 = topY + i * step + step * 0.75;
    const y3 = topY + (i + 1) * step;
    ctx.lineTo(x + width / 2, y1);
    ctx.lineTo(x - width / 2, y2);
    ctx.lineTo(x, y3);
  }
  ctx.strokeStyle = "#90A4AE";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// Menggambar Roda Gigi / Cam Sprocket
function drawGear(ctx, cx, cy, radius, teeth, angle, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? radius + 5 : radius - 3;
    const a = (i * Math.PI) / teeth;
    const gx = Math.cos(a) * r;
    const gy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  }
  ctx.closePath();
  ctx.fillStyle = "#1C2836";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

// Hitung Kinematika Siklus 4-Tak pada Waktu t (0..15 detik)
function getKinematics(t) {
  const sceneIdx = clamp(Math.floor(t / 3.75), 0, 3);
  const scene = SCENES[sceneIdx];
  const localT = clamp((t - scene.startSec) / (scene.endSec - scene.startSec), 0, 1);
  const easedT = easeInOutCubic(localT);

  let crankAngle = 0;
  let intakeLift = 0;
  let exhaustLift = 0;
  let sparkPower = 0;
  let explosionWave = 0;

  if (scene.id === 1) {
    // Hisap: 0 -> PI (TMA ke TMB)
    crankAngle = easedT * Math.PI;
    intakeLift = Math.sin(localT * Math.PI);
  } else if (scene.id === 2) {
    // Kompresi: PI -> 2*PI (TMB ke TMA)
    crankAngle = Math.PI + easedT * Math.PI;
  } else if (scene.id === 3) {
    // Usaha: 2*PI -> 3*PI (Akselerasi ledakan cepat)
    const fastT = Math.pow(localT, 0.72);
    crankAngle = 2 * Math.PI + fastT * Math.PI;
    if (localT < 0.24) {
      sparkPower = Math.sin((localT / 0.24) * Math.PI);
    }
    explosionWave = Math.pow(clamp(1 - localT * 0.85, 0, 1), 1.4);
  } else {
    // Buang: 3*PI -> 4*PI (TMB ke TMA)
    crankAngle = 3 * Math.PI + easedT * Math.PI;
    exhaustLift = Math.sin(localT * Math.PI);
  }

  return {
    scene,
    sceneIdx,
    localT,
    easedT,
    crankAngle,
    intakeLift,
    exhaustLift,
    sparkPower,
    explosionWave,
  };
}

// Render Frame Lengkap
function renderFrame(ctx, t) {
  const kin = getKinematics(t);
  const {
    scene,
    localT,
    crankAngle,
    intakeLift,
    exhaustLift,
    sparkPower,
    explosionWave,
  } = kin;

  // 1. BACKGROUND & BLUEPRINT GRID
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#060A11");
  bg.addColorStop(0.5, "#0B1320");
  bg.addColorStop(1, "#05080E");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Ambient Radial Glow mengikuti langkah aktif
  const glow = ctx.createRadialGradient(510, 520, 30, 510, 520, 540);
  glow.addColorStop(0, rgba(scene.rgb[0], scene.rgb[1], scene.rgb[2], 0.16));
  glow.addColorStop(0.6, rgba(scene.rgb[0], scene.rgb[1], scene.rgb[2], 0.04));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Grid Teknis Bergerak
  ctx.strokeStyle = "rgba(100, 150, 210, 0.055)";
  ctx.lineWidth = 1;
  const gStep = 48;
  const gShift = (t * 14) % gStep;
  ctx.beginPath();
  for (let x = gShift; x < WIDTH; x += gStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = gShift; y < HEIGHT; y += gStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();

  // 2. PANEL KIRI: SIMULASI MEKANIS SILINDER 4-TAK
  roundRect(ctx, 64, 114, 890, 828, 22);
  ctx.fillStyle = "rgba(12, 20, 33, 0.86)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(scene.rgb[0], scene.rgb[1], scene.rgb[2], 0.5);
  ctx.stroke();

  // Koordinat Geometri Mesin Slider-Crank
  const cx = 510;
  const crankY = 748;
  const R = 86; // Radius engkol
  const L = 232; // Panjang connecting rod
  const boreW = 228;
  const pistonW = 216;
  const pistonH = 94;
  const headY = 252;

  // Sudut engkol: 0 rad berada di TMA (-PI/2)
  const theta = crankAngle - Math.PI / 2;
  const pinX = cx + R * Math.cos(theta);
  const pinY = crankY + R * Math.sin(theta);
  const wristY = pinY - Math.sqrt(Math.max(100, L * L - Math.pow(pinX - cx, 2)));
  const pistonTopY = wristY - 36;

  // Saluran Manifold Hisap (Kiri) & Buang (Kanan)
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#455A64";

  // Intake Port
  ctx.beginPath();
  ctx.moveTo(135, 216);
  ctx.lineTo(cx - 115, 216);
  ctx.quadraticCurveTo(cx - 60, 216, cx - 56, headY + 4);
  ctx.lineTo(cx - 18, headY + 4);
  ctx.quadraticCurveTo(cx - 24, 174, cx - 115, 174);
  ctx.lineTo(135, 174);
  ctx.closePath();
  ctx.fillStyle =
    scene.id === 1 ? "rgba(0, 229, 255, 0.28)" : "rgba(26, 39, 58, 0.8)";
  ctx.fill();
  ctx.stroke();

  // Exhaust Port
  ctx.beginPath();
  ctx.moveTo(885, 216);
  ctx.lineTo(cx + 115, 216);
  ctx.quadraticCurveTo(cx + 60, 216, cx + 56, headY + 4);
  ctx.lineTo(cx + 18, headY + 4);
  ctx.quadraticCurveTo(cx + 24, 174, cx + 115, 174);
  ctx.lineTo(885, 174);
  ctx.closePath();
  ctx.fillStyle =
    scene.id === 4 ? "rgba(176, 190, 197, 0.28)" : "rgba(26, 39, 58, 0.8)";
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#00E5FF";
  ctx.fillText("INTAKE PORT (UDARA + BBM)", 138, 162);
  ctx.fillStyle = "#CFD8DC";
  ctx.fillText("EXHAUST PORT (GAS BUANG)", 675, 162);

  // Ruang Bakar (Combustion Chamber)
  const chamberLeft = cx - boreW / 2;
  const chamberH = Math.max(22, pistonTopY - headY);
  const cGrad = ctx.createLinearGradient(cx, headY, cx, pistonTopY);

  if (scene.id === 1) {
    cGrad.addColorStop(0, "rgba(0, 229, 255, 0.45)");
    cGrad.addColorStop(1, "rgba(0, 130, 255, 0.14)");
  } else if (scene.id === 2) {
    const r = lerp(0, 255, localT);
    const g = lerp(220, 150, localT);
    const b = lerp(255, 15, localT);
    const a = lerp(0.3, 0.82, localT);
    cGrad.addColorStop(0, rgba(r, g, b, a));
    cGrad.addColorStop(1, rgba(r, g * 0.7, b * 0.4, a * 0.65));
  } else if (scene.id === 3) {
    const a = clamp(0.35 + explosionWave * 0.65, 0.25, 0.96);
    cGrad.addColorStop(0, rgba(255, 245, 190, a));
    cGrad.addColorStop(0.45, rgba(255, 90, 0, a * 0.9));
    cGrad.addColorStop(1, rgba(185, 20, 0, a * 0.55));
  } else {
    const a = lerp(0.58, 0.18, localT);
    cGrad.addColorStop(0, rgba(165, 180, 195, a));
    cGrad.addColorStop(1, rgba(85, 95, 110, a * 0.6));
  }

  ctx.fillStyle = cGrad;
  ctx.fillRect(chamberLeft, headY, boreW, chamberH);

  // Partikel Gas di Ruang Bakar
  for (let i = 0; i < PARTICLES.length; i++) {
    const p = PARTICLES[i];
    const px =
      chamberLeft +
      12 +
      ((p.u + Math.sin(t * p.speed + p.phase) * 0.09 + 1) % 1) * (boreW - 24);
    const py =
      headY +
      10 +
      ((p.v + Math.cos(t * p.speed + p.phase) * 0.07 + 1) % 1) *
        Math.max(10, chamberH - 18);

    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    if (scene.id === 1) ctx.fillStyle = "rgba(130, 245, 255, 0.88)";
    else if (scene.id === 2)
      ctx.fillStyle = rgba(
        lerp(80, 255, localT),
        lerp(230, 180, localT),
        lerp(255, 30, localT),
        0.9
      );
    else if (scene.id === 3)
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(255, 235, 120, 0.94)" : "rgba(255, 75, 15, 0.88)";
    else ctx.fillStyle = "rgba(190, 202, 212, 0.75)";
    ctx.fill();
  }

  // Aliran Partikel Masuk (Langkah 1) & Keluar (Langkah 4)
  if (scene.id === 1) {
    for (let k = 0; k < 20; k++) {
      const f = (t * 2.5 + k / 20) % 1;
      const fx = lerp(145, cx - 38, f);
      const fy =
        195 +
        Math.sin(f * Math.PI * 2 + k) * 8 +
        (f > 0.74 ? (f - 0.74) * 230 : 0);
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00E5FF";
      ctx.fill();
    }
  } else if (scene.id === 4) {
    for (let k = 0; k < 20; k++) {
      const f = (t * 2.5 + k / 20) % 1;
      const fx = lerp(cx + 38, 875, f);
      const fy =
        195 +
        Math.cos(f * Math.PI * 2 + k) * 8 +
        (f < 0.26 ? (0.26 - f) * 230 : 0);
      ctx.beginPath();
      ctx.arc(fx, fy, 4.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(195, 208, 220, 0.82)";
      ctx.fill();
    }
  }

  // Gelombang Kejut & Percikan Api Busi pada Langkah Usaha
  if (scene.id === 3 && (sparkPower > 0.01 || explosionWave > 0.2)) {
    const rad = 26 + (1 - explosionWave) * 150;
    const fGrad = ctx.createRadialGradient(
      cx,
      headY + 18,
      4,
      cx,
      headY + 32,
      rad
    );
    fGrad.addColorStop(0, "rgba(255,255,255,0.98)");
    fGrad.addColorStop(0.35, "rgba(255,225,50,0.92)");
    fGrad.addColorStop(0.7, "rgba(255,60,0,0.65)");
    fGrad.addColorStop(1, "rgba(255,0,0,0)");

    ctx.save();
    ctx.beginPath();
    ctx.rect(chamberLeft, headY, boreW, chamberH);
    ctx.clip();
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(cx, headY + 22, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (sparkPower > 0.05) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx, headY + 4);
      ctx.lineTo(cx - 13, headY + 18);
      ctx.lineTo(cx + 11, headY + 29);
      ctx.lineTo(cx - 5, headY + 43);
      ctx.stroke();
    }
  }

  // Dinding Silinder & Sirip Pendingin (Water Jacket)
  ctx.fillStyle = "#243447";
  ctx.fillRect(chamberLeft - 28, headY - 6, 28, 388);
  ctx.fillRect(chamberLeft + boreW, headY - 6, 28, 388);
  for (let wy = headY + 26; wy < headY + 330; wy += 64) {
    roundRect(ctx, chamberLeft - 21, wy, 14, 36, 4);
    ctx.fillStyle = "#00B8D4";
    ctx.fill();
    roundRect(ctx, chamberLeft + boreW + 7, wy, 14, 36, 4);
    ctx.fill();
  }

  ctx.strokeStyle = "#90A4AE";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(chamberLeft, headY);
  ctx.lineTo(chamberLeft, headY + 382);
  ctx.moveTo(chamberLeft + boreW, headY);
  ctx.lineTo(chamberLeft + boreW, headY + 382);
  ctx.stroke();

  // Garis Penanda TMA (TDC) & TMB (BDC)
  const tdcY = crankY - L - R - 36;
  const bdcY = crankY - L + R - 36;
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
  ctx.beginPath();
  ctx.moveTo(chamberLeft - 92, tdcY);
  ctx.lineTo(chamberLeft - 32, tdcY);
  ctx.moveTo(chamberLeft - 92, bdcY);
  ctx.lineTo(chamberLeft - 32, bdcY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#80DEEA";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("TMA (TDC)", chamberLeft - 92, tdcY - 6);
  ctx.fillText("TMB (BDC)", chamberLeft - 92, bdcY - 6);

  // Katup Hisap & Buang beserta Pegas Heliks (Valve Springs)
  const ivX = cx - 44;
  const ivY = headY + intakeLift * 24;
  const evX = cx + 44;
  const evY = headY + exhaustLift * 24;

  drawValveSpring(ctx, ivX, headY - 64, ivY - 12, 22, 5);
  drawValveSpring(ctx, evX, headY - 64, evY - 12, 22, 5);

  // Batang & Payung Katup Hisap
  ctx.strokeStyle = "#ECEFF1";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(ivX, ivY - 70);
  ctx.lineTo(ivX, ivY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ivX - 24, ivY + 4);
  ctx.lineTo(ivX + 24, ivY + 4);
  ctx.lineTo(ivX + 14, ivY - 4);
  ctx.lineTo(ivX - 14, ivY - 4);
  ctx.closePath();
  ctx.fillStyle = intakeLift > 0.1 ? "#00E5FF" : "#B0BEC5";
  ctx.fill();

  // Batang & Payung Katup Buang
  ctx.beginPath();
  ctx.moveTo(evX, evY - 70);
  ctx.lineTo(evX, evY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(evX - 24, evY + 4);
  ctx.lineTo(evX + 24, evY + 4);
  ctx.lineTo(evX + 14, evY - 4);
  ctx.lineTo(evX - 14, evY - 4);
  ctx.closePath();
  ctx.fillStyle = exhaustLift > 0.1 ? "#FF7043" : "#B0BEC5";
  ctx.fill();

  // Roda Gigi Camshaft & Noken As (DOHC)
  drawGear(ctx, ivX, headY - 94, 22, 12, crankAngle * 0.5, "#00E5FF");
  drawGear(
    ctx,
    evX,
    headY - 94,
    22,
    12,
    crankAngle * 0.5 + Math.PI * 0.5,
    "#FF7043"
  );

  // Busi (Spark Plug) di Tengah Atas
  roundRect(ctx, cx - 9, headY - 68, 18, 42, 4);
  ctx.fillStyle = "#ECEFF1";
  ctx.fill();
  ctx.fillStyle = "#37474F";
  ctx.fillRect(cx - 12, headY - 28, 24, 20);
  ctx.fillStyle = sparkPower > 0.05 ? "#FFFF00" : "#90A4AE";
  ctx.fillRect(cx - 3, headY - 8, 6, 12);

  // Rumah Engkol (Crankcase) & Roda Gila
  drawGear(ctx, cx, crankY, R + 48, 28, crankAngle, "#37474F");
  ctx.beginPath();
  ctx.arc(cx, crankY, R + 42, 0, Math.PI * 2);
  ctx.fillStyle = "#0E1724";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#32465E";
  ctx.stroke();

  // Bandul Counterweight Poros Engkol
  ctx.save();
  ctx.translate(cx, crankY);
  ctx.rotate(theta);
  ctx.beginPath();
  ctx.arc(0, 0, R + 22, Math.PI * 0.55, Math.PI * 1.45);
  ctx.lineTo(R + 14, 20);
  ctx.lineTo(R + 14, -20);
  ctx.closePath();
  ctx.fillStyle = "#546E7A";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#CFD8DC";
  ctx.stroke();
  ctx.restore();

  // Batang Penggerak (Connecting Rod)
  ctx.beginPath();
  ctx.moveTo(cx - 13, wristY);
  ctx.lineTo(cx + 13, wristY);
  ctx.lineTo(pinX + 18, pinY);
  ctx.lineTo(pinX - 18, pinY);
  ctx.closePath();
  const rodGrad = ctx.createLinearGradient(cx, wristY, pinX, pinY);
  rodGrad.addColorStop(0, "#B0BEC5");
  rodGrad.addColorStop(0.5, "#607D8B");
  rodGrad.addColorStop(1, "#455A64");
  ctx.fillStyle = rodGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ECEFF1";
  ctx.stroke();

  // Kepala Piston & 3 Ring Kompresi
  const px0 = cx - pistonW / 2;
  const pGrad = ctx.createLinearGradient(px0, pistonTopY, px0 + pistonW, pistonTopY);
  pGrad.addColorStop(0, "#78909C");
  pGrad.addColorStop(0.25, "#CFD8DC");
  pGrad.addColorStop(0.5, "#FFFFFF");
  pGrad.addColorStop(0.75, "#B0BEC5");
  pGrad.addColorStop(1, "#607D8B");
  roundRect(ctx, px0, pistonTopY, pistonW, pistonH, 10);
  ctx.fillStyle = pGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#37474F";
  ctx.stroke();

  ctx.fillStyle = "#263238";
  for (let r = 0; r < 3; r++) {
    ctx.fillRect(px0 - 2, pistonTopY + 12 + r * 9, pistonW + 4, 4);
  }

  // Wrist Pin & Crankpin Journal
  ctx.beginPath();
  ctx.arc(cx, wristY, 17, 0, Math.PI * 2);
  ctx.fillStyle = "#1C2836";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#00E5FF";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, crankY, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#1C2836";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#90A4AE";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pinX, pinY, 16, 0, Math.PI * 2);
  ctx.fillStyle = scene.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();

  // Indikator Arah Piston & Sudut Engkol
  const goingDown = scene.id === 1 || scene.id === 3;
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#101824";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(
    goingDown ? "▼ PISTON TURUN" : "▲ PISTON NAIK",
    cx,
    pistonTopY + pistonH - 12
  );

  const deg = Math.round(((crankAngle * 180) / Math.PI) % 720);
  ctx.fillStyle = "#ECEFF1";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`PUTARAN POROS ENGKOL: ${deg}° / 720° (SIKLUS 4-TAK)`, cx, 916);
  ctx.restore();

  // 3. HEADER ATAS & PANEL KANAN (4 KARTU LANGKAH + TELEMETRI)
  ctx.fillStyle = "#00E5FF";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("AUTOMOTIVE ENGINEERING // 4-STROKE INTERNAL COMBUSTION ENGINE", 66, 52);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 35px sans-serif";
  ctx.fillText("CARA KERJA MESIN MOBIL (SIKLUS 4-TAK)", 66, 92);

  // Voice & Timer Indicator Badge
  roundRect(ctx, 1510, 38, 344, 56, 14);
  ctx.fillStyle = "rgba(15, 26, 44, 0.92)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = scene.color;
  ctx.stroke();
  for (let b = 0; b < 12; b++) {
    const bh = 8 + Math.abs(Math.sin(t * 12 + b * 0.65)) * 26;
    ctx.fillStyle = scene.color;
    ctx.fillRect(1532 + b * 8, 66 - bh / 2, 4, bh);
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(`NARATOR STUDIO // ${t.toFixed(1)}s / 15.0s`, 1640, 71);

  // 4 Kartu Tahapan Siklus
  const rightX = 990;
  const cardW = 864;
  const cardH = 108;
  const gap = 15;

  SCENES.forEach((item, idx) => {
    const y = 114 + idx * (cardH + gap);
    const active = item.id === scene.id;

    roundRect(ctx, rightX, y, cardW, cardH, 16);
    if (active) {
      const cg = ctx.createLinearGradient(rightX, y, rightX + cardW, y);
      cg.addColorStop(0, rgba(item.rgb[0], item.rgb[1], item.rgb[2], 0.28));
      cg.addColorStop(1, "rgba(14, 24, 40, 0.94)");
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = item.color;
      ctx.stroke();

      roundRect(ctx, rightX, y, 10, cardH, 5);
      ctx.fillStyle = item.color;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(12, 20, 33, 0.72)";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.stroke();
    }

    ctx.fillStyle = active ? item.color : "#78909C";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(item.tag, rightX + 26, y + 29);

    ctx.fillStyle = active ? "#FFFFFF" : "#B0BEC5";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(item.title, rightX + 26, y + 58);

    ctx.fillStyle = active ? "#ECEFF1" : "#607D8B";
    ctx.font = "15.5px sans-serif";
    ctx.fillText(item.desc, rightX + 26, y + 86);

    if (active) {
      roundRect(ctx, rightX + cardW - 165, y + 20, 140, 10, 5);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fill();
      roundRect(
        ctx,
        rightX + cardW - 165,
        y + 20,
        Math.max(10, 140 * localT),
        10,
        5
      );
      ctx.fillStyle = item.color;
      ctx.fill();
    }
  });

  // Panel Telemetri Real-Time (Kanan Bawah)
  const teleY = 610;
  const teleH = 332;
  roundRect(ctx, rightX, teleY, cardW, teleH, 20);
  ctx.fillStyle = "rgba(12, 20, 33, 0.88)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(120, 165, 220, 0.25)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("TELEMETRI RUANG BAKAR // REAL-TIME ENGINE DYNAMICS", rightX + 28, teleY + 34);

  const prev = SCENES[Math.max(0, scene.id - 2)];
  const springFactor = springOut(localT);
  const curRpm = Math.round(
    lerp(prev.rpm, scene.rpm, springFactor) + Math.sin(t * 20) * 35
  );
  const curBar = lerp(prev.bar, scene.bar, localT).toFixed(1);
  const curTemp = Math.round(lerp(prev.temp, scene.temp, localT));

  // Tachometer RPM
  const gCx = rightX + 165;
  const gCy = teleY + 192;
  const gR = 94;
  ctx.beginPath();
  ctx.arc(gCx, gCy, gR, Math.PI * 0.75, Math.PI * 2.25);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();

  const rpmRatio = clamp(curRpm / 7000, 0, 1);
  ctx.beginPath();
  ctx.arc(gCx, gCy, gR, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * rpmRatio));
  ctx.strokeStyle = scene.color;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(`${curRpm}`, gCx, gCy + 8);
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("PUTARAN RPM", gCx, gCy + 32);
  ctx.restore();

  // Bar Tekanan & Temperatur Silinder
  const mx = rightX + 325;
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("TEKANAN SILINDER (BAR)", mx, teleY + 94);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 27px sans-serif";
  ctx.fillText(`${curBar} Bar`, mx + 365, teleY + 94);

  roundRect(ctx, mx, teleY + 108, 495, 18, 9);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();
  roundRect(ctx, mx, teleY + 108, clamp((curBar / 56) * 495, 16, 495), 18, 9);
  ctx.fillStyle = scene.color;
  ctx.fill();

  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("SUHU PEMBAKARAN (°C)", mx, teleY + 184);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 27px sans-serif";
  ctx.fillText(`${curTemp} °C`, mx + 365, teleY + 184);

  roundRect(ctx, mx, teleY + 198, 495, 18, 9);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();
  roundRect(
    ctx,
    mx,
    teleY + 198,
    clamp((curTemp / 2400) * 495, 16, 495),
    18,
    9
  );
  ctx.fillStyle = curTemp > 1000 ? "#FF3D00" : "#FFB300";
  ctx.fill();

  // Status Katup Aktif
  const inOpen = intakeLift > 0.1;
  const exOpen = exhaustLift > 0.1;
  roundRect(ctx, mx, teleY + 248, 238, 48, 10);
  ctx.fillStyle = inOpen ? "rgba(0, 229, 255, 0.22)" : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.fillStyle = inOpen ? "#00E5FF" : "#78909C";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(
    `KATUP HISAP: ${inOpen ? "BUKA" : "TUTUP"}`,
    mx + 22,
    teleY + 278
  );

  roundRect(ctx, mx + 257, teleY + 248, 238, 48, 10);
  ctx.fillStyle = exOpen
    ? "rgba(255, 112, 67, 0.25)"
    : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.fillStyle = exOpen ? "#FF7043" : "#78909C";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(
    `KATUP BUANG: ${exOpen ? "BUKA" : "TUTUP"}`,
    mx + 279,
    teleY + 278
  );

  // 4. SUBTITLE BAR & PROGRESS TIMELINE (BAWAH)
  roundRect(ctx, 64, 962, 1790, 76, 16);
  ctx.fillStyle = "rgba(9, 15, 25, 0.94)";
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = rgba(scene.rgb[0], scene.rgb[1], scene.rgb[2], 0.65);
  ctx.stroke();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(`"${scene.voiceText}"`, WIDTH / 2, 1008);
  ctx.restore();

  // Timeline Bar 15 Detik
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(64, 1052, 1790, 8);
  ctx.fillStyle = scene.color;
  ctx.fillRect(64, 1052, 1790 * clamp(t / DURATION, 0, 1), 8);
}

// Jalankan Pipeline Render Canvas + FFmpeg (adelay & amix)
async function main() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const filterComplex = [
    `[1:a]adelay=${SCENES[0].delayMs}|${SCENES[0].delayMs}[a1]`,
    `[2:a]adelay=${SCENES[1].delayMs}|${SCENES[1].delayMs}[a2]`,
    `[3:a]adelay=${SCENES[2].delayMs}|${SCENES[2].delayMs}[a3]`,
    `[4:a]adelay=${SCENES[3].delayMs}|${SCENES[3].delayMs}[a4]`,
    `[a1][a2][a3][a4]amix=inputs=4:normalize=0,volume=1.15[aout]`,
  ].join(";");

  const ffmpegArgs = [
    "-y",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${WIDTH}x${HEIGHT}`,
    "-r",
    String(FPS),
    "-i",
    "pipe:0",
    "-i",
    SCENES[0].fileMp3,
    "-i",
    SCENES[1].fileMp3,
    "-i",
    SCENES[2].fileMp3,
    "-i",
    SCENES[3].fileMp3,
    "-filter_complex",
    filterComplex,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(DURATION),
    OUTPUT_MP4,
  ];

  const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
    stdio: ["pipe", "inherit", "inherit"],
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const t = frame / FPS;
    renderFrame(ctx, t);

    const rawRgba = canvas.data();
    if (!ffmpeg.stdin.write(rawRgba)) {
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
    ffmpeg.on("error", reject);
  });

  // Bersihkan file audio sementara setelah muxing selesai
  for (const s of SCENES) {
    if (fs.existsSync(s.fileMp3)) {
      fs.unlinkSync(s.fileMp3);
    }
  }
}

main();
```
