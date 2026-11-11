const VOICE_MODEL = "id_brian_narrator";

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");

// ============================================================================
// KONFIGURASI UTAMA VIDEO (9:16 PORTRAIT - 1 MENIT 30 DETIK)
// ============================================================================
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const TOTAL_DURATION = 90; // Tepat 1 menit 30 detik
const TOTAL_FRAMES = TOTAL_DURATION * FPS;
const OUTPUT_FILE = path.resolve("./output.mp4");
const TEMP_DIR = path.resolve("./temp_ghost_science");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// SKENARIO 7 ADEGAN ILMIAH (TOTAL = 90.0 DETIK)
// ============================================================================
const SCENES = [
  {
    id: 0,
    start: 0,
    end: 12,
    tag: "FENOMENA PARANORMAL VS SAINS",
    title: "Mengapa Kita Melihat Hantu?",
    subtitle: "Ilusi Biologis & Fisika di Balik Penampakan",
    accent: "#00f2fe",
    secondary: "#7f5af0",
    narration:
      "Pernahkah kamu merasa diawasi di ruangan kosong, atau melihat bayangan putih melintas di sudut mata? Secara ilmiah, hantu bukanlah arwah gentayangan, melainkan fenomena biologis dan fisika yang menipu otak kita."
  },
  {
    id: 1,
    start: 12,
    end: 25,
    tag: "FAKTOR ILMIAH #1",
    title: "Pareidolia Visual",
    subtitle: "Saat Otak Salah Menebak Bayangan di Tempat Gelap",
    accent: "#ff8906",
    secondary: "#f25f4c",
    narration:
      "Pertama adalah Pareidolia. Sejak zaman purba, otak manusia berevolusi agar sangat peka mengenali wajah dan siluet tubuh demi bertahan hidup. Di tempat gelap, otak otomatis menyusun lipatan tirai atau gantungan baju menjadi sosok menyeramkan."
  },
  {
    id: 2,
    start: 25,
    end: 40,
    tag: "FAKTOR ILMIAH #2",
    title: "Sleep Paralysis (Ketindihan)",
    subtitle: "Otak Terbangun, Namun Saraf Motorik Masih Terkunci",
    accent: "#e53170",
    secondary: "#7f5af0",
    narration:
      "Kedua, fenomena ketindihan atau Sleep Paralysis. Saat terbangun mendadak dari fase tidur REM, kesadaranmu sudah aktif, tetapi saraf motorik tubuh masih dikunci. Kepanikan memicu amigdala memproyeksikan halusinasi sosok hitam yang menekan dada."
  },
  {
    id: 3,
    start: 40,
    end: 54,
    tag: "FAKTOR ILMIAH #3",
    title: "Gelombang Infrasonik 18.9 Hz",
    subtitle: "Frekuensi Suara Tak Terdengar yang Menggetarkan Bola Mata",
    accent: "#00ebc7",
    secondary: "#00b4d8",
    narration:
      "Ketiga, gelombang suara Infrasonik di frekuensi delapan belas koma sembilan Hertz. Getaran dari angin atau pipa tua ini terlalu rendah untuk didengar telinga, namun beresonansi dengan bola mata manusia dan memunculkan bayangan putih semu."
  },
  {
    id: 4,
    start: 54,
    end: 68,
    tag: "FAKTOR ILMIAH #4",
    title: "Gas Karbon Monoksida (CO)",
    subtitle: "Kebocoran Gas Tak Berbau Pemicu Halusinasi Rumah Hantu",
    accent: "#2cb67d",
    secondary: "#ff5470",
    narration:
      "Keempat, keracunan gas Karbon Monoksida. Banyak kasus rumah berhantu ternyata dipicu kebocoran gas tak berbau ini. Karbon monoksida menghambat suplai oksigen ke otak, memicu rasa dingin mendadak, ketakutan ekstrem, serta halusinasi bisikan."
  },
  {
    id: 5,
    start: 68,
    end: 80,
    tag: "FAKTOR ILMIAH #5",
    title: "Medan Elektromagnetik (EMF)",
    subtitle: "Stimulasi Lobus Temporal & Sensasi Diawasi dari Belakang",
    accent: "#9b5de5",
    secondary: "#00bbf9",
    narration:
      "Kelima, paparan medan elektromagnetik kuat dari kabel listrik tua. Gelombang ini mengganggu sinyal listrik alami di lobus temporal otak, memicu sensasi merinding dan perasaan kuat seolah ada sosok berdiri tepat di belakangmu."
  },
  {
    id: 6,
    start: 80,
    end: 90,
    tag: "KESIMPULAN SAINS",
    title: "Cahaya Logika Mengusir Takut",
    subtitle: "Hantu Adalah Proyeksi Otak yang Memproses Anomali",
    accent: "#ffd166",
    secondary: "#06d6a0",
    narration:
      "Jadi, hantu sebenarnya adalah karya seni dari otak manusia yang sedang memproses ketakutan, kelelahan, dan anomali lingkungan. Saat kita memahami sains di baliknya, rasa takut pun berubah menjadi rasa ingin tahu."
  }
];

// ============================================================================
// UTILITAS MATEMATIKA & PENGGAMBARAN KANVAS
// ============================================================================
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;

function hexToRgba(hex, alpha = 1) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const testLine = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && current) {
      lines.push(current);
      current = words[i];
    } else {
      current = testLine;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Partikel atmosferik global (debu malam / spora / kabut)
const PARTICLES = Array.from({ length: 55 }, (_, i) => ({
  x: (i * 197.3) % WIDTH,
  y: (i * 311.7) % HEIGHT,
  r: 1.5 + (i % 5) * 1.1,
  speedY: -12 - (i % 7) * 5,
  speedX: ((i % 9) - 4) * 4,
  phase: i * 0.7
}));

// ============================================================================
// KOMPONEN KARAKTER & OBJEK ILUSTRASI (HANTU, MANUSIA, OTAK, MATA, DLL)
// ============================================================================

/**
 * Menggambar sosok Hantu Ilmiah/Klasik dengan kain bergelombang sinusoidal,
 * efek pendar ektoplasma, tangan melayang, dan mata bercahaya.
 */
function drawGhostEntity(ctx, x, y, scale, t, alpha = 0.85, color = "#00f2fe", dissolve = 0) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 2.6) * 18);
  ctx.scale(scale, scale);
  ctx.globalAlpha = clamp(alpha * (1 - dissolve), 0, 1);

  // Aura luar hantu
  const aura = ctx.createRadialGradient(0, -20, 10, 0, 0, 220);
  aura.addColorStop(0, hexToRgba(color, 0.45));
  aura.addColorStop(0.5, hexToRgba(color, 0.15));
  aura.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 220, 0, Math.PI * 2);
  ctx.fill();

  // Tubuh kain hantu dengan gelombang sinusoidal di bagian bawah
  const bodyGrad = ctx.createLinearGradient(0, -150, 0, 170);
  bodyGrad.addColorStop(0, "rgba(235, 252, 255, 0.92)");
  bodyGrad.addColorStop(0.55, hexToRgba(color, 0.55));
  bodyGrad.addColorStop(1, "rgba(10, 25, 45, 0.0)");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, -65, 78, Math.PI, 0, false);

  // Sisi kanan ke bawah
  const rightWave = Math.sin(t * 3.2) * 14;
  ctx.bezierCurveTo(85, 10, 102 + rightWave, 95, 92 + rightWave, 155);

  // Gelombang kain bawah (5 lipatan)
  const folds = 5;
  const startX = 92 + rightWave;
  const endX = -92 + Math.cos(t * 3.0) * 14;
  const totalW = startX - endX;
  for (let i = 1; i <= folds; i++) {
    const px = startX - (totalW * i) / folds;
    const prevX = startX - (totalW * (i - 0.5)) / folds;
    const waveY = 155 + Math.sin(t * 5 + i * 1.4) * 22 + (i % 2 === 0 ? -18 : 14);
    ctx.quadraticCurveTo(prevX, waveY, px, 148 + Math.cos(t * 4 + i) * 12);
  }

  // Sisi kiri kembali ke kepala
  ctx.bezierCurveTo(-102, 90, -85, 10, -78, -65);
  ctx.closePath();
  ctx.fill();

  // Garis tepi bercahaya halus
  ctx.strokeStyle = hexToRgba(color, 0.7);
  ctx.lineWidth = 3;
  ctx.stroke();

  // Lipatan kain internal
  ctx.strokeStyle = hexToRgba(color, 0.3);
  ctx.lineWidth = 2;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 32, -10);
    ctx.quadraticCurveTo(k * 45 + Math.sin(t * 3 + k) * 10, 70, k * 38, 135);
    ctx.stroke();
  }

  // Tangan melayang kiri & kanan
  [-1, 1].forEach((dir) => {
    ctx.save();
    const armX = dir * 92;
    const armY = -15 + Math.sin(t * 3.5 + dir) * 12;
    ctx.translate(armX, armY);
    ctx.rotate(dir * (0.35 + Math.sin(t * 2.5) * 0.12));
    ctx.fillStyle = hexToRgba(color, 0.45);
    ctx.beginPath();
    ctx.ellipse(dir * 22, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Mata & Mulut Hantu
  ctx.fillStyle = "#060b16";
  // Mata kiri & kanan
  ctx.beginPath();
  ctx.ellipse(-26, -68, 13, 18, -0.1, 0, Math.PI * 2);
  ctx.ellipse(26, -68, 13, 18, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Inti mata menyala
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(-26 + Math.sin(t * 2) * 3, -68, 5, 0, Math.PI * 2);
  ctx.arc(26 + Math.sin(t * 2) * 3, -68, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Mulut melolong lembut
  ctx.fillStyle = "#060b16";
  ctx.beginPath();
  ctx.ellipse(0, -32, 11, 16 + Math.sin(t * 4) * 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Partikel ektoplasma menguap
  for (let p = 0; p < 8; p++) {
    const py = 140 - ((t * 60 + p * 28) % 240);
    const px = Math.sin(t * 2 + p * 1.7) * 75;
    const pr = 3 + (p % 4) * 2;
    ctx.fillStyle = hexToRgba(color, clamp((py + 100) / 240, 0.1, 0.7));
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Menggambar Karakter Manusia lengkap dengan ekspresi wajah (takut, panik, tenang),
 * gerak napas dada, kedipan mata, keringat dingin, dan senter opsional.
 */
function drawHumanCharacter(ctx, x, y, scale, t, options = {}) {
  const {
    mood = "scared", // "scared" | "dizzy" | "calm"
    hasFlashlight = false,
    flashlightAngle = -0.25,
    lookDir = 1,
    shirtColor = "#2563eb"
  } = options;

  const shiverX = mood === "scared" ? Math.sin(t * 38) * 2.2 : 0;
  const breathY = Math.sin(t * 2.8) * 3.5;

  ctx.save();
  ctx.translate(x + shiverX, y);
  ctx.scale(scale, scale);

  // Bayangan lantai di bawah kaki
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 210, 75, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kaki
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-26, 95);
  ctx.lineTo(-30, 200);
  ctx.moveTo(26, 95);
  ctx.lineTo(30, 200);
  ctx.stroke();

  // Sepatu
  ctx.fillStyle = "#0f172a";
  drawRoundedRect(ctx, -48, 192, 38, 18, 8);
  ctx.fill();
  drawRoundedRect(ctx, 14, 192, 38, 18, 8);
  ctx.fill();

  // Torso / Jaket Manusia
  ctx.save();
  ctx.translate(0, breathY);
  const torsoGrad = ctx.createLinearGradient(0, -35, 0, 105);
  torsoGrad.addColorStop(0, shirtColor);
  torsoGrad.addColorStop(1, "#0f172a");
  ctx.fillStyle = torsoGrad;
  drawRoundedRect(ctx, -56, -32, 112, 135, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Kerah leher
  ctx.fillStyle = "#e2bb99";
  drawRoundedRect(ctx, -16, -54, 32, 30, 10);
  ctx.fill();

  // Kepala
  ctx.fillStyle = "#f3cfb3";
  ctx.beginPath();
  ctx.arc(0, -96, 52, 0, Math.PI * 2);
  ctx.fill();

  // Rambut
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, -106, 55, Math.PI * 0.92, Math.PI * 2.08);
  ctx.quadraticCurveTo(45, -145, 15, -135);
  ctx.quadraticCurveTo(-25, -150, -52, -106);
  ctx.fill();

  // Mata
  const blink = Math.sin(t * 1.7) > 0.97 ? 0.15 : 1;
  const eyeOffsetX = lookDir * 5;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-18, -96, 12, 14 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(18, -96, 12, 14 * blink, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  const pupilR = mood === "scared" ? 4.5 : 6;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-18 + eyeOffsetX, -96, pupilR, 0, Math.PI * 2);
  ctx.arc(18 + eyeOffsetX, -96, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // Alis
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  if (mood === "scared" || mood === "dizzy") {
    ctx.moveTo(-32, -114);
    ctx.lineTo(-8, -120);
    ctx.moveTo(8, -120);
    ctx.lineTo(32, -114);
  } else {
    ctx.moveTo(-30, -116);
    ctx.lineTo(-8, -116);
    ctx.moveTo(8, -116);
    ctx.lineTo(30, -116);
  }
  ctx.stroke();

  // Mulut
  ctx.beginPath();
  if (mood === "scared") {
    ctx.fillStyle = "#7f1d1d";
    ctx.ellipse(0, -68, 12, 8 + Math.sin(t * 8) * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "dizzy") {
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 4;
    ctx.moveTo(-14, -68);
    ctx.quadraticCurveTo(-5, -74, 0, -68);
    ctx.quadraticCurveTo(5, -62, 14, -68);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4.5;
    ctx.arc(0, -74, 14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Tetes keringat dingin jika takut/pusing
  if (mood === "scared" || mood === "dizzy") {
    const sweatY = -115 + ((t * 35) % 28);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(-40, sweatY, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lengan Kiri
  ctx.strokeStyle = shirtColor;
  ctx.lineWidth = 20;
  ctx.beginPath();
  if (mood === "dizzy") {
    // Memegang kepala karena pusing CO
    ctx.moveTo(-48, -12);
    ctx.quadraticCurveTo(-85, -65, -45, -115);
  } else {
    ctx.moveTo(-48, -12);
    ctx.quadraticCurveTo(-70, 35, -45, 70);
  }
  ctx.stroke();

  // Lengan Kanan & Senter
  ctx.save();
  ctx.translate(46, -10);
  const armRot = hasFlashlight ? flashlightAngle + Math.sin(t * 3) * 0.06 : 0.4;
  ctx.rotate(armRot);
  ctx.strokeStyle = shirtColor;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(68, 10);
  ctx.stroke();

  // Tangan kanan
  ctx.fillStyle = "#f3cfb3";
  ctx.beginPath();
  ctx.arc(72, 10, 11, 0, Math.PI * 2);
  ctx.fill();

  if (hasFlashlight) {
    // Bodi senter
    ctx.fillStyle = "#334155";
    drawRoundedRect(ctx, 68, -2, 42, 22, 5);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(106, -4, 8, 26);

    // Sorot cahaya senter (beam kerucut)
    const beamGrad = ctx.createLinearGradient(114, 10, 560, 10);
    beamGrad.addColorStop(0, "rgba(254, 240, 138, 0.55)");
    beamGrad.addColorStop(0.5, "rgba(254, 240, 138, 0.18)");
    beamGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(114, 0);
    ctx.lineTo(580, -165);
    ctx.lineTo(580, 185);
    ctx.lineTo(114, 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.restore(); // end torso breath
  ctx.restore();
}

/**
 * Menggambar Ilustrasi Anatomi Otak Manusia dengan area spesifik yang menyala
 * (misal: Amigdala, Lobus Temporal, atau Korteks Visual).
 */
function drawBrainIllustration(ctx, x, y, scale, t, highlightZone = "amygdala", accentColor = "#e53170") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Glow latar belakang otak
  const bgGlow = ctx.createRadialGradient(0, 0, 20, 0, 0, 165);
  bgGlow.addColorStop(0, hexToRgba(accentColor, 0.35));
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 165, 0, Math.PI * 2);
  ctx.fill();

  // Kontur utama serebrum (otak besar)
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-95, 25);
  ctx.bezierCurveTo(-125, -35, -85, -105, -15, -110);
  ctx.bezierCurveTo(55, -115, 115, -70, 115, -5);
  ctx.bezierCurveTo(118, 45, 80, 75, 35, 70);
  ctx.bezierCurveTo(0, 82, -55, 75, -95, 25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Serebelum (otak kecil) & Batang Otak
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.ellipse(58, 72, 36, 24, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#475569";
  drawRoundedRect(ctx, 8, 65, 26, 62, 10);
  ctx.fill();

  // Lekukan Gyri / Sulci otak
  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 3;
  const sulci = [
    [-70, -20, -25, -45, 10, -20],
    [-45, -75, 0, -60, 45, -70],
    [-60, 15, -10, 5, 40, 25],
    [15, -50, 55, -20, 85, -30]
  ];
  sulci.forEach((c) => {
    ctx.beginPath();
    ctx.moveTo(c[0], c[1]);
    ctx.quadraticCurveTo(c[2], c[3], c[4], c[5]);
    ctx.stroke();
  });

  // Area Spesifik yang Menyala (Amigdala / Lobus Temporal / Hipoksia)
  const pulse = 0.65 + 0.35 * Math.sin(t * 6);
  let zx = 0;
  let zy = 10;
  let zr = 28;
  let label = "AMIGDALA AKTIF";

  if (highlightZone === "temporal") {
    zx = -10;
    zy = 32;
    zr = 46;
    label = "LOBUS TEMPORAL";
  } else if (highlightZone === "visual") {
    zx = 75;
    zy = -10;
    zr = 38;
    label = "KORTEKS VISUAL";
  } else if (highlightZone === "hypoxia") {
    zx = 0;
    zy = -25;
    zr = 75;
    label = "HIPOKSIA (O2 TURUN)";
  }

  const zoneGrad = ctx.createRadialGradient(zx, zy, 4, zx, zy, zr * 1.4);
  zoneGrad.addColorStop(0, hexToRgba(accentColor, 0.95 * pulse));
  zoneGrad.addColorStop(0.6, hexToRgba(accentColor, 0.45 * pulse));
  zoneGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = zoneGrad;
  ctx.beginPath();
  ctx.arc(zx, zy, zr * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Sinyal impuls saraf berjalan di dalam otak
  for (let i = 0; i < 6; i++) {
    const ang = (t * 2.2 + i * 1.05) % (Math.PI * 2);
    const nx = zx + Math.cos(ang) * (zr * 0.8);
    const ny = zy + Math.sin(ang) * (zr * 0.6);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Label penunjuk ilmiah
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, -110, -162, 220, 38, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, -137);

  ctx.restore();
}

// ============================================================================
// RENDERER LATAR CERITA & ANIMASI SPESIFIK TIAP ADEGAN (1 - 7)
// ============================================================================

/**
 * ADEGAN 1: Lorong Rumah Tua Malam Hari, Jendela Bulan Purnama, Manusia & Hantu
 */
function renderScene0(ctx, t, sceneProgress) {
  // Latar koridor rumah tua gelap
  const wallGrad = ctx.createLinearGradient(0, 260, 0, 1450);
  wallGrad.addColorStop(0, "#070b19");
  wallGrad.addColorStop(0.7, "#0f172a");
  wallGrad.addColorStop(1, "#1e1b2e");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Perspektif lantai kayu lorong
  ctx.fillStyle = "#121324";
  ctx.beginPath();
  ctx.moveTo(0, 1450);
  ctx.lineTo(WIDTH, 1450);
  ctx.lineTo(840, 1080);
  ctx.lineTo(240, 1080);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(540 + i * 95, 1080);
    ctx.lineTo(540 + i * 240, 1450);
    ctx.stroke();
  }

  // Jendela besar di tengah lorong + Bulan Purnama
  const winX = 390;
  const winY = 470;
  const winW = 300;
  const winH = 440;
  const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
  skyGrad.addColorStop(0, "#0b1536");
  skyGrad.addColorStop(1, "#1d3557");
  ctx.fillStyle = skyGrad;
  drawRoundedRect(ctx, winX, winY, winW, winH, 16);
  ctx.fill();

  // Bulan bersinar
  ctx.fillStyle = "rgba(224, 242, 254, 0.9)";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(winX + 200, winY + 110, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rintik hujan di balik jendela
  ctx.strokeStyle = "rgba(186, 230, 253, 0.35)";
  ctx.lineWidth = 2;
  for (let r = 0; r < 18; r++) {
    const rx = winX + 20 + ((r * 53) % (winW - 40));
    const ry = winY + 20 + ((t * 420 + r * 70) % (winH - 50));
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 6, ry + 26);
    ctx.stroke();
  }

  // Kusen jendela
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 12;
  drawRoundedRect(ctx, winX, winY, winW, winH, 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2);
  ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();

  // Lampu gantung tua berayun di atas
  ctx.save();
  ctx.translate(540, 290);
  ctx.rotate(Math.sin(t * 2.1) * 0.14);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 95);
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.arc(0, 105, 22, Math.PI, 0);
  ctx.fill();
  const flicker = Math.sin(t * 19) > 0.7 ? 0.25 : 0.85;
  ctx.fillStyle = `rgba(253, 224, 71, ${flicker})`;
  ctx.beginPath();
  ctx.arc(0, 110, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Karakter Manusia di kiri bawah memegang senter
  drawHumanCharacter(ctx, 255, 1110, 1.15, t, {
    mood: "scared",
    hasFlashlight: true,
    flashlightAngle: -0.35 + Math.sin(t * 1.8) * 0.12,
    lookDir: 1,
    shirtColor: "#1d4ed8"
  });

  // Sosok Hantu melayang di kanan atas lorong
  const ghostX = 785 + Math.cos(t * 1.5) * 35;
  const ghostY = 820;
  drawGhostEntity(ctx, ghostX, ghostY, 1.18, t, 0.85, "#00f2fe", 0);

  // Indikator deteksi visual antara manusia & hantu
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = "rgba(0, 242, 254, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(310, 990);
  ctx.lineTo(ghostX - 40, ghostY - 50);
  ctx.stroke();
  ctx.restore();
}

/**
 * ADEGAN 2: Pareidolia — Gantungan Jas & Tirai yang Tampak Seperti Monster di Gelap,
 * Lalu Terungkap Saat Disorot Senter + Diagram Deteksi Wajah Otak
 */
function renderScene1(ctx, t, sceneProgress) {
  // Siklus cahaya senter: 0 = gelap (tampak monster), 1 = terang (tampak gantungan baju)
  const revealFactor = clamp(0.5 + 0.5 * Math.sin(t * 1.6 - 0.8), 0, 1);

  // Background sudut kamar
  ctx.fillStyle = "#080c1a";
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Tirai jendela di sisi kanan
  ctx.fillStyle = "#162038";
  for (let i = 0; i < 5; i++) {
    const wave = Math.sin(t * 2 + i) * 12;
    ctx.beginPath();
    ctx.moveTo(640 + i * 70, 340);
    ctx.quadraticCurveTo(655 + i * 70 + wave, 720, 635 + i * 70 + wave, 1150);
    ctx.lineTo(685 + i * 70 + wave, 1150);
    ctx.quadraticCurveTo(695 + i * 70 + wave, 720, 680 + i * 70, 340);
    ctx.closePath();
    ctx.fill();
  }

  // OBJEK PAREIDOLIA DI KANAN (X: 760, Y: 920)
  const objX = 760;
  const objY = 930;

  // 1) Saat Terang (Realita): Tiang Gantungan Kayu, Topi Fedora, & Jas Panjang
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.75 * revealFactor;

  // Tiang kayu
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(objX, objY - 260);
  ctx.lineTo(objX, objY + 260);
  ctx.moveTo(objX - 80, objY + 260);
  ctx.lineTo(objX + 80, objY + 260);
  ctx.stroke();

  // Jas tergantung
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(objX - 65, objY - 140);
  ctx.lineTo(objX + 65, objY - 140);
  ctx.lineTo(objX + 95, objY + 120);
  ctx.lineTo(objX - 95, objY + 120);
  ctx.closePath();
  ctx.fill();

  // Topi di atas gantungan
  ctx.fillStyle = "#78350f";
  ctx.beginPath();
  ctx.ellipse(objX, objY - 220, 75, 18, -0.08, 0, Math.PI * 2);
  ctx.fill();
  drawRoundedRect(ctx, objX - 45, objY - 275, 90, 58, 20);
  ctx.fill();

  // Dua kancing jaket yang memantulkan cahaya (sering dikira mata hantu)
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(objX - 22, objY - 205, 8, 0, Math.PI * 2);
  ctx.arc(objX + 22, objY - 205, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2) Saat Gelap (Ilusi Pareidolia): Siluet Hantu Bertanduk/Bertopi dengan Mata Merah
  ctx.save();
  ctx.globalAlpha = 1 - revealFactor * 0.88;
  ctx.fillStyle = "#04060d";
  ctx.beginPath();
  ctx.arc(objX, objY - 210, 62, 0, Math.PI * 2);
  ctx.moveTo(objX - 90, objY - 140);
  ctx.quadraticCurveTo(objX - 135, objY, objX - 110, objY + 210);
  ctx.lineTo(objX + 110, objY + 210);
  ctx.quadraticCurveTo(objX + 135, objY, objX + 90, objY - 140);
  ctx.closePath();
  ctx.fill();

  // Mata ilusi menyala merah-oranye
  ctx.fillStyle = "#ff5470";
  ctx.shadowColor = "#ff5470";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.ellipse(objX - 22, objY - 205, 12, 7, -0.2, 0, Math.PI * 2);
  ctx.ellipse(objX + 22, objY - 205, 12, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Kotak pemindai wajah Pareidolia (Face Recognition Matrix)
  ctx.save();
  const boxColor = revealFactor > 0.55 ? "#2cb67d" : "#ff8906";
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  drawRoundedRect(ctx, objX - 115, objY - 295, 230, 210, 16);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  drawRoundedRect(ctx, objX - 145, objY - 355, 290, 46, 10);
  ctx.fill();
  ctx.strokeStyle = boxColor;
  ctx.stroke();

  ctx.fillStyle = boxColor;
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    revealFactor > 0.55 ? "REALITA: GANTUNGAN BAJU" : "PAREIDOLIA: SOSOK WAJAH (96%)",
    objX,
    objY - 325
  );
  ctx.restore();

  // Karakter Manusia dengan senter yang menyinari objek
  drawHumanCharacter(ctx, 235, 1110, 1.1, t, {
    mood: revealFactor > 0.55 ? "calm" : "scared",
    hasFlashlight: true,
    flashlightAngle: -0.22,
    lookDir: 1,
    shirtColor: "#ea580c"
  });

  // Diagram Otak di Kiri Atas yang menjelaskan pemrosesan pola wajah (Fusiform Face Area)
  drawBrainIllustration(ctx, 280, 585, 0.95, t, "visual", "#ff8906");
}

/**
 * ADEGAN 3: Sleep Paralysis (Ketindihan) — Manusia Terbaring Kaku di Kasur,
 * Bayangan Hitam Menekan Dada, dan Diagram Otak REM vs Saraf Motorik Terkunci
 */
function renderScene2(ctx, t, sceneProgress) {
  // Latar kamar tidur jam 03:15 dini hari
  const bg = ctx.createLinearGradient(0, 260, 0, 1450);
  bg.addColorStop(0, "#0b071e");
  bg.addColorStop(1, "#1a103c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Jam Dinding Digital menunjukkan 03:15 AM
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeStyle = "#e53170";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 730, 380, 240, 82, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff4d6d";
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.fillText(Math.floor(t * 2) % 2 === 0 ? "03:15" : "03 15", 850, 437);

  // Panel Otak: REM Aktif vs Motor Cortex Terkunci
  drawBrainIllustration(ctx, 310, 560, 1.0, t, "amygdala", "#e53170");

  // Badge status tidur di kanan tengah
  const badges = [
    { label: "KESADARAN VISUAL: AKTIF", color: "#00f2fe", y: 520 },
    { label: "FASE MIMPI (REM): BOCOR", color: "#ff8906", y: 585 },
    { label: "OTOT TUBUH: TERKUNCI (ATONIA)", color: "#e53170", y: 650 }
  ];
  badges.forEach((b) => {
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 520, b.y, 470, 50, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(b.label, 545, b.y + 32);
  });

  // Kasur / Tempat Tidur
  const bedY = 1230;
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, 110, bedY, 860, 150, 24);
  ctx.fill();
  // Sandaran Kepala Kasur
  ctx.fillStyle = "#334155";
  drawRoundedRect(ctx, 110, bedY - 140, 65, 260, 16);
  ctx.fill();
  // Bantal
  ctx.fillStyle = "#e2e8f0";
  drawRoundedRect(ctx, 185, bedY - 40, 150, 52, 22);
  ctx.fill();

  // Tubuh Manusia Terbaring Kaku di Atas Kasur
  ctx.save();
  // Kepala manusia di atas bantal (mata melirik panik ke arah bayangan di dadanya)
  ctx.fillStyle = "#f3cfb3";
  ctx.beginPath();
  ctx.arc(265, bedY - 58, 46, 0, Math.PI * 2);
  ctx.fill();

  // Mata terbuka lebar melirik ke arah dada
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(282, bedY - 68, 12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(287 + Math.sin(t * 10) * 2, bedY - 68, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Selimut & Badan Terkunci
  const blanketGrad = ctx.createLinearGradient(320, bedY - 55, 880, bedY + 40);
  blanketGrad.addColorStop(0, "#3b82f6");
  blanketGrad.addColorStop(1, "#1d4ed8");
  ctx.fillStyle = blanketGrad;
  drawRoundedRect(ctx, 315, bedY - 48, 590, 95, 35);
  ctx.fill();

  // Rantai / Garis Saraf Merah yang Mengunci Tubuh (Visualisasi Muscle Atonia)
  ctx.strokeStyle = `rgba(229, 49, 112, ${0.6 + 0.4 * Math.sin(t * 7)})`;
  ctx.lineWidth = 6;
  for (let lockX = 390; lockX <= 790; lockX += 100) {
    ctx.beginPath();
    ctx.moveTo(lockX, bedY - 52);
    ctx.lineTo(lockX + 25, bedY + 50);
    ctx.stroke();
  }
  ctx.restore();

  // SOSOK BAYANGAN HITAM (HALUSINASI AMIGDALA) DUDUK DI ATAS DADA
  ctx.save();
  const shadowX = 565;
  const shadowY = bedY - 175 + Math.sin(t * 3) * 8;

  // Aura asap hitam keunguan
  const smokeGrad = ctx.createRadialGradient(shadowX, shadowY, 20, shadowX, shadowY, 210);
  smokeGrad.addColorStop(0, "rgba(10, 5, 20, 0.95)");
  smokeGrad.addColorStop(0.55, "rgba(127, 90, 240, 0.45)");
  smokeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = smokeGrad;
  ctx.beginPath();
  ctx.arc(shadowX, shadowY, 210, 0, Math.PI * 2);
  ctx.fill();

  // Tubuh bayangan membungkuk menekan dada
  ctx.fillStyle = "rgba(8, 6, 16, 0.94)";
  ctx.beginPath();
  ctx.arc(shadowX - 45, shadowY - 75, 48, 0, Math.PI * 2); // kepala
  ctx.moveTo(shadowX - 45, shadowY - 30);
  ctx.quadraticCurveTo(shadowX + 85, shadowY - 20, shadowX + 75, shadowY + 135);
  ctx.lineTo(shadowX - 95, shadowY + 135);
  ctx.quadraticCurveTo(shadowX - 85, shadowY + 20, shadowX - 45, shadowY - 30);
  ctx.fill();

  // Mata merah menyala milik halusinasi
  ctx.fillStyle = "#e53170";
  ctx.shadowColor = "#e53170";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(shadowX - 62, shadowY - 70, 10, 5, 0.25, 0, Math.PI * 2);
  ctx.ellipse(shadowX - 30, shadowY - 70, 10, 5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Panah tekanan ke dada
  ctx.strokeStyle = "#e53170";
  ctx.lineWidth = 5;
  for (let a = -1; a <= 1; a++) {
    const ax = shadowX + a * 55;
    const ay = bedY - 110 + ((t * 60) % 45);
    ctx.beginPath();
    ctx.moveTo(ax, ay - 25);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax - 10, ay - 10);
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + 10, ay - 10);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * ADEGAN 4: Gelombang Infrasonik 18.9 Hz — Kipas/Pipa Bergetar, Gelombang Frekuensi Rendah,
 * Anatomi Bola Mata Bergetar (Resonansi), dan Ilusi Bayangan Putih di Sudut Mata
 */
function renderScene3(ctx, t, sceneProgress) {
  ctx.fillStyle = "#06101e";
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Kipas Ventilasi Tua di Kiri Tengah (Sumber Infrasonik 18.9 Hz)
  const fanX = 185;
  const fanY = 740;
  ctx.save();
  ctx.translate(fanX, fanY);
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#00ebc7";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Baling-baling kipas berputar
  ctx.save();
  ctx.rotate(t * 5.5);
  ctx.fillStyle = "#475569";
  for (let b = 0; b < 4; b++) {
    ctx.rotate(Math.PI / 2);
    drawRoundedRect(ctx, -18, 12, 36, 82, 14);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "#00ebc7";
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gelombang akustik 18.9 Hz merambat dari kipas ke Bola Mata
  for (let w = 0; w < 6; w++) {
    const prog = ((t * 0.85 + w / 6) % 1);
    const wx = lerp(fanX + 90, 560, prog);
    const radiusY = lerp(60, 220, prog);
    ctx.strokeStyle = hexToRgba("#00ebc7", (1 - prog) * 0.85);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(wx, fanY, radiusY, -0.45 * Math.PI, 0.45 * Math.PI);
    ctx.stroke();
  }

  // ANATOMI BOLA MATA MANUSIA RAKSASA YANG BERGETAR (RESONANSI 18.9 Hz)
  const eyeX = 650;
  const eyeY = 740;
  const vibX = Math.sin(t * 55) * 6.5;
  const vibY = Math.cos(t * 48) * 5.5;

  ctx.save();
  ctx.translate(eyeX + vibX, eyeY + vibY);

  // Saraf optik di belakang mata
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.quadraticCurveTo(210, 20, 290, 80);
  ctx.stroke();

  // Ghosting / bayangan getaran bola mata
  [-1, 1].forEach((dir) => {
    ctx.strokeStyle = "rgba(0, 235, 199, 0.28)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dir * 12, -dir * 8, 135, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Sklera (bola mata putih)
  const eyeGrad = ctx.createRadialGradient(-30, -30, 20, 0, 0, 135);
  eyeGrad.addColorStop(0, "#ffffff");
  eyeGrad.addColorStop(0.8, "#e2e8f0");
  eyeGrad.addColorStop(1, "#94a3b8");
  ctx.fillStyle = eyeGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 135, 0, Math.PI * 2);
  ctx.fill();

  // Pembuluh darah kapiler mata
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 2.5;
  for (let v = -2; v <= 2; v++) {
    ctx.beginPath();
    ctx.moveTo(80, v * 32);
    ctx.quadraticCurveTo(30, v * 20 + 10, -20, v * 28);
    ctx.stroke();
  }

  // Iris & Pupil menghadap ke kiri (ke arah gelombang suara)
  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.ellipse(-98, 0, 32, 68, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(-108, 0, 16, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kornea transparan
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-95, 0, 68, 0.55 * Math.PI, 1.45 * Math.PI);
  ctx.stroke();

  ctx.restore();

  // Bayangan Hantu Semu yang muncul-hilang di sudut pandangan karena getaran mata
  drawGhostEntity(ctx, 880, 510, 0.72, t * 1.8, 0.45 + 0.25 * Math.sin(t * 14), "#00ebc7", 0);

  // Layar Osiloskop Frekuensi 18.9 Hz di Bawah
  const oscX = 90;
  const oscY = 1040;
  const oscW = 900;
  const oscH = 260;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.strokeStyle = "#00ebc7";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, oscX, oscY, oscW, oscH, 20);
  ctx.fill();
  ctx.stroke();

  // Kurva Sinus 18.9 Hz
  ctx.strokeStyle = "#00ebc7";
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let px = 0; px <= oscW - 60; px += 8) {
    const py =
      oscY +
      oscH / 2 +
      Math.sin(px * 0.035 - t * 12) * 65 * Math.sin(px * 0.004 + t * 2);
    if (px === 0) ctx.moveTo(oscX + 30 + px, py);
    else ctx.lineTo(oscX + 30 + px, py);
  }
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "left";
  ctx.fillText("FREKUENSI RESONANSI OPTIK: 18.9 Hz (INFRASONIK)", oscX + 35, oscY + 45);
}

/**
 * ADEGAN 5: Gas Karbon Monoksida (CO) — Pipa Pemanas Bocor, Manusia Pusing Dikelilingi
 * Halusinasi Hantu, dan Zoom Pembuluh Darah (CO Mengikat Sel Darah Merah -> Hipoksia)
 */
function renderScene4(ctx, t, sceneProgress) {
  ctx.fillStyle = "#071716";
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Pemanas / Pipa Gas Tua Bocor di Kiri Bawah
  ctx.fillStyle = "#334155";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 70, 980, 150, 340, 18);
  ctx.fill();
  ctx.stroke();

  // Celah bocor menyemburkan gas CO hijau-kelabu samar
  for (let g = 0; g < 16; g++) {
    const prog = (t * 0.45 + g / 16) % 1;
    const gx = 180 + prog * 420 + Math.sin(t * 2 + g) * 35;
    const gy = 1040 - prog * 480;
    const gr = 24 + prog * 65;
    ctx.fillStyle = hexToRgba("#2cb67d", (1 - prog) * 0.32);
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();

    if (g % 2 === 0) {
      ctx.fillStyle = `rgba(167, 243, 208, ${(1 - prog) * 0.85})`;
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CO", gx, gy + 7);
    }
  }

  // Karakter Manusia Pusing Memegang Kepala
  drawHumanCharacter(ctx, 350, 1110, 1.1, t, {
    mood: "dizzy",
    hasFlashlight: false,
    lookDir: -1,
    shirtColor: "#059669"
  });

  // Halusinasi hantu berputar di sekitar kepala manusia akibat hipoksia
  drawGhostEntity(ctx, 220 + Math.sin(t * 2) * 30, 680, 0.68, t, 0.65, "#2cb67d", 0);

  // PANEL MIKROSKOPIS PEMBULUH DARAH & OTAK DI SISI KANAN
  const vesselX = 560;
  const vesselY = 470;
  const vesselW = 450;
  const vesselH = 380;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.strokeStyle = "#ff5470";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, vesselX, vesselY, vesselW, vesselH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MIKROSKOPIS DARAH: IKATAN CO-Hb", vesselX + vesselW / 2, vesselY + 42);

  // Saluran Pembuluh Darah
  ctx.fillStyle = "#450a0a";
  drawRoundedRect(ctx, vesselX + 25, vesselY + 70, vesselW - 50, 170, 28);
  ctx.fill();

  // Sel Darah Merah (Eritrosit) mengalir & diikat oleh molekul CO
  for (let c = 0; c < 4; c++) {
    const cx = vesselX + 60 + (((t * 85 + c * 105) % (vesselW - 120)));
    const cy = vesselY + 155 + Math.sin(t * 3 + c) * 18;

    // Sel darah merah
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 34, 24, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#991b1b";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Molekul CO menempel mengunci Hemoglobin
    ctx.fillStyle = "#2cb67d";
    ctx.beginPath();
    ctx.arc(cx + 18, cy - 16, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#06281e";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("CO", cx + 18, cy - 11);
  }

  // Bar Indikator Kadar Oksigen Otak Menurun (Hipoksia)
  const o2Level = clamp(0.82 - sceneProgress * 0.52, 0.28, 0.85);
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, vesselX + 35, vesselY + 275, vesselW - 70, 34, 12);
  ctx.fill();

  ctx.fillStyle = o2Level < 0.45 ? "#ff5470" : "#2cb67d";
  drawRoundedRect(ctx, vesselX + 35, vesselY + 275, (vesselW - 70) * o2Level, 34, 12);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(
    `SUPLAI OKSIGEN OTAK: ${Math.round(o2Level * 100)}% (HIPOKSIA)`,
    vesselX + vesselW / 2,
    vesselY + 345
  );

  // Diagram Otak Hipoksia di Kanan Bawah
  drawBrainIllustration(ctx, 785, 1085, 0.92, t, "hypoxia", "#ff5470");
}

/**
 * ADEGAN 6: Medan Elektromagnetik (EMF) — Panel Listrik Tua Bocor, Alat EMF Meter,
 * Stimulasi Lobus Temporal, dan Sensasi Ada Sosok Berdiri di Belakang (Sensed Presence)
 */
function renderScene5(ctx, t, sceneProgress) {
  ctx.fillStyle = "#0d0922";
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Panel Listrik Tua di Kiri Atas dengan Percikan & Gelombang EMF
  const boxX = 85;
  const boxY = 470;
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#9b5de5";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, boxX, boxY, 175, 250, 14);
  ctx.fill();
  ctx.stroke();

  // Simbol tegangan tinggi
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(boxX + 95, boxY + 55);
  ctx.lineTo(boxX + 60, boxY + 125);
  ctx.lineTo(boxX + 92, boxY + 125);
  ctx.lineTo(boxX + 75, boxY + 195);
  ctx.lineTo(boxX + 125, boxY + 110);
  ctx.lineTo(boxX + 92, boxY + 110);
  ctx.closePath();
  ctx.fill();

  // Cincin Gelombang Elektromagnetik (EMF) memancar ke kepala manusia
  for (let e = 0; e < 5; e++) {
    const prog = (t * 0.65 + e / 5) % 1;
    const r = 60 + prog * 480;
    ctx.strokeStyle = hexToRgba("#9b5de5", (1 - prog) * 0.75);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(boxX + 175, boxY + 125, r, -0.35 * Math.PI, 0.45 * Math.PI);
    ctx.stroke();
  }

  // Alat Pengukur EMF Meter di Kanan Atas
  const meterX = 630;
  const meterY = 430;
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.strokeStyle = "#00bbf9";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, meterX, meterY, 360, 220, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DETEKTOR MEDAN EMF (mG)", meterX + 180, meterY + 38);

  // Busur skala EMF
  const colors = ["#2cb67d", "#facc15", "#f97316", "#ef4444", "#9b5de5"];
  colors.forEach((col, idx) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 18;
    const a1 = Math.PI + (idx * Math.PI) / 5;
    const a2 = Math.PI + ((idx + 0.92) * Math.PI) / 5;
    ctx.beginPath();
    ctx.arc(meterX + 180, meterY + 170, 95, a1, a2);
    ctx.stroke();
  });

  // Jarum EMF bergerak ke zona merah/ungu tinggi
  const needleAngle = Math.PI + (0.78 + Math.sin(t * 9) * 0.12) * Math.PI;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(meterX + 180, meterY + 170);
  ctx.lineTo(
    meterX + 180 + Math.cos(needleAngle) * 85,
    meterY + 170 + Math.sin(needleAngle) * 85
  );
  ctx.stroke();

  // Diagram Lobus Temporal Otak
  drawBrainIllustration(ctx, 290, 880, 0.88, t, "temporal", "#9b5de5");

  // Karakter Manusia Merinding & Sosok Bayangan Semu Tepat di Belakang Bahunya (Sensed Presence)
  drawGhostEntity(ctx, 775, 980, 1.15, t, 0.62, "#9b5de5", 0);
  drawHumanCharacter(ctx, 645, 1120, 1.12, t, {
    mood: "scared",
    hasFlashlight: false,
    lookDir: 1,
    shirtColor: "#6d28d9"
  });
}

/**
 * ADEGAN 7: Kesimpulan Ilmiah — Cahaya Logika Mengurai Hantu Menjadi Partikel Sains,
 * Manusia Tersenyum Tenang, dan Kartu Ringkasan 5 Faktor Sains
 */
function renderScene6(ctx, t, sceneProgress) {
  // Latar bertransisi menjadi lebih terang & hangat dengan nuansa emas-toska
  const bg = ctx.createLinearGradient(0, 260, 0, 1450);
  bg.addColorStop(0, "#0b192c");
  bg.addColorStop(1, "#102a43");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 260, WIDTH, 1190);

  // Sorot cahaya logika keemasan dari atas
  const rayGrad = ctx.createRadialGradient(540, 420, 30, 540, 720, 620);
  rayGrad.addColorStop(0, "rgba(255, 209, 102, 0.35)");
  rayGrad.addColorStop(0.6, "rgba(6, 214, 160, 0.12)");
  rayGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = rayGrad;
  ctx.beginPath();
  ctx.arc(540, 720, 620, 0, Math.PI * 2);
  ctx.fill();

  // Hantu perlahan terurai menjadi simbol sains (Dissolve)
  const dissolve = clamp(sceneProgress * 1.15, 0, 0.92);
  drawGhostEntity(ctx, 770, 960, 1.05 * (1 - dissolve * 0.25), t, 0.85, "#ffd166", dissolve);

  // Partikel rumus & simbol ilmiah yang terlepas dari hantu
  const symbols = ["18.9 Hz", "CO", "REM", "EMF", "PAREIDOLIA", "NEURON"];
  symbols.forEach((sym, i) => {
    const sy = 1020 - (((t * 75 + i * 85) % 460));
    const sx = 720 + Math.sin(t * 2 + i * 1.3) * 120;
    ctx.fillStyle = i % 2 === 0 ? "#ffd166" : "#06d6a0";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sym, sx, sy);
  });

  // Karakter Manusia Tersenyum Tenang & Percaya Diri
  drawHumanCharacter(ctx, 240, 1120, 1.12, t, {
    mood: "calm",
    hasFlashlight: false,
    lookDir: 1,
    shirtColor: "#0d9488"
  });

  // 5 Kartu Ringkasan Penjelasan Ilmiah Hantu
  const summaryItems = [
    { no: "01", title: "Pareidolia Visual", desc: "Otak menebak pola wajah pada bayangan gelap", col: "#ff8906" },
    { no: "02", title: "Sleep Paralysis", desc: "Kesadaran bangun saat otot terkunci di fase REM", col: "#e53170" },
    { no: "03", title: "Infrasonik 18.9 Hz", desc: "Getaran frekuensi rendah pada bola mata", col: "#00ebc7" },
    { no: "04", title: "Gas Karbon Monoksida", desc: "Hipoksia oksigen pemicu halusinasi ruangan", col: "#2cb67d" },
    { no: "05", title: "Medan Elektromagnetik", desc: "Stimulasi lobus temporal otak manusia", col: "#9b5de5" }
  ];

  summaryItems.forEach((item, idx) => {
    const appear = easeOutCubic((sceneProgress - idx * 0.08) * 3.2);
    if (appear <= 0) return;

    ctx.save();
    const cardX = 85 + (1 - appear) * -80;
    const cardY = 420 + idx * 102;
    ctx.globalAlpha = appear;

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = item.col;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX, cardY, 540, 86, 16);
    ctx.fill();
    ctx.stroke();

    // Nomor
    ctx.fillStyle = item.col;
    drawRoundedRect(ctx, cardX + 14, cardY + 15, 56, 56, 12);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.no, cardX + 42, cardY + 52);

    // Teks
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 23px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(item.title, cardX + 86, cardY + 38);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px sans-serif";
    ctx.fillText(item.desc, cardX + 86, cardY + 66);
    ctx.restore();
  });
}

// ============================================================================
// UI OVERLAY: HEADER SAINS, SUBTITLE NARASI DINAMIS, & PROGRESS BAR
// ============================================================================
function renderFrame(ctx, t) {
  // Cari adegan aktif saat ini
  const scene =
    SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
  const sceneDuration = scene.end - scene.start;
  const localT = t - scene.start;
  const sceneProgress = clamp(localT / sceneDuration, 0, 1);

  // 1. Bersihkan Kanvas Utama
  ctx.fillStyle = "#050814";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Render Ilustrasi & Animasi Latar Sesuai Adegan
  switch (scene.id) {
    case 0:
      renderScene0(ctx, t, sceneProgress);
      break;
    case 1:
      renderScene1(ctx, t, sceneProgress);
      break;
    case 2:
      renderScene2(ctx, t, sceneProgress);
      break;
    case 3:
      renderScene3(ctx, t, sceneProgress);
      break;
    case 4:
      renderScene4(ctx, t, sceneProgress);
      break;
    case 5:
      renderScene5(ctx, t, sceneProgress);
      break;
    case 6:
      renderScene6(ctx, t, sceneProgress);
      break;
  }

  // 3. Partikel Atmosferik Melayang
  PARTICLES.forEach((p) => {
    const px = (p.x + p.speedX * t + Math.sin(t + p.phase) * 18 + WIDTH) % WIDTH;
    const py = (p.y + p.speedY * t + HEIGHT) % HEIGHT;
    ctx.fillStyle = hexToRgba(scene.accent, 0.25 + 0.15 * Math.sin(t * 2 + p.phase));
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Vignette Sinematik
  const vig = ctx.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    WIDTH * 0.32,
    WIDTH / 2,
    HEIGHT / 2,
    HEIGHT * 0.65
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(2, 4, 12, 0.72)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 5. Panel Header Atas (Judul & Kategori Ilmiah)
  const headerAnim = easeOutCubic(localT / 0.7);
  ctx.save();
  ctx.translate(0, (1 - headerAnim) * -60);

  ctx.fillStyle = "rgba(10, 15, 30, 0.88)";
  ctx.strokeStyle = hexToRgba(scene.accent, 0.75);
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 50, 65, WIDTH - 100, 215, 28);
  ctx.fill();
  ctx.stroke();

  // Badge Tag
  ctx.fillStyle = hexToRgba(scene.accent, 0.2);
  drawRoundedRect(ctx, 85, 90, 420, 42, 12);
  ctx.fill();
  ctx.fillStyle = scene.accent;
  ctx.font = "bold 21px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(scene.tag, 105, 118);

  // Indikator Waktu
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(Math.floor(t % 60)).padStart(2, "0");
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${mm}:${ss} / 01:30`, WIDTH - 85, 118);

  // Judul Utama Adegan
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(scene.title, 85, 182);

  // Subjudul Penjelasan Singkat
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "25px sans-serif";
  ctx.fillText(scene.subtitle, 85, 232);
  ctx.restore();

  // 6. Kotak Subtitle Narasi Bawah dengan Highlight Kata Aktif
  ctx.save();
  const subBoxX = 50;
  const subBoxY = 1445;
  const subBoxW = WIDTH - 100;
  const subBoxH = 365;

  ctx.fillStyle = "rgba(8, 12, 26, 0.92)";
  ctx.strokeStyle = hexToRgba(scene.accent, 0.65);
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, subBoxX, subBoxY, subBoxW, subBoxH, 28);
  ctx.fill();
  ctx.stroke();

  // Gelombang Audio Visualizer Kecil di Atas Kotak Subtitle
  const bars = 28;
  const barStartX = WIDTH / 2 - (bars * 16) / 2;
  for (let b = 0; b < bars; b++) {
    const bh = 8 + Math.abs(Math.sin(t * 10 + b * 0.55)) * 22;
    ctx.fillStyle = b % 2 === 0 ? scene.accent : scene.secondary;
    drawRoundedRect(ctx, barStartX + b * 16, subBoxY + 28 - bh / 2, 9, bh, 4);
    ctx.fill();
  }

  // Teks Narasi Terbungkus Rapi
  ctx.font = "bold 31px sans-serif";
  const lines = wrapText(ctx, scene.narration, subBoxW - 90);
  const startTextY = subBoxY + 105;
  const lineHeight = 48;

  // Hitung progres kata untuk efek baca aktif
  const activeLineIndex = Math.floor(sceneProgress * lines.length);

  lines.forEach((line, idx) => {
    const ly = startTextY + idx * lineHeight;
    ctx.textAlign = "center";
    if (idx < activeLineIndex) {
      ctx.fillStyle = "#e2e8f0";
    } else if (idx === activeLineIndex) {
      ctx.fillStyle = scene.accent;
    } else {
      ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    }
    ctx.fillText(line, WIDTH / 2, ly);
  });

  // Bar Progres Total Video (0 - 90 Detik)
  const barY = 1845;
  ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
  drawRoundedRect(ctx, 50, barY, WIDTH - 100, 18, 9);
  ctx.fill();

  const totalProg = clamp(t / TOTAL_DURATION, 0, 1);
  const progGrad = ctx.createLinearGradient(50, 0, WIDTH - 50, 0);
  progGrad.addColorStop(0, "#00f2fe");
  progGrad.addColorStop(0.5, "#e53170");
  progGrad.addColorStop(1, "#ffd166");
  ctx.fillStyle = progGrad;
  drawRoundedRect(ctx, 50, barY, (WIDTH - 100) * totalProg, 18, 9);
  ctx.fill();
  ctx.restore();

  // 7. Transisi Fade-In / Fade-Out Halus Antar Adegan
  let fadeAlpha = 0;
  if (localT < 0.35) {
    fadeAlpha = 1 - localT / 0.35;
  } else if (sceneDuration - localT < 0.35) {
    fadeAlpha = 1 - (sceneDuration - localT) / 0.35;
  }
  if (fadeAlpha > 0) {
    ctx.fillStyle = `rgba(4, 6, 14, ${clamp(fadeAlpha * 0.65, 0, 1)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

// ============================================================================
// GENERATOR AUDIO: NARasi TTS ANTI-TABRAKAN + BACKSOUND CREEPY DARK AMBIENT
// ============================================================================
function getAudioDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    const d = parseFloat(out);
    return Number.isFinite(d) && d > 0 ? d : 0;
  } catch (e) {
    return 0;
  }
}

async function createFallbackVoice(text, outPath, maxDuration) {
  const dur = Math.max(2, maxDuration - 1);
  execSync(
    `ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=stereo" -t ${dur} -q:a 4 "${outPath}"`,
    { stdio: "ignore" }
  );
}

async function buildMasterAudio() {
  console.log("[1/3] Menghasilkan narasi suara TTS & menghitung durasi anti-tabrakan...");
  const preparedVoiceFiles = [];

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const slotDuration = scene.end - scene.start;
    const rawMp3 = path.join(TEMP_DIR, `raw_voice_${i}.mp3`);
    const slotWav = path.join(TEMP_DIR, `slot_voice_${i}.wav`);

    let generated = false;
    if (typeof global.generateStudioVoice === "function") {
      try {
        await global.generateStudioVoice(scene.narration, rawMp3, VOICE_MODEL);
        if (fs.existsSync(rawMp3) && fs.statSync(rawMp3).size > 200) {
          generated = true;
        }
      } catch (err) {
        console.warn(`Peringatan TTS Adegan ${i}:`, err.message);
      }
    }

    if (!generated) {
      await createFallbackVoice(scene.narration, rawMp3, slotDuration);
    }

    // Ukur durasi asli file TTS agar TIDAK PERNAH menabrak adegan berikutnya
    const rawDur = getAudioDuration(rawMp3);
    const maxVoiceWindow = slotDuration - 0.55; // Jeda aman minimal 0.55 detik antar adegan

    // Jika suara TTS lebih panjang dari slot adegan, sesuaikan kecepatannya secara presisi
    // (Tanpa pernah memakai atempo=1.18 sesuai aturan)
    let speedFilter = "";
    if (rawDur > maxVoiceWindow && rawDur > 0) {
      let ratio = rawDur / maxVoiceWindow;
      if (Math.abs(ratio - 1.18) < 0.015) {
        ratio = 1.21;
      }
      ratio = clamp(ratio, 1.02, 1.35);
      speedFilter = `atempo=${ratio.toFixed(3)},`;
    }

    // Bungkus suara tepat ke dalam durasi slot adegan masing-masing (dijamin 0% tabrakan!)
    const fadeOutStart = (slotDuration - 0.35).toFixed(2);
    const filterChain = `${speedFilter}adelay=250|250,apad,atrim=0:${slotDuration},afade=t=out:st=${fadeOutStart}:d=0.30,volume=1.35`;

    execSync(
      `ffmpeg -y -i "${rawMp3}" -af "${filterChain}" -ar 44100 -ac 2 "${slotWav}"`,
      { stdio: "ignore" }
    );
    preparedVoiceFiles.push(slotWav);
  }

  // Gabungkan semua slot suara secara sekuensial (Total pasti = 90.0 detik)
  const concatListPath = path.join(TEMP_DIR, "voice_list.txt");
  const listContent = preparedVoiceFiles.map((f) => `file '${f}'`).join("\n");
  fs.writeFileSync(concatListPath, listContent, "utf8");

  const fullVoiceWav = path.join(TEMP_DIR, "full_voice.wav");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${fullVoiceWav}"`,
    { stdio: "ignore" }
  );

  // Buat Backsound Creepy Ilmiah (Dark Drone + Eerie Ghost Shimmer + Sub Heartbeat)
  console.log("[2/3] Menyusun backsound creepy dark ambient (90 detik)...");
  const bgmWav = path.join(TEMP_DIR, "creepy_bgm.wav");
  const aevalExpr =
    "0.22*sin(2*PI*55*t)+0.16*sin(2*PI*58.2*t)+0.12*sin(2*PI*110*t+1.5*sin(2*PI*0.25*t))+0.09*sin(2*PI*233.08*t)*exp(-2.2*mod(t\\,2.5))+0.07*sin(2*PI*311.13*t)* (0.5+0.5*sin(2*PI*0.18*t))";

  execSync(
    `ffmpeg -y -f lavfi -i "aevalsrc='${aevalExpr}':s=44100:d=${TOTAL_DURATION}" -af "lowpass=f=1400,aecho=0.8:0.85:180:0.35,afade=t=in:st=0:d=2.5,afade=t=out:st=87:d=3,volume=0.30" -ar 44100 -ac 2 "${bgmWav}"`,
    { stdio: "ignore" }
  );

  // Mix Narasi Utama + Backsound Creepy
  const masterAudio = path.join(TEMP_DIR, "master_audio.m4a");
  execSync(
    `ffmpeg -y -i "${fullVoiceWav}" -i "${bgmWav}" -filter_complex "[0:a]volume=1.25[v];[1:a]volume=0.32[b];[v][b]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95[outa]" -map "[outa]" -c:a aac -b:a 192k "${masterAudio}"`,
    { stdio: "ignore" }
  );

  return masterAudio;
}

// ============================================================================
// PIPELINE RENDER UTAMA (KANVAS -> FFMPEG -> ./output.mp4)
// ============================================================================
async function main() {
  const masterAudioPath = await buildMasterAudio();

  console.log(
    `[3/3] Merender ${TOTAL_FRAMES} frame animasi (${WIDTH}x${HEIGHT} @ ${FPS}fps - 90 detik)...`
  );

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  const ffmpegArgs = [
    "-y",
    "-f",
    "rawvideo",
    "-vcodec",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-s",
    `${WIDTH}x${HEIGHT}`,
    "-r",
    String(FPS),
    "-i",
    "-",
    "-i",
    masterAudioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "copy",
    "-shortest",
    OUTPUT_FILE
  ];

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "ignore", "pipe"]
  });

  let ffmpegErr = "";
  ffmpegProc.stderr.on("data", (chunk) => {
    ffmpegErr += chunk.toString();
  });

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const currentTime = frame / FPS;
    renderFrame(ctx, currentTime);

    const rawBuffer = canvas.data();
    const canContinue = ffmpegProc.stdin.write(rawBuffer);
    if (!canContinue) {
      await new Promise((resolve) => ffmpegProc.stdin.once("drain", resolve));
    }

    if (frame % (FPS * 10) === 0 || frame === TOTAL_FRAMES - 1) {
      const pct = Math.round(((frame + 1) / TOTAL_FRAMES) * 100);
      console.log(`Progress Render: ${pct}% (${frame + 1}/${TOTAL_FRAMES} frame)`);
    }
  }

  ffmpegProc.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpegProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg keluar dengan kode ${code}:\n${ffmpegErr}`));
    });
  });

  // Bersihkan file sementara
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log(`Selesai! Video tersimpan di: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Gagal merender video:", err);
  process.exit(1);
});
