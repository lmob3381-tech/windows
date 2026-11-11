```javascript
/**
 * ENGINE RENDER.JS — CARA KERJA MESIN MOBIL (SIKLUS 4-TAK)
 * Durasi: 15 Detik (1920x1080 @ 30 FPS = 450 Frame)
 * Environment: Ubuntu Linux, Node.js v20, @napi-rs/canvas, ffmpeg-static
 * Fitur: Kinematika Piston & Poros Engkol Presisi, Katup Camshaft, Partikel Dinamis,
 *        Dashboard Telemetri Otomotif, & Studio Voiceover Sinkron (adelay + amix)
 */

const VOICE_MODEL = "id_brian_narrator";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");
const ffmpegPath = require("ffmpeg-static");

// Konfigurasi Video
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 15; // 15 detik penuh
const TOTAL_FRAMES = DURATION * FPS; // 450 frame
const OUTPUT_FILE = path.resolve(process.cwd(), "./cara_kerja_mesin_mobil.mp4");
const TEMP_DIR = path.resolve(process.cwd(), "./temp_audio_mesin");

// Pastikan direktori sementara tersedia
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Skrip Narasi 15 Detik (4 Langkah Siklus Mesin 4-Tak)
const SCENES = [
  {
    id: 1,
    code: "01 // INTAKE STROKE",
    title: "1. LANGKAH HISAP (INTAKE)",
    subtitle: "Katup hisap terbuka, piston turun menghisap campuran udara dan bahan bakar.",
    narasi: "Cara kerja mesin mobil empat tak. Pertama, langkah hisap: piston turun menghisap udara dan bahan bakar.",
    startSec: 0.0,
    endSec: 3.7,
    delayMs: 100,
    accent: "#00E5FF",
    accentRgb: [0, 229, 255],
    rpmTarget: 2200,
    tempTarget: 140,
    pressureTarget: 1.0,
  },
  {
    id: 2,
    code: "02 // COMPRESSION STROKE",
    title: "2. LANGKAH KOMPRESI (COMPRESSION)",
    subtitle: "Kedua katup menutup rapat, piston naik memampatkan gas hingga bertekanan tinggi.",
    narasi: "Kedua, langkah kompresi: katup menutup rapat, piston naik memampatkan campuran bertekanan tinggi.",
    startSec: 3.7,
    endSec: 7.4,
    delayMs: 3800,
    accent: "#FFB300",
    accentRgb: [255, 179, 0],
    rpmTarget: 3400,
    tempTarget: 480,
    pressureTarget: 14.5,
  },
  {
    id: 3,
    code: "03 // POWER STROKE",
    title: "3. LANGKAH USAHA (COMBUSTION)",
    subtitle: "Busi memercikkan api, ledakan mendorong piston turun memutar poros engkol.",
    narasi: "Ketiga, langkah usaha: busi memercikkan api, ledakan mendorong piston turun menghasilkan tenaga.",
    startSec: 7.4,
    endSec: 11.3,
    delayMs: 7500,
    accent: "#FF3D00",
    accentRgb: [255, 61, 0],
    rpmTarget: 5800,
    tempTarget: 2150,
    pressureTarget: 52.0,
  },
  {
    id: 4,
    code: "04 // EXHAUST STROKE",
    title: "4. LANGKAH BUANG (EXHAUST)",
    subtitle: "Katup buang terbuka, piston naik mendorong sisa gas pembakaran keluar.",
    narasi: "Keempat, langkah buang: piston naik mendorong gas sisa keluar, dan siklus berulang menggerakkan mobil.",
    startSec: 11.3,
    endSec: 15.0,
    delayMs: 11400,
    accent: "#B0BEC5",
    accentRgb: [176, 190, 197],
    rpmTarget: 4200,
    tempTarget: 760,
    pressureTarget: 2.4,
  },
];

// ============================================================================
// 1. GENERATE VOICEOVER STUDIO (AUTO-DETECT ENGINE)
// ============================================================================
function prepareVoiceovers() {
  const audioFiles = [];
  for (const scene of SCENES) {
    const mp3Path = path.join(TEMP_DIR, `voice_scene_${scene.id}.mp3`);
    if (typeof global.generateStudioVoice === "function") {
      global.generateStudioVoice(scene.narasi, mp3Path, VOICE_MODEL);
    }
    audioFiles.push({
      ...scene,
      mp3Path,
      exists: fs.existsSync(mp3Path),
    });
  }
  return audioFiles;
}

// ============================================================================
// 2. FUNGSI MATEMATIKA, EASING & HELPER GRAFIS
// ============================================================================
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

function rgba(r, g, b, a = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1)})`;
}

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
// 3. SISTEM PARTIKEL RUANG BAKAR & ALIRAN MANIFOLD
// ============================================================================
const NUM_CHAMBER_PARTICLES = 95;
const chamberParticles = Array.from({ length: NUM_CHAMBER_PARTICLES }, (_, i) => ({
  seedX: ((i * 73 + 19) % 100) / 100,
  seedY: ((i * 41 + 7) % 100) / 100,
  radius: 2.5 + (i % 4) * 1.4,
  phase: (i * 0.43) % (Math.PI * 2),
  speed: 0.8 + (i % 5) * 0.35,
}));

// ============================================================================
// 4. KINEMATIKA MESIN 4-TAK PRESISI
// ============================================================================
/**
 * Menghitung state sudut engkol (0..4*PI untuk 1 siklus penuh 4-tak = 720 derajat)
 * Agar penonton dapat mengamati setiap langkah dengan jelas, setiap scene (1..4)
 * memetakan progres 180 derajat (PI radian) putaran poros engkol secara presisi,
 * ditambah akselerasi rotasi visual pada roda gila.
 */
function getEngineKinematics(timeSec) {
  let activeScene = SCENES[0];
  for (const s of SCENES) {
    if (timeSec >= s.startSec && timeSec <= s.endSec) {
      activeScene = s;
      break;
    }
  }
  const localT = clamp(
    (timeSec - activeScene.startSec) / (activeScene.endSec - activeScene.startSec),
    0,
    1
  );
  const smoothT = easeInOutCubic(localT);

  // Sudut poros engkol (crankAngle):
  // Scene 1 (Hisap): 0 -> PI (TMA ke TMB)
  // Scene 2 (Kompresi): PI -> 2*PI (TMB ke TMA)
  // Scene 3 (Usaha): 2*PI -> 3*PI (TMA ke TMB, akselerasi cepat karena ledakan)
  // Scene 4 (Buang): 3*PI -> 4*PI (TMB ke TMA)
  let crankAngle = 0;
  let intakeValveLift = 0;
  let exhaustValveLift = 0;
  let sparkIntensity = 0;
  let combustionGlow = 0;

  if (activeScene.id === 1) {
    crankAngle = smoothT * Math.PI;
    intakeValveLift = Math.sin(localT * Math.PI);
  } else if (activeScene.id === 2) {
    crankAngle = Math.PI + smoothT * Math.PI;
  } else if (activeScene.id === 3) {
    // Saat langkah usaha, percikan busi terjadi di awal (0.0 - 0.18), lalu piston terdorong kuat
    const powerCurve = Math.pow(localT, 0.78);
    crankAngle = 2 * Math.PI + powerCurve * Math.PI;
    if (localT < 0.22) {
      sparkIntensity = Math.sin((localT / 0.22) * Math.PI);
    }
    combustionGlow = Math.pow(clamp(1 - localT * 0.85, 0, 1), 1.5);
  } else {
    crankAngle = 3 * Math.PI + smoothT * Math.PI;
    exhaustValveLift = Math.sin(localT * Math.PI);
  }

  return {
    activeScene,
    localT,
    smoothT,
    crankAngle,
    intakeValveLift,
    exhaustValveLift,
    sparkIntensity,
    combustionGlow,
  };
}

// ============================================================================
// 5. RENDERER KOMPONEN VISUAL & MEKANIS
// ============================================================================
function drawBackgroundGrid(ctx, timeSec, accentRgb) {
  // Base Dark Blueprint Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, "#070B12");
  bgGrad.addColorStop(0.5, "#0B121E");
  bgGrad.addColorStop(1, "#060910");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Radial Glow di belakang mesin
  const glowGrad = ctx.createRadialGradient(540, 520, 40, 540, 520, 520);
  glowGrad.addColorStop(0, rgba(accentRgb[0], accentRgb[1], accentRgb[2], 0.14));
  glowGrad.addColorStop(0.6, rgba(accentRgb[0], accentRgb[1], accentRgb[2], 0.04));
  glowGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Engineering Grid
  ctx.strokeStyle = "rgba(120, 165, 220, 0.055)";
  ctx.lineWidth = 1;
  const gridSize = 48;
  const offset = (timeSec * 12) % gridSize;

  ctx.beginPath();
  for (let x = offset; x < WIDTH; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = offset; y < HEIGHT; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();
}

function drawEngineCutaway(ctx, timeSec, kin) {
  const {
    activeScene,
    localT,
    crankAngle,
    intakeValveLift,
    exhaustValveLift,
    sparkIntensity,
    combustionGlow,
  } = kin;

  // Koordinat Pusat Mesin di Panel Kiri
  const cx = 520;
  const crankY = 745;
  const crankRadius = 88; // r
  const rodLength = 235; // l
  const boreWidth = 230;
  const pistonWidth = 216;
  const pistonHeight = 96;

  // Posisi Pena Engkol (Crankpin)
  // crankAngle = 0 adalah Titik Mati Atas (TMA / TDC) -> sudut -PI/2 pada bidang kartesius
  const theta = crankAngle - Math.PI / 2;
  const pinX = cx + crankRadius * Math.cos(theta);
  const pinY = crankY + crankRadius * Math.sin(theta);

  // Kinematika Slider-Crank Eksak untuk Pena Piston (Wrist Pin)
  const dxPin = pinX - cx;
  const dyVertical = Math.sqrt(Math.max(100, rodLength * rodLength - dxPin * dxPin));
  const wristPinY = pinY - dyVertical;
  const pistonTopY = wristPinY - 38;
  const chamberTopY = 250; // Atap silinder (TMA berada di sekitar y = 384)

  // Panel Frame Mesin
  drawRoundedRect(ctx, 70, 118, 900, 820, 22);
  ctx.fillStyle = "rgba(13, 21, 34, 0.82)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(
    activeScene.accentRgb[0],
    activeScene.accentRgb[1],
    activeScene.accentRgb[2],
    0.45
  );
  ctx.stroke();

  // Header Label Panel Mesin
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("CROSS-SECTION SIMULATION // DOHC 4-STROKE CYLINDER", 102, 152);

  // -------------------------------------------------------------------------
  // A. SALURAN INTAKE (KIRI) & EXHAUST (KANAN) MANIFOLD
  // -------------------------------------------------------------------------
  // Intake Runner (Kiri)
  ctx.beginPath();
  ctx.moveTo(150, 215);
  ctx.lineTo(cx - 115, 215);
  ctx.quadraticCurveTo(cx - 62, 215, cx - 58, chamberTopY + 6);
  ctx.lineTo(cx - 18, chamberTopY + 6);
  ctx.quadraticCurveTo(cx - 24, 175, cx - 115, 175);
  ctx.lineTo(150, 175);
  ctx.closePath();
  ctx.fillStyle =
    activeScene.id === 1
      ? "rgba(0, 229, 255, 0.25)"
      : "rgba(30, 45, 68, 0.75)";
  ctx.fill();
  ctx.strokeStyle = "#4A6382";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Exhaust Runner (Kanan)
  ctx.beginPath();
  ctx.moveTo(890, 215);
  ctx.lineTo(cx + 115, 215);
  ctx.quadraticCurveTo(cx + 62, 215, cx + 58, chamberTopY + 6);
  ctx.lineTo(cx + 18, chamberTopY + 6);
  ctx.quadraticCurveTo(cx + 24, 175, cx + 115, 175);
  ctx.lineTo(890, 175);
  ctx.closePath();
  ctx.fillStyle =
    activeScene.id === 4
      ? "rgba(180, 195, 210, 0.28)"
      : "rgba(30, 45, 68, 0.75)";
  ctx.fill();
  ctx.strokeStyle = "#4A6382";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Label Manifold
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#00E5FF";
  ctx.fillText("INTAKE MANIFOLD (UDARA + BBM)", 152, 164);
  ctx.fillStyle = "#CFD8DC";
  ctx.fillText("EXHAUST MANIFOLD (GAS BUANG)", 648, 164);

  // -------------------------------------------------------------------------
  // B. RUANG BAKAR (COMBUSTION CHAMBER) & PARTIKEL DINAMIS
  // -------------------------------------------------------------------------
  const chamberHeight = Math.max(24, pistonTopY - chamberTopY);
  const chamberLeft = cx - boreWidth / 2;

  // Warna fluida di dalam ruang bakar sesuai langkah
  const chGrad = ctx.createLinearGradient(cx, chamberTopY, cx, pistonTopY);
  if (activeScene.id === 1) {
    // Hisap: Biru Cyan segar
    chGrad.addColorStop(0, "rgba(0, 229, 255, 0.45)");
    chGrad.addColorStop(1, "rgba(0, 140, 255, 0.15)");
  } else if (activeScene.id === 2) {
    // Kompresi: Dari Cyan berubah ke Kuning-Oranye panas saat memampat
    const r = Math.round(lerp(0, 255, localT));
    const g = Math.round(lerp(210, 150, localT));
    const b = Math.round(lerp(255, 20, localT));
    const alpha = lerp(0.28, 0.78, localT);
    chGrad.addColorStop(0, rgba(r, g, b, alpha));
    chGrad.addColorStop(1, rgba(r, g * 0.7, b * 0.5, alpha * 0.7));
  } else if (activeScene.id === 3) {
    // Usaha: Ledakan Merah-Putih-Oranye membara
    const fireAlpha = clamp(0.35 + combustionGlow * 0.65, 0.25, 0.95);
    chGrad.addColorStop(0, rgba(255, 240, 180, fireAlpha));
    chGrad.addColorStop(0.45, rgba(255, 95, 0, fireAlpha * 0.9));
    chGrad.addColorStop(1, rgba(190, 25, 0, fireAlpha * 0.6));
  } else {
    // Buang: Abu-abu asap sisa pembakaran
    const smokeAlpha = lerp(0.55, 0.2, localT);
    chGrad.addColorStop(0, rgba(160, 175, 190, smokeAlpha));
    chGrad.addColorStop(1, rgba(90, 100, 115, smokeAlpha * 0.6));
  }

  ctx.fillStyle = chGrad;
  ctx.fillRect(chamberLeft, chamberTopY, boreWidth, chamberHeight);

  // Gambar Partikel Gas / Bahan Bakar di Ruang Bakar & Manifold
  for (let i = 0; i < chamberParticles.length; i++) {
    const p = chamberParticles[i];
    const px =
      chamberLeft +
      14 +
      ((p.seedX + Math.sin(timeSec * p.speed + p.phase) * 0.08 + 1) % 1) *
        (boreWidth - 28);
    const py =
      chamberTopY +
      10 +
      ((p.seedY + Math.cos(timeSec * p.speed + p.phase) * 0.06 + 1) % 1) *
        Math.max(12, chamberHeight - 20);

    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);

    if (activeScene.id === 1) {
      ctx.fillStyle = "rgba(120, 240, 255, 0.85)";
    } else if (activeScene.id === 2) {
      ctx.fillStyle = rgba(
        lerp(80, 255, localT),
        lerp(230, 190, localT),
        lerp(255, 40, localT),
        0.9
      );
    } else if (activeScene.id === 3) {
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(255, 230, 110, 0.92)" : "rgba(255, 80, 20, 0.88)";
    } else {
      ctx.fillStyle = "rgba(185, 198, 210, 0.72)";
    }
    ctx.fill();
  }

  // Aliran Partikel Masuk di Intake saat Langkah 1
  if (activeScene.id === 1) {
    for (let k = 0; k < 18; k++) {
      const flowT = (timeSec * 2.4 + k / 18) % 1;
      const fx = lerp(170, cx - 38, flowT);
      const fy =
        195 +
        Math.sin(flowT * Math.PI * 2 + k) * 9 +
        (flowT > 0.75 ? (flowT - 0.75) * 220 : 0);
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#00E5FF";
      ctx.fill();
    }
  }

  // Aliran Partikel Asap Keluar di Exhaust saat Langkah 4
  if (activeScene.id === 4) {
    for (let k = 0; k < 18; k++) {
      const flowT = (timeSec * 2.4 + k / 18) % 1;
      const fx = lerp(cx + 38, 875, flowT);
      const fy =
        195 +
        Math.cos(flowT * Math.PI * 2 + k) * 9 +
        (flowT < 0.25 ? (0.25 - flowT) * 220 : 0);
      ctx.beginPath();
      ctx.arc(fx, fy, 4.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(195, 205, 215, 0.85)";
      ctx.fill();
    }
  }

  // Efek Gelombang Ledakan Api & Petir Busi saat Langkah 3 (Usaha)
  if (activeScene.id === 3 && (sparkIntensity > 0.02 || combustionGlow > 0.25)) {
    const flameRadius = 28 + (1 - combustionGlow) * 145;
    const flameGrad = ctx.createRadialGradient(
      cx,
      chamberTopY + 18,
      4,
      cx,
      chamberTopY + 35,
      flameRadius
    );
    flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    flameGrad.addColorStop(0.35, "rgba(255, 220, 40, 0.9)");
    flameGrad.addColorStop(0.7, "rgba(255, 60, 0, 0.65)");
    flameGrad.addColorStop(1, "rgba(255, 0, 0, 0)");

    ctx.save();
    ctx.beginPath();
    ctx.rect(chamberLeft, chamberTopY, boreWidth, chamberHeight);
    ctx.clip();
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(cx, chamberTopY + 24, flameRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Busur Api Listrik Busi
    if (sparkIntensity > 0.05) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx, chamberTopY + 4);
      ctx.lineTo(cx - 12, chamberTopY + 18);
      ctx.lineTo(cx + 10, chamberTopY + 28);
      ctx.lineTo(cx - 6, chamberTopY + 42);
      ctx.stroke();
    }
  }

  // -------------------------------------------------------------------------
  // C. DINDING BLOK SILINDER & WATER JACKET (PENDINGIN)
  // -------------------------------------------------------------------------
  // Dinding Kiri & Kanan
  ctx.fillStyle = "#26354A";
  ctx.fillRect(chamberLeft - 28, chamberTopY - 8, 28, 390);
  ctx.fillRect(chamberLeft + boreWidth, chamberTopY - 8, 28, 390);

  // Saluran Air Pendingin (Coolant Passages)
  for (let wy = chamberTopY + 30; wy < chamberTopY + 320; wy += 68) {
    drawRoundedRect(ctx, chamberLeft - 21, wy, 14, 38, 5);
    ctx.fillStyle = "#00B8D4";
    ctx.fill();
    drawRoundedRect(ctx, chamberLeft + boreWidth + 7, wy, 14, 38, 5);
    ctx.fill();
  }

  // Garis Honing Silinder
  ctx.strokeStyle = "#78909C";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(chamberLeft, chamberTopY);
  ctx.lineTo(chamberLeft, chamberTopY + 382);
  ctx.moveTo(chamberLeft + boreWidth, chamberTopY);
  ctx.lineTo(chamberLeft + boreWidth, chamberTopY + 382);
  ctx.stroke();

  // Indikator Garis TMA (TDC) & TMB (BDC)
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
  const tdcY = crankY - rodLength - crankRadius - 38;
  const bdcY = crankY - rodLength + crankRadius - 38;
  ctx.beginPath();
  ctx.moveTo(chamberLeft - 95, tdcY);
  ctx.lineTo(chamberLeft - 32, tdcY);
  ctx.moveTo(chamberLeft - 95, bdcY);
  ctx.lineTo(chamberLeft - 32, bdcY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#80DEEA";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("TMA (TDC)", chamberLeft - 95, tdcY - 6);
  ctx.fillText("TMB (BDC)", chamberLeft - 95, bdcY - 6);

  // -------------------------------------------------------------------------
  // D. KATUP HISAP, KATUP BUANG, CAMSHAFT & BUSI (SPARK PLUG)
  // -------------------------------------------------------------------------
  const intakeLiftPx = intakeValveLift * 24;
  const exhaustLiftPx = exhaustValveLift * 24;

  // Katup Hisap (Kiri)
  const ivX = cx - 44;
  const ivY = chamberTopY + intakeLiftPx;
  ctx.strokeStyle = "#CFD8DC";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(ivX, ivY - 72);
  ctx.lineTo(ivX, ivY);
  ctx.stroke();
  // Payung Katup Hisap
  ctx.beginPath();
  ctx.moveTo(ivX - 24, ivY + 4);
  ctx.lineTo(ivX + 24, ivY + 4);
  ctx.lineTo(ivX + 14, ivY - 4);
  ctx.lineTo(ivX - 14, ivY - 4);
  ctx.closePath();
  ctx.fillStyle = intakeValveLift > 0.1 ? "#00E5FF" : "#B0BEC5";
  ctx.fill();

  // Katup Buang (Kanan)
  const evX = cx + 44;
  const evY = chamberTopY + exhaustLiftPx;
  ctx.strokeStyle = "#CFD8DC";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(evX, evY - 72);
  ctx.lineTo(evX, evY);
  ctx.stroke();
  // Payung Katup Buang
  ctx.beginPath();
  ctx.moveTo(evX - 24, evY + 4);
  ctx.lineTo(evX + 24, evY + 4);
  ctx.lineTo(evX + 14, evY - 4);
  ctx.lineTo(evX - 14, evY - 4);
  ctx.closePath();
  ctx.fillStyle = exhaustValveLift > 0.1 ? "#FF7043" : "#B0BEC5";
  ctx.fill();

  // Camshaft Lobes (Noken As) di atas katup
  function drawCamLobe(camX, camY, rotAngle, isActive) {
    ctx.save();
    ctx.translate(camX, camY);
    ctx.rotate(rotAngle);
    ctx.beginPath();
    ctx.ellipse(0, 8, 16, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#00E5FF" : "#546E7A";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ECEFF1";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#101824";
    ctx.fill();
    ctx.restore();
  }
  drawCamLobe(ivX, chamberTopY - 92, crankAngle * 0.5, intakeValveLift > 0.1);
  drawCamLobe(
    evX,
    chamberTopY - 92,
    crankAngle * 0.5 + Math.PI * 0.5,
    exhaustValveLift > 0.1
  );

  // Busi (Spark Plug) di Tengah Atas
  drawRoundedRect(ctx, cx - 10, chamberTopY - 68, 20, 44, 4);
  ctx.fillStyle = "#ECEFF1";
  ctx.fill();
  ctx.fillStyle = "#37474F";
  ctx.fillRect(cx - 13, chamberTopY - 26, 26, 20);
  // Elektroda Busi
  ctx.fillStyle = sparkIntensity > 0.05 ? "#FFFF00" : "#90A4AE";
  ctx.fillRect(cx - 3, chamberTopY - 6, 6, 12);

  // -------------------------------------------------------------------------
  // E. BATANG PENGGERAK (CONNECTING ROD), PISTON & POROS ENGKOL (CRANKSHAFT)
  // -------------------------------------------------------------------------
  // Lingkaran Rumah Engkol (Crankcase)
  ctx.beginPath();
  ctx.arc(cx, crankY, crankRadius + 52, 0, Math.PI * 2);
  ctx.fillStyle = "#111A27";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#32465E";
  ctx.stroke();

  // Bandul Counterweight Poros Engkol (Berputar sesuai theta)
  ctx.save();
  ctx.translate(cx, crankY);
  ctx.rotate(theta);
  ctx.beginPath();
  ctx.arc(0, 0, crankRadius + 24, Math.PI * 0.55, Math.PI * 1.45);
  ctx.lineTo(crankRadius + 14, 22);
  ctx.lineTo(crankRadius + 14, -22);
  ctx.closePath();
  const webGrad = ctx.createLinearGradient(-90, 0, 90, 0);
  webGrad.addColorStop(0, "#455A64");
  webGrad.addColorStop(1, "#78909C");
  ctx.fillStyle = webGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#B0BEC5";
  ctx.stroke();
  ctx.restore();

  // Batang Piston (Connecting Rod) menghubungkan WristPin dan CrankPin
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - 13, wristPinY);
  ctx.lineTo(cx + 13, wristPinY);
  ctx.lineTo(pinX + 18, pinY);
  ctx.lineTo(pinX - 18, pinY);
  ctx.closePath();
  const rodGrad = ctx.createLinearGradient(cx, wristPinY, pinX, pinY);
  rodGrad.addColorStop(0, "#90A4AE");
  rodGrad.addColorStop(0.5, "#607D8B");
  rodGrad.addColorStop(1, "#455A64");
  ctx.fillStyle = rodGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#CFD8DC";
  ctx.stroke();
  ctx.restore();

  // Kepala Piston (Piston Crown & Skirt)
  const pistonX = cx - pistonWidth / 2;
  const pGrad = ctx.createLinearGradient(pistonX, pistonTopY, pistonX + pistonWidth, pistonTopY);
  pGrad.addColorStop(0, "#78909C");
  pGrad.addColorStop(0.25, "#CFD8DC");
  pGrad.addColorStop(0.5, "#ECEFF1");
  pGrad.addColorStop(0.75, "#B0BEC5");
  pGrad.addColorStop(1, "#607D8B");

  drawRoundedRect(ctx, pistonX, pistonTopY, pistonWidth, pistonHeight, 10);
  ctx.fillStyle = pGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#37474F";
  ctx.stroke();

  // 3 Cincin Piston (Compression Rings & Oil Ring)
  ctx.fillStyle = "#263238";
  for (let rIdx = 0; rIdx < 3; rIdx++) {
    const ry = pistonTopY + 12 + rIdx * 9;
    ctx.fillRect(pistonX - 2, ry, pistonWidth + 4, 4);
  }

  // Pena Piston (Wrist Pin / Gudgeon Pin)
  ctx.beginPath();
  ctx.arc(cx, wristPinY, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#263238";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#00E5FF";
  ctx.stroke();

  // Poros Utama (Main Journal) & Pena Engkol (Crankpin)
  ctx.beginPath();
  ctx.arc(cx, crankY, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#1C2836";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#90A4AE";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pinX, pinY, 17, 0, Math.PI * 2);
  ctx.fillStyle = activeScene.accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();

  // Panah Arah Gerak Piston (Turun / Naik)
  const isMovingDown = activeScene.id === 1 || activeScene.id === 3;
  const arrowY = pistonTopY + pistonHeight + 28;
  ctx.save();
  ctx.fillStyle = activeScene.accent;
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    isMovingDown ? "▼ PISTON TURUN" : "▲ PISTON NAIK",
    cx,
    pistonTopY + pistonHeight - 12
  );
  ctx.restore();

  // Label Sudut Engkol di Bawah Crankcase
  const deg = Math.round(((crankAngle * 180) / Math.PI) % 720);
  ctx.save();
  ctx.fillStyle = "#ECEFF1";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `SUDUT POROS ENGKOL: ${deg}° / 720° SIKLUS PENUH`,
    cx,
    912
  );
  ctx.restore();
}

// ============================================================================
// 6. RENDERER DASHBOARD TELEMETRI & KARTU SIKLUS 4-TAK (PANEL KANAN)
// ============================================================================
function drawDashboardUI(ctx, timeSec, kin) {
  const { activeScene, localT } = kin;

  // Judul Utama Atas
  ctx.fillStyle = "#00E5FF";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("AUTOMOTIVE ENGINEERING MOTION GRAPHIC // 15s EXPLAINER", 72, 54);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("CARA KERJA MESIN MOBIL — SIKLUS 4-TAK", 72, 95);

  // Badge Durasi & Voice Indicator di Kanan Atas
  drawRoundedRect(ctx, 1520, 42, 330, 56, 14);
  ctx.fillStyle = "rgba(16, 28, 46, 0.9)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = activeScene.accent;
  ctx.stroke();

  // Animated Audio Waveform Bars
  for (let b = 0; b < 12; b++) {
    const barH = 10 + Math.abs(Math.sin(timeSec * 11 + b * 0.7)) * 24;
    ctx.fillStyle = activeScene.accent;
    ctx.fillRect(1542 + b * 8, 70 - barH / 2, 4, barH);
  }
  ctx.fillStyle = "#ECEFF1";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(`STUDIO VOICE // ${(15 - timeSec).toFixed(1)}s`, 1652, 75);

  // -------------------------------------------------------------------------
  // A. 4 KARTU LANGKAH SIKLUS MESIN (KANAN ATAS)
  // -------------------------------------------------------------------------
  const cardStartX = 1010;
  const cardStartY = 118;
  const cardW = 840;
  const cardH = 108;
  const cardGap = 16;

  SCENES.forEach((scene, idx) => {
    const y = cardStartY + idx * (cardH + cardGap);
    const isActive = scene.id === activeScene.id;
    const isPassed = scene.id < activeScene.id;

    drawRoundedRect(ctx, cardStartX, y, cardW, cardH, 16);
    if (isActive) {
      const cardGrad = ctx.createLinearGradient(cardStartX, y, cardStartX + cardW, y);
      cardGrad.addColorStop(
        0,
        rgba(scene.accentRgb[0], scene.accentRgb[1], scene.accentRgb[2], 0.26)
      );
      cardGrad.addColorStop(1, "rgba(15, 25, 42, 0.92)");
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = scene.accent;
      ctx.stroke();

      // Bar Aksen Kiri
      drawRoundedRect(ctx, cardStartX, y, 10, cardH, 5);
      ctx.fillStyle = scene.accent;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(13, 21, 34, 0.72)";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isPassed
        ? "rgba(0, 229, 255, 0.3)"
        : "rgba(255, 255, 255, 0.1)";
      ctx.stroke();
    }

    // Judul & Penjelasan Kartu
    ctx.fillStyle = isActive ? scene.accent : "#78909C";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(scene.code, cardStartX + 28, y + 30);

    ctx.fillStyle = isActive ? "#FFFFFF" : "#B0BEC5";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(scene.title, cardStartX + 28, y + 60);

    ctx.fillStyle = isActive ? "#ECEFF1" : "#607D8B";
    ctx.font = "16px sans-serif";
    ctx.fillText(scene.subtitle, cardStartX + 28, y + 88);

    // Progress Bar di dalam Kartu Aktif
    if (isActive) {
      drawRoundedRect(ctx, cardStartX + cardW - 165, y + 22, 140, 10, 5);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
      drawRoundedRect(
        ctx,
        cardStartX + cardW - 165,
        y + 22,
        Math.max(10, 140 * localT),
        10,
        5
      );
      ctx.fillStyle = scene.accent;
      ctx.fill();
    }
  });

  // -------------------------------------------------------------------------
  // B. PANEL TELEMETRI REAL-TIME (RPM, TEKANAN BAR, & SUHU RUANG BAKAR)
  // -------------------------------------------------------------------------
  const teleY = 618;
  const teleH = 320;
  drawRoundedRect(ctx, cardStartX, teleY, cardW, teleH, 20);
  ctx.fillStyle = "rgba(13, 21, 34, 0.86)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(120, 165, 220, 0.25)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("LIVE ENGINE TELEMETRY // REAL-TIME COMBUSTION METRICS", cardStartX + 28, teleY + 34);

  // Interpolasi Nilai Telemetri
  const prevScene = SCENES[Math.max(0, activeScene.id - 2)];
  const currentRpm = Math.round(
    lerp(prevScene.rpmTarget, activeScene.rpmTarget, localT) +
      Math.sin(timeSec * 18) * 45
  );
  const currentTemp = Math.round(
    lerp(prevScene.tempTarget, activeScene.tempTarget, localT)
  );
  const currentPressure = lerp(
    prevScene.pressureTarget,
    activeScene.pressureTarget,
    localT
  ).toFixed(1);

  // 1. Tachometer Gauge (Kiri Panel Telemetri)
  const gaugeCx = cardStartX + 165;
  const gaugeCy = teleY + 190;
  const gaugeR = 92;

  ctx.beginPath();
  ctx.arc(gaugeCx, gaugeCy, gaugeR, Math.PI * 0.75, Math.PI * 2.25);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();

  const rpmNorm = clamp(currentRpm / 7000, 0, 1);
  ctx.beginPath();
  ctx.arc(
    gaugeCx,
    gaugeCy,
    gaugeR,
    Math.PI * 0.75,
    Math.PI * (0.75 + 1.5 * rpmNorm)
  );
  ctx.strokeStyle = activeScene.accent;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(`${currentRpm}`, gaugeCx, gaugeCy + 8);
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("ENGINE RPM", gaugeCx, gaugeCy + 32);
  ctx.restore();

  // 2. Meteran Tekanan & Suhu Silinder (Kanan Panel Telemetri)
  const metricX = cardStartX + 320;
  // Tekanan Silinder (Bar)
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("TEKANAN RUANG BAKAR (BAR)", metricX, teleY + 95);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`${currentPressure} Bar`, metricX + 355, teleY + 95);

  drawRoundedRect(ctx, metricX, teleY + 110, 480, 18, 9);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();
  drawRoundedRect(
    ctx,
    metricX,
    teleY + 110,
    clamp((currentPressure / 55) * 480, 16, 480),
    18,
    9
  );
  ctx.fillStyle = activeScene.accent;
  ctx.fill();

  // Suhu Ruang Bakar (°C)
  ctx.fillStyle = "#90A4AE";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("TEMPERATUR SILINDER (°C)", metricX, teleY + 185);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`${currentTemp} °C`, metricX + 355, teleY + 185);

  drawRoundedRect(ctx, metricX, teleY + 200, 480, 18, 9);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();
  drawRoundedRect(
    ctx,
    metricX,
    teleY + 200,
    clamp((currentTemp / 2300) * 480, 16, 480),
    18,
    9
  );
  ctx.fillStyle = currentTemp > 1000 ? "#FF3D00" : "#FFB300";
  ctx.fill();

  // Status Katup Hisap & Buang
  const intakeOpen = kin.intakeValveLift > 0.1;
  const exhaustOpen = kin.exhaustValveLift > 0.1;

  drawRoundedRect(ctx, metricX, teleY + 245, 230, 46, 10);
  ctx.fillStyle = intakeOpen
    ? "rgba(0, 229, 255, 0.22)"
    : "rgba(255, 255, 255, 0.06)";
  ctx.fill();
  ctx.fillStyle = intakeOpen ? "#00E5FF" : "#78909C";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(
    `KATUP HISAP: ${intakeOpen ? "TERBUKA" : "TERTUTUP"}`,
    metricX + 18,
    teleY + 274
  );

  drawRoundedRect(ctx, metricX + 250, teleY + 245, 230, 46, 10);
  ctx.fillStyle = exhaustOpen
    ? "rgba(255, 112, 67, 0.25)"
    : "rgba(255, 255, 255, 0.06)";
  ctx.fill();
  ctx.fillStyle = exhaustOpen ? "#FF7043" : "#78909C";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(
    `KATUP BUANG: ${exhaustOpen ? "TERBUKA" : "TERTUTUP"}`,
    metricX + 268,
    teleY + 274
  );

  // -------------------------------------------------------------------------
  // C. SUBTITLE NARASI VOICEOVER & GLOBAL TIMELINE (BAWAH)
  // -------------------------------------------------------------------------
  drawRoundedRect(ctx, 70, 962, 1780, 78, 16);
  ctx.fillStyle = "rgba(10, 16, 26, 0.94)";
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = rgba(
    activeScene.accentRgb[0],
    activeScene.accentRgb[1],
    activeScene.accentRgb[2],
    0.6
  );
  ctx.stroke();

  const popScale = easeOutBack(clamp(localT * 4, 0, 1));
  ctx.save();
  ctx.translate(WIDTH / 2, 1002);
  ctx.scale(0.95 + 0.05 * popScale, 0.95 + 0.05 * popScale);
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 23px sans-serif";
  ctx.fillText(`"${activeScene.narasi}"`, 0, 6);
  ctx.restore();

  // Global Progress Bar 0 - 15 Detik di Dasar Layar
  const totalProgress = clamp(timeSec / DURATION, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(70, 1054, 1780, 8);
  ctx.fillStyle = activeScene.accent;
  ctx.fillRect(70, 1054, 1780 * totalProgress, 8);
}

// ============================================================================
// 7. PIPELINE UTAMA RENDER FRAME CANVAS -> FFMPEG (.MP4)
// ============================================================================
async function renderVideo() {
  console.log("=== MEMULAI ENGINE RENDER MOTION GRAPHIC: CARA KERJA MESIN MOBIL (15s) ===");
  console.log(`[1/3] Menyiapkan Voiceover Studio (Model: ${VOICE_MODEL})...`);

  const audioSegments = prepareVoiceovers();
  const validAudioSegments = audioSegments.filter((seg) => seg.exists);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Bangun argumen FFmpeg dengan sinkronisasi adelay + amix
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
  ];

  if (validAudioSegments.length > 0) {
    for (const seg of validAudioSegments) {
      ffmpegArgs.push("-i", seg.mp3Path);
    }

    const delayFilters = [];
    const mixInputs = [];
    validAudioSegments.forEach((seg, idx) => {
      const inputIndex = idx + 1;
      const d = seg.delayMs;
      delayFilters.push(`[${inputIndex}:a]adelay=${d}|${d}[vo${idx}]`);
      mixInputs.push(`[vo${idx}]`);
    });

    const filterComplex =
      `${delayFilters.join(";")};` +
      `${mixInputs.join("")}amix=inputs=${validAudioSegments.length}:normalize=0,volume=1.15[aout]`;

    ffmpegArgs.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:a",
      "aac",
      "-b:a",
      "192k"
    );
  } else {
    // Fallback silent audio track jika dijalankan tanpa voice injector
    ffmpegArgs.push(
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:a",
      "aac",
      "-b:a",
      "128k"
    );
  }

  ffmpegArgs.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-t",
    String(DURATION),
    "-shortest",
    OUTPUT_FILE
  );

  console.log(`[2/3] Menjalankan FFmpeg & Merender ${TOTAL_FRAMES} Frame (1920x1080 @ ${FPS}fps)...`);
  const ffmpeg = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "inherit", "inherit"],
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const timeSec = frame / FPS;
    const kin = getEngineKinematics(timeSec);

    drawBackgroundGrid(ctx, timeSec, kin.activeScene.accentRgb);
    drawEngineCutaway(ctx, timeSec, kin);
    drawDashboardUI(ctx, timeSec, kin);

    // Mengambil Buffer RGBA murni dari @napi-rs/canvas (sesuai spesifikasi preload canvas.data())
    const rawRgbaBuffer =
      typeof canvas.data === "function"
        ? canvas.data()
        : Buffer.from(ctx.getImageData(0, 0, WIDTH, HEIGHT).data.buffer);

    const canContinue = ffmpeg.stdin.write(rawRgbaBuffer);
    if (!canContinue) {
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    }

    if ((frame + 1) % 90 === 0 || frame === TOTAL_FRAMES - 1) {
      console.log(
        `  -> Progress Render: ${frame + 1}/${TOTAL_FRAMES} frame (${Math.round(
          ((frame + 1) / TOTAL_FRAMES) * 100
        )}%)`
      );
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg keluar dengan kode error: ${code}`));
    });
    ffmpeg.on("error", reject);
  });

  console.log(`[3/3] Selesai! Video berhasil disimpan di: ${OUTPUT_FILE}`);
}

renderVideo().catch((err) => {
  console.error("Gagal merender video:", err);
  process.exit(1);
});
```
