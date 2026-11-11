```javascript
const VOICE_MODEL = "char_instruktur";

const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

// Load @napi-rs/canvas with fallback to node-canvas
let createCanvas;
try {
  ({ createCanvas } = require("@napi-rs/canvas"));
} catch (err) {
  ({ createCanvas } = require("canvas"));
}

// ============================================================================
// KONFIGURASI VIDEO UTAMA (1920x1080, 30 FPS, ~180 DETIK / 3 MENIT)
// ============================================================================
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const OUTPUT_FILE = path.resolve("./output.mp4");
const TEMP_DIR = path.resolve("./temp_render_assets");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// UTILITAS MATEMATIKA & INTERPOLASI
// ============================================================================
const DEG2RAD = Math.PI / 180;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeInOutCubic(t) {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function easeOutBack(t) {
  const c = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

function subProgress(t, startRatio, endRatio) {
  if (t <= startRatio) return 0;
  if (t >= endRatio) return 1;
  return (t - startRatio) / (endRatio - startRatio);
}

// Inverse Kinematics 2-Tulang untuk Lengan Instruktur (Bahu -> Siku -> Tangan)
function solveArmIK(shoulderX, shoulderY, targetX, targetY, upperLen, lowerLen, bendDirection = 1) {
  let dx = targetX - shoulderX;
  let dy = targetY - shoulderY;
  let dist = Math.hypot(dx, dy);
  const maxReach = upperLen + lowerLen - 2;
  const minReach = Math.abs(upperLen - lowerLen) + 2;

  if (dist > maxReach) {
    const scale = maxReach / dist;
    dx *= scale;
    dy *= scale;
    dist = maxReach;
  } else if (dist < minReach) {
    const scale = minReach / (dist || 1);
    dx *= scale;
    dy *= scale;
    dist = minReach;
  }

  const baseAngle = Math.atan2(dy, dx);
  const cosAngle = clamp(
    (upperLen * upperLen + dist * dist - lowerLen * lowerLen) / (2 * upperLen * dist),
    -1,
    1
  );
  const offsetAngle = Math.acos(cosAngle) * bendDirection;
  const shoulderAngle = baseAngle + offsetAngle;

  const elbowX = shoulderX + Math.cos(shoulderAngle) * upperLen;
  const elbowY = shoulderY + Math.sin(shoulderAngle) * upperLen;
  const handX = shoulderX + dx;
  const handY = shoulderY + dy;

  return { elbowX, elbowY, handX, handY };
}

// ============================================================================
// DATA KURIKULUM & NARASI (10 SEGMEN TERSTRUKTUR = ~180 DETIK / 3 MENIT)
// ============================================================================
const SEGMENTS = [
  {
    id: "intro",
    targetDuration: 17.0,
    narration:
      "Halo rekan-rekan teknik! Selamat datang di kelas Gambar Teknik. Hari ini kita akan membedah tuntas tiga proyeksi piktorial utama: Proyeksi Isometri, Proyeksi Dimetri, dan Proyeksi Miring, lengkap dengan rumus sudut, skala, serta cara mudah mengubah satu proyeksi ke proyeksi lainnya.",
    boardPhase: "intro_overview"
  },
  {
    id: "concept_3d",
    targetDuration: 18.0,
    narration:
      "Sebagai studi kasus nyata, perhatikan komponen balok bertingkat ini. Benda kerja memiliki ukuran asli: panjang sumbu X enam puluh milimeter, kedalaman sumbu Y empat puluh milimeter, dan tinggi sumbu Z lima puluh milimeter. Bagaimana cara menggambarnya di kertas dua dimensi?",
    boardPhase: "object_dims"
  },
  {
    id: "isometri_axes",
    targetDuration: 18.0,
    narration:
      "Pertama, Proyeksi Isometri. Kata isometri berarti ukuran yang sama. Pada proyeksi ini, sumbu X di kiri dan sumbu Y di kanan sama-sama dimiringkan tiga puluh derajat terhadap garis mendatar, sedangkan sumbu Z tegak lurus sembilan puluh derajat. Sudut antar ketiganya tepat seratus dua puluh derajat.",
    boardPhase: "iso_axes"
  },
  {
    id: "isometri_draw",
    targetDuration: 18.0,
    narration:
      "Karena perbandingan skala sumbu X banding Y banding Z adalah satu banding satu banding satu, semua ukuran digambar utuh. Panjang tetap enam puluh milimeter, kedalaman tetap empat puluh milimeter, dan tinggi tetap lima puluh milimeter. Sangat cocok untuk menampilkan ketiga sisi secara seimbang.",
    boardPhase: "iso_complete"
  },
  {
    id: "dimetri_axes",
    targetDuration: 18.0,
    narration:
      "Kedua, Proyeksi Dimetri. Pada gambar isometri, terkadang sudut garis tampak saling berimpit. Proyeksi Dimetri mengatasi hal ini dengan memakai dua sudut berbeda: sumbu X dimiringkan landai tujuh derajat, sedangkan sumbu kedalaman Y dimiringkan empat puluh dua derajat terhadap garis mendatar.",
    boardPhase: "dim_axes"
  },
  {
    id: "dimetri_draw",
    targetDuration: 18.0,
    narration:
      "Aturan penting pada Proyeksi Dimetri adalah skala sumbunya, yaitu satu banding setengah banding satu. Artinya, ukuran sumbu X tetap enam puluh milimeter dan tinggi Z tetap lima puluh milimeter, tetapi ukuran kedalaman pada sumbu Y wajib dikalikan setengah, dari empat puluh menjadi dua puluh milimeter.",
    boardPhase: "dim_complete"
  },
  {
    id: "oblique_draw",
    targetDuration: 19.0,
    narration:
      "Ketiga, Proyeksi Miring atau Oblique. Di sini sumbu X dibuat mendatar nol derajat dan sumbu Z tegak sembilan puluh derajat, sehingga tampak depan tergambar siku-siku persis ukuran asli. Sumbu kedalaman Y ditarik miring empat puluh lima derajat. Tipe Cavalier memakai skala penuh, sedangkan Cabinet memakai skala setengah.",
    boardPhase: "oblique_complete"
  },
  {
    id: "convert_iso_to_dim",
    targetDuration: 18.0,
    narration:
      "Sekarang, bagaimana cara mengubah Proyeksi Isometri menjadi Dimetri? Langkah pertama: turunkan kemiringan sumbu X dari tiga puluh derajat menjadi tujuh derajat. Langkah kedua: naikkan sumbu Y dari tiga puluh derajat menjadi empat puluh dua derajat. Langkah ketiga: pangkas panjang garis sumbu Y menjadi separuhnya, yakni dua puluh milimeter.",
    boardPhase: "morph_iso_to_dim"
  },
  {
    id: "convert_dim_to_oblique",
    targetDuration: 18.0,
    narration:
      "Selanjutnya, cara mengubah Proyeksi Dimetri menjadi Proyeksi Miring tipe Cabinet. Pertama, rebahkan sumbu X dari tujuh derajat hingga rata nol derajat agar bidang depan menjadi tegak lurus. Kedua, geser sudut sumbu Y dari empat puluh dua derajat ke empat puluh lima derajat, dengan skala kedalaman tetap setengah.",
    boardPhase: "morph_dim_to_obl"
  },
  {
    id: "convert_summary",
    targetDuration: 18.0,
    narration:
      "Jika ingin mengembalikannya ke Isometri, cukup angkat kembali sumbu X ke tiga puluh derajat, turunkan sumbu Y ke tiga puluh derajat, dan kembalikan skala kedalaman menjadi satu penuh. Dengan memahami tabel sudut dan skala sumbu ini, Anda dapat mengonversi proyeksi gambar teknik dengan cepat dan akurat!",
    boardPhase: "final_comparison"
  }
];

// ============================================================================
// MESIN GEOMETRI 3D KOMPONEN L-BLOCK (BALOK BERTINGKAT TEKNIK MESIN)
// Ukuran asli (mm): L (X) = 60, W (Y) = 40, H (Z) = 50
// Bentuk L-Block:
// - Alas penuh X: 0..60, Y: 0..40, Z: 0..22
// - Menara belakang/kiri X: 0..26, Y: 0..40, Z: 22..50
// ============================================================================
const LBLOCK_VERTICES = [
  // Lantai bawah Z = 0
  { id: 0, x: 0, y: 0, z: 0 },     // Titik asal depan-bawah-tengah
  { id: 1, x: 60, y: 0, z: 0 },    // Ujung X depan
  { id: 2, x: 60, y: 40, z: 0 },   // Ujung X-Y kanan belakang
  { id: 3, x: 0, y: 40, z: 0 },    // Ujung Y belakang
  // Tingkat tengah Z = 22
  { id: 4, x: 60, y: 0, z: 22 },
  { id: 5, x: 60, y: 40, z: 22 },
  { id: 6, x: 26, y: 0, z: 22 },
  { id: 7, x: 26, y: 40, z: 22 },
  // Puncak atas Z = 50
  { id: 8, x: 26, y: 0, z: 50 },
  { id: 9, x: 26, y: 40, z: 50 },
  { id: 10, x: 0, y: 40, z: 50 },
  { id: 11, x: 0, y: 0, z: 50 }
];

// Daftar poligon permukaan untuk pewarnaan shading teknik
const LBLOCK_FACES = [
  // Sisi belakang/kiri (bidang X-Z pada Y=40 & bidang Y-Z pada X=0) - digambar lebih dulu
  { verts: [0, 3, 10, 11], color: "rgba(56, 189, 248, 0.14)", stroke: "#0284c7", hidden: true },
  // Bidang depan menghadap X-Z (Y = 0) -> Wajah Utama Depan
  { verts: [0, 1, 4, 6, 8, 11], color: "rgba(37, 99, 235, 0.24)", stroke: "#1d4ed8", hidden: false },
  // Bidang samping kanan bawah menghadap Y-Z (X = 60)
  { verts: [1, 2, 5, 4], color: "rgba(14, 165, 233, 0.30)", stroke: "#0369a1", hidden: false },
  // Bidang injakan horizontal tengah (Z = 22, X = 26..60)
  { verts: [6, 4, 5, 7], color: "rgba(96, 165, 250, 0.35)", stroke: "#1e40af", hidden: false },
  // Bidang tegak menara tengah menghadap Y-Z (X = 26, Z = 22..50)
  { verts: [6, 7, 9, 8], color: "rgba(14, 165, 233, 0.28)", stroke: "#0369a1", hidden: false },
  // Bidang atap puncak horizontal (Z = 50, X = 0..26)
  { verts: [11, 8, 9, 10], color: "rgba(147, 197, 253, 0.42)", stroke: "#1e3a8a", hidden: false },
  // Bidang belakang menghadap X-Z (Y = 40) - tepi luar terlihat sebagian
  { verts: [3, 2, 5, 7, 9, 10], color: "rgba(59, 130, 246, 0.10)", stroke: "#1d4ed8", hidden: false }
];

// Garis rusuk utama (visible edges) dan garis putus-putus (hidden edges)
const LBLOCK_VISIBLE_EDGES = [
  [0, 1], [1, 4], [4, 6], [6, 8], [8, 11], [11, 0], // Profil L depan
  [1, 2], [2, 5], [4, 5],                           // Kotak kanan bawah
  [6, 7], [5, 7],                                   // Injakan tengah
  [8, 9], [7, 9],                                   // Dinding vertikal tengah
  [11, 10], [10, 9]                                 // Atap atas
];

const LBLOCK_HIDDEN_EDGES = [
  [0, 3], [3, 2], [3, 10]                           // Rusuk belakang yang tertutup
];

/**
 * Proyeksi Titik 3D (x, y, z) ke Layar 2D Papan Tulis
 * @param {number} x Panjang sepanjang sumbu X (mm) - mengarah ke kiri-atas/depan-kiri
 * @param {number} y Kedalaman sepanjang sumbu Y (mm) - mengarah ke kanan-atas
 * @param {number} z Tinggi sepanjang sumbu Z (mm) - mengarah vertikal ke atas
 * @param {object} config { originX, originY, alphaDeg, betaDeg, sx, sy, sz, unitScale }
 */
function project3D(x, y, z, config) {
  const {
    originX,
    originY,
    alphaDeg, // Sudut sumbu X terhadap horizontal (ke arah kiri-atas)
    betaDeg,  // Sudut sumbu Y terhadap horizontal (ke arah kanan-atas)
    sx,
    sy,
    sz,
    unitScale
  } = config;

  const alpha = alphaDeg * DEG2RAD;
  const beta = betaDeg * DEG2RAD;

  const dxX = -Math.cos(alpha) * (x * sx * unitScale);
  const dyX = -Math.sin(alpha) * (x * sx * unitScale);

  const dxY = Math.cos(beta) * (y * sy * unitScale);
  const dyY = -Math.sin(beta) * (y * sy * unitScale);

  const dyZ = -(z * sz * unitScale);

  return {
    x: originX + dxX + dxY,
    y: originY + dyX + dyY + dyZ
  };
}

// ============================================================================
// FUNGSI AUDIO TTS & PROBING DURASI PRESISI
// ============================================================================
function getAudioDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    const val = parseFloat(out);
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch (e) {
    return 0;
  }
}

function generateSilentFallbackAudio(filePath, durationSec) {
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSec.toFixed(3)} -q:a 9 -acodec libmp3lame "${filePath}"`,
    { stdio: "ignore" }
  );
}

async function prepareAudioAndTimeline() {
  console.log("=== [1/3] Membuat Audio Narasi & Menghitung Timeline Presisi ===");
  const timeline = [];
  let currentStart = 0;

  for (let i = 0; i < SEGMENTS.length; i++) {
    const seg = SEGMENTS[i];
    const rawVoicePath = path.join(TEMP_DIR, `voice_raw_${i}.mp3`);
    const paddedSegAudioPath = path.join(TEMP_DIR, `voice_seg_${i}.wav`);

    let voiceDuration = 0;
    if (typeof global.generateStudioVoice === "function") {
      try {
        await global.generateStudioVoice(seg.narration, rawVoicePath, VOICE_MODEL);
        voiceDuration = getAudioDuration(rawVoicePath);
      } catch (err) {
        console.warn(`Peringatan TTS segmen ${i}:`, err.message);
      }
    }

    if (!fs.existsSync(rawVoicePath) || voiceDuration <= 0.1) {
      // Fallback aman apabila dijalankan di lingkungan pengujian tanpa server TTS
      voiceDuration = Math.max(8.0, seg.targetDuration - 1.5);
      generateSilentFallbackAudio(rawVoicePath, voiceDuration);
    }

    // Pastikan tidak ada tabrakan suara: beri jeda napas minimal 1.2 detik antar segmen
    const segDuration = Math.max(seg.targetDuration, voiceDuration + 1.2);

    timeline.push({
      index: i,
      ...seg,
      rawVoicePath,
      paddedSegAudioPath,
      voiceDuration,
      duration: segDuration,
      startTime: currentStart,
      endTime: currentStart + segDuration
    });

    currentStart += segDuration;
  }

  // Jika total durasi kurang dari 180 detik (3 menit), distribusikan sisa waktu secara proporsional
  const TARGET_TOTAL_SECONDS = 180.0;
  if (currentStart < TARGET_TOTAL_SECONDS) {
    const extraPerSeg = (TARGET_TOTAL_SECONDS - currentStart) / timeline.length;
    let accum = 0;
    for (const item of timeline) {
      item.startTime = accum;
      item.duration += extraPerSeg;
      item.endTime = accum + item.duration;
      accum = item.endTime;
    }
  }

  const totalDuration = timeline[timeline.length - 1].endTime;

  // Buat file WAV per segmen dengan durasi eksak (suara + hening di akhir segmen) agar 100% bebas tabrakan
  const concatListPath = path.join(TEMP_DIR, "audio_concat.txt");
  const concatLines = [];

  for (const item of timeline) {
    const padDur = Math.max(0.1, item.duration - item.voiceDuration);
    execSync(
      `ffmpeg -y -i "${item.rawVoicePath}" -f lavfi -t ${padDur.toFixed(3)} -i anullsrc=r=44100:cl=stereo -filter_complex "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1[out]" -map "[out]" -t ${item.duration.toFixed(3)} "${item.paddedSegAudioPath}"`,
      { stdio: "ignore" }
    );
    concatLines.push(`file '${item.paddedSegAudioPath.replace(/'/g, "'\\''")}'`);
  }

  fs.writeFileSync(concatListPath, concatLines.join("\n"), "utf8");
  const masterAudioPath = path.join(TEMP_DIR, "master_audio.wav");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterAudioPath}"`,
    { stdio: "ignore" }
  );

  console.log(`Total durasi video: ${totalDuration.toFixed(2)} detik (${timeline.length} segmen).`);
  return { timeline, totalDuration, masterAudioPath };
}

// ============================================================================
// PENGGAMBARAN ELEMEN VISUAL PAPAN TULIS & GEOMETRI TEKNIK
// ============================================================================
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

function drawArrow(ctx, x1, y1, x2, y2, color = "#0f172a", lineWidth = 3, headLen = 12, bothEnds = false) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Panah ujung akhir
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (bothEnds) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + headLen * Math.cos(angle - Math.PI / 6), y1 + headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x1 + headLen * Math.cos(angle + Math.PI / 6), y1 + headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Menggambar Sumbu Proyeksi + Busur Sudut Derajat (Protractor Arc)
function drawProjectionAxes(ctx, config, progress = 1, showAngles = true) {
  if (progress <= 0) return null;
  const { originX, originY, alphaDeg, betaDeg, axisLength = 190 } = config;
  const p = easeInOutCubic(progress);

  const alpha = alphaDeg * DEG2RAD;
  const beta = betaDeg * DEG2RAD;

  ctx.save();
  // Garis bantu horizontal titik-titik
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(originX - axisLength * 0.95 * p, originY);
  ctx.lineTo(originX + axisLength * 0.95 * p, originY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sumbu X (Kiri - Merah Bata/Oranye Teknik)
  const xEnd = {
    x: originX - Math.cos(alpha) * axisLength * p,
    y: originY - Math.sin(alpha) * axisLength * p
  };
  drawArrow(ctx, originX, originY, xEnd.x, xEnd.y, "#dc2626", 3.5, 13);

  // Sumbu Y (Kanan - Hijau Zamrud Teknik)
  const yEnd = {
    x: originX + Math.cos(beta) * axisLength * p,
    y: originY - Math.sin(beta) * axisLength * p
  };
  drawArrow(ctx, originX, originY, yEnd.x, yEnd.y, "#059669", 3.5, 13);

  // Sumbu Z (Vertikal Atas - Ungu/Biru Tua)
  const zEnd = {
    x: originX,
    y: originY - axisLength * 0.95 * p
  };
  drawArrow(ctx, originX, originY, zEnd.x, zEnd.y, "#7c3aed", 3.5, 13);

  // Label Sumbu X, Y, Z
  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#dc2626";
  ctx.fillText("X (Panjang)", xEnd.x - 95, xEnd.y - 10);
  ctx.fillStyle = "#059669";
  ctx.fillText("Y (Kedalaman)", yEnd.x + 10, yEnd.y - 8);
  ctx.fillStyle = "#7c3aed";
  ctx.fillText("Z (Tinggi)", zEnd.x - 42, zEnd.y - 14);

  // Busur Sudut Alpha (Kiri) & Beta (Kanan)
  if (showAngles && p > 0.6) {
    const arcRadius = 72;

    // Busur Alpha (Kiri: dari 180 deg ke 180 + alphaDeg)
    if (alphaDeg >= 0.5) {
      ctx.strokeStyle = "#dc2626";
      ctx.fillStyle = "rgba(220, 38, 38, 0.12)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.arc(originX, originY, arcRadius, Math.PI, Math.PI + alpha, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const midA = Math.PI + alpha / 2;
      ctx.fillStyle = "#b91c1c";
      ctx.font = "bold 19px sans-serif";
      ctx.fillText(
        `α = ${Math.round(alphaDeg)}°`,
        originX + Math.cos(midA) * (arcRadius + 58) - 24,
        originY + Math.sin(midA) * (arcRadius + 24) + 5
      );
    } else {
      ctx.fillStyle = "#b91c1c";
      ctx.font = "bold 19px sans-serif";
      ctx.fillText("α = 0° (Mendatar)", originX - 165, originY + 28);
    }

    // Busur Beta (Kanan: dari -beta ke 0)
    ctx.strokeStyle = "#059669";
    ctx.fillStyle = "rgba(5, 150, 105, 0.12)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.arc(originX, originY, arcRadius, -beta, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const midB = -beta / 2;
    ctx.fillStyle = "#047857";
    ctx.font = "bold 19px sans-serif";
    ctx.fillText(
      `β = ${Math.round(betaDeg)}°`,
      originX + Math.cos(midB) * (arcRadius + 16),
      originY + Math.sin(midB) * (arcRadius + 20) + 5
    );
  }

  ctx.restore();
  return yEnd;
}

// Menggambar Objek 3D L-Block dengan Progres Garis Demi Garis & Dimensi Ukuran
function drawProjectedLBlock(ctx, config, drawProgress = 1, showDimensions = true) {
  if (drawProgress <= 0) return { x: config.originX, y: config.originY };
  const pts = LBLOCK_VERTICES.map((v) => project3D(v.x, v.y, v.z, config));

  ctx.save();

  // 1. Gambar Poligon Permukaan (Muncul halus saat garis hampir selesai)
  const faceAlpha = subProgress(drawProgress, 0.35, 0.95);
  if (faceAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = faceAlpha;
    for (const face of LBLOCK_FACES) {
      if (face.hidden) continue;
      ctx.beginPath();
      face.verts.forEach((vIdx, idx) => {
        const pt = pts[vIdx];
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = face.color;
      ctx.fill();
    }
    ctx.restore();
  }

  // 2. Gambar Rusuk Tersembunyi (Garis Putus-Putus Tipis)
  const hiddenProg = subProgress(drawProgress, 0.1, 0.5);
  if (hiddenProg > 0) {
    ctx.strokeStyle = "rgba(71, 85, 105, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    for (const [a, b] of LBLOCK_HIDDEN_EDGES) {
      const p1 = pts[a];
      const p2 = pts[b];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(lerp(p1.x, p2.x, hiddenProg), lerp(p1.y, p2.y, hiddenProg));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 3. Gambar Rusuk Utama Secara Berurutan (Animasi Tangan Menggambar Nyata)
  const totalEdges = LBLOCK_VISIBLE_EDGES.length;
  const edgePhase = clamp(drawProgress / 0.85, 0, 1) * totalEdges;
  let activeTip = { x: pts[0].x, y: pts[0].y };

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < totalEdges; i++) {
    const localP = clamp(edgePhase - i, 0, 1);
    if (localP <= 0) break;
    const [a, b] = LBLOCK_VISIBLE_EDGES[i];
    const p1 = pts[a];
    const p2 = pts[b];
    const curX = lerp(p1.x, p2.x, localP);
    const curY = lerp(p1.y, p2.y, localP);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(curX, curY);
    ctx.stroke();

    activeTip = { x: curX, y: curY };
  }

  // 4. Gambar Garis Ukur (Dimension Lines) beserta Nilai Ukuran (mm)
  if (showDimensions && drawProgress > 0.75) {
    const dimAlpha = subProgress(drawProgress, 0.75, 1.0);
    ctx.save();
    ctx.globalAlpha = dimAlpha;

    const drawnL = Math.round(60 * config.sx);
    const drawnW = Math.round(40 * config.sy);
    const drawnH = Math.round(50 * config.sz);

    // Garis ukur Panjang X (dari titik 0 ke titik 1, digeser sedikit ke bawah)
    const offX = 28;
    const p0 = pts[0];
    const p1 = pts[1];
    drawArrow(ctx, p0.x, p0.y + offX, p1.x, p1.y + offX, "#dc2626", 2.2, 9, true);
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(
      `L = ${drawnL} mm (${config.sx === 1 ? "100%" : "50%"})`,
      (p0.x + p1.x) / 2 - 65,
      (p0.y + p1.y) / 2 + offX + 24
    );

    // Garis ukur Kedalaman Y (dari titik 1 ke titik 2, digeser ke kanan-bawah)
    const p2 = pts[2];
    drawArrow(ctx, p1.x + 22, p1.y + 16, p2.x + 22, p2.y + 16, "#059669", 2.2, 9, true);
    ctx.fillStyle = "#047857";
    ctx.fillText(
      `W = ${drawnW} mm (${config.sy === 1 ? "Skala 1" : "Skala 1/2"})`,
      (p1.x + p2.x) / 2 + 28,
      (p1.y + p2.y) / 2 + 26
    );

    // Garis ukur Tinggi Z (dari titik 0 ke titik 11)
    const p11 = pts[11];
    drawArrow(ctx, p0.x - 26, p0.y, p11.x - 26, p11.y, "#7c3aed", 2.2, 9, true);
    ctx.fillStyle = "#6d28d9";
    ctx.fillText(
      `H = ${drawnH} mm`,
      p11.x - 118,
      (p0.y + p11.y) / 2 + 5
    );

    ctx.restore();
  }

  ctx.restore();
  return activeTip;
}

// Menggambar Kartu Rumus / Info Ringkas di Dalam Papan Tulis
function drawBoardNoteCard(ctx, x, y, w, h, title, lines, accentColor = "#2563eb", appearProg = 1) {
  if (appearProg <= 0) return;
  const p = easeOutBack(appearProg);

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(p, p);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  // Bayangan lembut kartu
  ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
  drawRoundedRect(ctx, x + 4, y + 6, w, h, 14);
  ctx.fill();

  // Latar kartu putih gading bersih
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();

  // Pita aksen kiri
  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, x, y, 12, h, 6);
  ctx.fill();

  // Judul kartu
  ctx.fillStyle = accentColor;
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(title, x + 26, y + 36);

  // Isi baris
  ctx.fillStyle = "#1e293b";
  ctx.font = "19px sans-serif";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + 26, y + 70 + i * 30);
  });

  ctx.restore();
}

// ============================================================================
// PENGGAMBARAN RUANGAN STUDIO & PAPAN TULIS INTERAKTIF
// ============================================================================
function drawStudioAndWhiteboardShell(ctx) {
  // Dinding studio teknik (gradasi abu-biru gelap hangat agar papan tulis putih menonjol tajam)
  const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  wallGrad.addColorStop(0, "#1e293b");
  wallGrad.addColorStop(0.82, "#0f172a");
  wallGrad.addColorStop(0.821, "#334155");
  wallGrad.addColorStop(1, "#1e293b");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Garis lantai kayu studio
  ctx.fillStyle = "#273549";
  ctx.fillRect(0, 910, WIDTH, 170);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 910);
  ctx.lineTo(WIDTH, 910);
  ctx.stroke();

  // Papan Tulis Besar (x: 340..1850, y: 55..885)
  const bx = 340;
  const by = 55;
  const bw = 1510;
  const bh = 830;

  // Bayangan papan tulis di dinding
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  drawRoundedRect(ctx, bx + 10, by + 14, bw, bh, 18);
  ctx.fill();

  // Bingkai Aluminium Perak
  const frameGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
  frameGrad.addColorStop(0, "#cbd5e1");
  frameGrad.addColorStop(0.5, "#94a3b8");
  frameGrad.addColorStop(1, "#64748b");
  ctx.fillStyle = frameGrad;
  drawRoundedRect(ctx, bx - 12, by - 12, bw + 24, bh + 24, 18);
  ctx.fill();

  // Permukaan Papan Tulis Putih Bersih
  ctx.fillStyle = "#f8fafc";
  drawRoundedRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();

  // Grid milimeter blok halus di papan tulis (khas gambar teknik)
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
  ctx.lineWidth = 1;
  const gridStep = 35;
  for (let gx = bx + gridStep; gx < bx + bw; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, by);
    ctx.lineTo(gx, by + bh);
    ctx.stroke();
  }
  for (let gy = by + gridStep; gy < by + bh; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(bx, gy);
    ctx.lineTo(bx + bw, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Rak Spidol & Penghapus di Bawah Papan Tulis
  ctx.fillStyle = "#475569";
  ctx.fillRect(bx + 120, by + bh + 8, bw - 240, 14);
  // Spidol Merah, Biru, Hijau, Penghapus
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(bx + 260, by + bh + 2, 48, 7);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(bx + 320, by + bh + 2, 48, 7);
  ctx.fillStyle = "#059669";
  ctx.fillRect(bx + 380, by + bh + 2, 48, 7);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(bx + 460, by + bh - 4, 70, 13);

  return { bx, by, bw, bh };
}

// ============================================================================
// PENGGAMBARAN KONTEN PAPAN TULIS BERDASARKAN FASE SEGMEN
// Mengembalikan koordinat { targetX, targetY, mode } untuk ditunjuk/digambar instruktur
// ============================================================================
function renderWhiteboardContent(ctx, phase, segProgress, globalTime) {
  const bx = 340;
  const by = 55;
  let pointerTarget = { x: bx + 420, y: by + 400, isDrawing: false };

  // Judul Materi di Dalam Papan Tulis (Bukan banner atas layar, melainkan tulisan spidol di papan)
  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 30px sans-serif";

  if (phase === "intro_overview") {
    ctx.fillText("GAMBAR TEKNIK: PROYEKSI PIKTORIAL 3D → 2D", bx + 45, by + 58);
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + 45, by + 72);
    ctx.lineTo(bx + 760, by + 72);
    ctx.stroke();

    // Tampilkan 3 kartu pratinjau proyeksi secara bertahap
    const p1 = subProgress(segProgress, 0.08, 0.35);
    const p2 = subProgress(segProgress, 0.35, 0.65);
    const p3 = subProgress(segProgress, 0.65, 0.92);

    // 1. Pratinjau Isometri
    if (p1 > 0) {
      drawBoardNoteCard(
        ctx,
        bx + 50,
        by + 110,
        440,
        155,
        "1. Proyeksi Isometri",
        [
          "• Sudut Sumbu: α = 30° | β = 30°",
          "• Skala X : Y : Z = 1 : 1 : 1",
          "• Ketiga sisi tampil seimbang utuh"
        ],
        "#2563eb",
        p1
      );
      const tip1 = drawProjectedLBlock(
        ctx,
        { originX: bx + 270, originY: by + 620, alphaDeg: 30, betaDeg: 30, sx: 1, sy: 1, sz: 1, unitScale: 3.2 },
        p1,
        false
      );
      pointerTarget = { x: tip1.x, y: tip1.y, isDrawing: p1 < 0.95 };
    }

    // 2. Pratinjau Dimetri
    if (p2 > 0) {
      drawBoardNoteCard(
        ctx,
        bx + 535,
        by + 110,
        440,
        155,
        "2. Proyeksi Dimetri",
        [
          "• Sudut Sumbu: α = 7° | β = 42°",
          "• Skala X : Y : Z = 1 : 1/2 : 1",
          "• Sumbu kedalaman Y diperpendek 50%"
        ],
        "#059669",
        p2
      );
      const tip2 = drawProjectedLBlock(
        ctx,
        { originX: bx + 760, originY: by + 620, alphaDeg: 7, betaDeg: 42, sx: 1, sy: 0.5, sz: 1, unitScale: 3.2 },
        p2,
        false
      );
      pointerTarget = { x: tip2.x, y: tip2.y, isDrawing: p2 < 0.95 };
    }

    // 3. Pratinjau Proyeksi Miring
    if (p3 > 0) {
      drawBoardNoteCard(
        ctx,
        bx + 1020,
        by + 110,
        440,
        155,
        "3. Proyeksi Miring (Oblique)",
        [
          "• Sudut Sumbu: α = 0° | β = 45°",
          "• Skala: Cavalier (1:1:1) / Cabinet (1:½:1)",
          "• Bidang depan X-Z siku-siku 90° asli"
        ],
        "#d97706",
        p3
      );
      const tip3 = drawProjectedLBlock(
        ctx,
        { originX: bx + 1270, originY: by + 620, alphaDeg: 0, betaDeg: 45, sx: 1, sy: 0.5, sz: 1, unitScale: 3.2 },
        p3,
        false
      );
      pointerTarget = { x: tip3.x, y: tip3.y, isDrawing: p3 < 0.95 };
    }
  } else if (phase === "object_dims") {
    ctx.fillText("STUDI KASUS: KOMPONEN BALOK BERTINGKAT (L-BLOCK)", bx + 45, by + 58);

    // Kiri: Pandangan Ortogonal 2D (Tampak Depan & Tampak Samping)
    const pOrtho = subProgress(segProgress, 0.05, 0.45);
    drawBoardNoteCard(
      ctx,
      bx + 50,
      by + 105,
      580,
      200,
      "Spesifikasi Ukuran Benda Kerja Asli",
      [
        "• Panjang Sumbu X (L) = 60 mm",
        "• Kedalaman Sumbu Y (W) = 40 mm",
        "• Tinggi Total Sumbu Z (H) = 50 mm",
        "• Tinggi Undakan = 22 mm | Lebar Menara = 26 mm"
      ],
      "#1d4ed8",
      pOrtho
    );

    // Gambar Tampak Depan 2D (X-Z) di kiri bawah papan
    const ox = bx + 110;
    const oy = by + 690;
    const sc = 3.6;
    ctx.strokeStyle = "#1d4ed8";
    ctx.fillStyle = "rgba(37, 99, 235, 0.16)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + 60 * sc, oy);
    ctx.lineTo(ox + 60 * sc, oy - 22 * sc);
    ctx.lineTo(ox + 26 * sc, oy - 22 * sc);
    ctx.lineTo(ox + 26 * sc, oy - 50 * sc);
    ctx.lineTo(ox, oy - 50 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 19px sans-serif";
    ctx.fillText("Tampak Depan (X-Z)", ox + 20, oy - 50 * sc - 20);
    drawArrow(ctx, ox, oy + 28, ox + 60 * sc, oy + 28, "#dc2626", 2.5, 9, true);
    ctx.fillStyle = "#dc2626";
    ctx.fillText("L = 60 mm", ox + 65, oy + 52);

    // Gambar Tampak Samping (Y-Z)
    const sx0 = bx + 400;
    ctx.strokeStyle = "#059669";
    ctx.fillStyle = "rgba(5, 150, 105, 0.16)";
    ctx.fillRect(sx0, oy - 50 * sc, 40 * sc, 50 * sc);
    ctx.strokeRect(sx0, oy - 50 * sc, 40 * sc, 50 * sc);
    ctx.beginPath();
    ctx.moveTo(sx0, oy - 22 * sc);
    ctx.lineTo(sx0 + 40 * sc, oy - 22 * sc);
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.fillText("Tampak Samping (Y-Z)", sx0 - 10, oy - 50 * sc - 20);
    drawArrow(ctx, sx0, oy + 28, sx0 + 40 * sc, oy + 28, "#059669", 2.5, 9, true);
    ctx.fillStyle = "#059669";
    ctx.fillText("W = 40 mm", sx0 + 25, oy + 52);

    // Kanan: Konstruksi 3D Piktorial
    const p3D = subProgress(segProgress, 0.3, 0.92);
    const cfg = {
      originX: bx + 1090,
      originY: by + 650,
      alphaDeg: 30,
      betaDeg: 30,
      sx: 1,
      sy: 1,
      sz: 1,
      unitScale: 4.5,
      axisLength: 260
    };
    drawProjectionAxes(ctx, cfg, p3D, false);
    const tip = drawProjectedLBlock(ctx, cfg, p3D, true);
    pointerTarget = { x: tip.x, y: tip.y, isDrawing: p3D < 0.9 };
  } else if (phase === "iso_axes" || phase === "iso_complete") {
    ctx.fillText("1. PROYEKSI ISOMETRI (Sudut 30° & 30°, Skala 1 : 1 : 1)", bx + 45, by + 58);

    const cfg = {
      originX: bx + 530,
      originY: by + 640,
      alphaDeg: 30,
      betaDeg: 30,
      sx: 1,
      sy: 1,
      sz: 1,
      unitScale: 4.8,
      axisLength: 310
    };

    if (phase === "iso_axes") {
      const axisProg = subProgress(segProgress, 0.05, 0.65);
      const endPt = drawProjectionAxes(ctx, cfg, axisProg, true);

      // Lingkaran sudut 120° antar sumbu
      if (segProgress > 0.55) {
        drawBoardNoteCard(
          ctx,
          bx + 920,
          by + 120,
          540,
          280,
          "Ciri Geometri Sumbu Isometri",
          [
            "• Sumbu X miring α = 30° ke kiri-atas",
            "• Sumbu Y miring β = 30° ke kanan-atas",
            "• Sumbu Z tegak lurus vertikal (90°)",
            "• Sudut apit antar sumbu X-Y-Z = 120°",
            "• Ketiga bidang tampak sama jelas (Simetris)"
          ],
          "#2563eb",
          subProgress(segProgress, 0.55, 0.85)
        );
      }
      pointerTarget = endPt
        ? { x: endPt.x, y: endPt.y, isDrawing: axisProg < 0.95 }
        : { x: cfg.originX, y: cfg.originY, isDrawing: true };
    } else {
      drawProjectionAxes(ctx, cfg, 1, true);
      const drawProg = subProgress(segProgress, 0.05, 0.82);
      const tip = drawProjectedLBlock(ctx, cfg, drawProg, true);

      drawBoardNoteCard(
        ctx,
        bx + 920,
        by + 120,
        540,
        240,
        "Perhitungan Ukuran Proyeksi Isometri",
        [
          "• Rasio Skala Sumbu: X : Y : Z = 1 : 1 : 1",
          "• Sumbu X = 60 mm × 1 = 60 mm (Utuh)",
          "• Sumbu Y = 40 mm × 1 = 40 mm (Utuh)",
          "• Sumbu Z = 50 mm × 1 = 50 mm (Utuh)"
        ],
        "#2563eb",
        1
      );

      drawBoardNoteCard(
        ctx,
        bx + 920,
        by + 400,
        540,
        190,
        "Keunggulan & Catatan Teknis",
        [
          "• Tidak ada pemendekan ukuran gambar kerja",
          "• Langsung diukur memakai penggaris skala 1:1",
          "• Sudut 30° dibuat mudah dengan penggaris segitiga"
        ],
        "#0284c7",
        subProgress(segProgress, 0.4, 0.75)
      );

      pointerTarget = { x: tip.x, y: tip.y, isDrawing: drawProg < 0.85 };
    }
  } else if (phase === "dim_axes" || phase === "dim_complete") {
    ctx.fillText("2. PROYEKSI DIMETRI (Sudut 7° & 42°, Skala 1 : ½ : 1)", bx + 45, by + 58);

    const cfg = {
      originX: bx + 540,
      originY: by + 640,
      alphaDeg: 7,
      betaDeg: 42,
      sx: 1,
      sy: 0.5,
      sz: 1,
      unitScale: 4.8,
      axisLength: 310
    };

    if (phase === "dim_axes") {
      const axisProg = subProgress(segProgress, 0.05, 0.65);
      const endPt = drawProjectionAxes(ctx, cfg, axisProg, true);

      drawBoardNoteCard(
        ctx,
        bx + 920,
        by + 120,
        540,
        265,
        "Mengapa Memakai Proyeksi Dimetri?",
        [
          "• Menghindari garis berimpit pada kubus/balok",
          "• Sumbu X dibuat landai: α = 7°",
          "• Sumbu Y dibuat curam: β = 42°",
          "• Menonjolkan wajah depan benda kerja"
        ],
        "#059669",
        subProgress(segProgress, 0.35, 0.75)
      );

      pointerTarget = endPt
        ? { x: endPt.x, y: endPt.y, isDrawing: axisProg < 0.95 }
        : { x: cfg.originX, y: cfg.originY, isDrawing: true };
    } else {
      drawProjectionAxes(ctx, cfg, 1, true);
      const drawProg = subProgress(segProgress, 0.05, 0.82);
      const tip = drawProjectedLBlock(ctx, cfg, drawProg, true);

      drawBoardNoteCard(
        ctx,
        bx + 920,
        by + 120,
        540,
        245,
        "Perhitungan Ukuran Proyeksi Dimetri",
        [
          "• Rasio Skala Sumbu: X : Y : Z = 1 : ½ : 1",
          "• Sumbu X (7°)  = 60 mm × 1   = 60 mm",
          "• Sumbu Y (42°) = 40 mm × 0,5 = 20 mm (Diperpendek!)",
          "• Sumbu Z (90°) = 50 mm × 1   = 50 mm"
        ],
        "#059669",
        1
      );

      drawBoardNoteCard(
        ctx,
        bx + 920,
        by + 400,
        540,
        200,
        "Aturan Penting Angka Ukur (SNI / ISO)",
        [
          "• Panjang fisik garis Y digambar 20 mm di kertas",
          "• Namun angka ukuran tetap ditulis 40 mm asli",
          "• Proporsi kedalaman terlihat jauh lebih natural"
        ],
        "#047857",
        subProgress(segProgress, 0.4, 0.78)
      );

      pointerTarget = { x: tip.x, y: tip.y, isDrawing: drawProg < 0.85 };
    }
  } else if (phase === "oblique_complete") {
    ctx.fillText("3. PROYEKSI MIRING / OBLIQUE (Sudut 0° & 45°)", bx + 45, by + 58);

    // Kiri: Oblique Cavalier (Skala 1:1:1)
    const pCav = subProgress(segProgress, 0.05, 0.50);
    const cfgCav = {
      originX: bx + 420,
      originY: by + 630,
      alphaDeg: 0,
      betaDeg: 45,
      sx: 1,
      sy: 1.0,
      sz: 1,
      unitScale: 3.7,
      axisLength: 220
    };
    drawProjectionAxes(ctx, cfgCav, pCav, true);
    const tipCav = drawProjectedLBlock(ctx, cfgCav, pCav, true);

    drawBoardNoteCard(
      ctx,
      bx + 60,
      by + 100,
      640,
      160,
      "A. Oblique Cavalier (Skala 1 : 1 : 1)",
      [
        "• Sumbu X = 0° (Mendatar) | Sumbu Y = 45°",
        "• Kedalaman Y utuh 100% (W = 40 mm)",
        "• Tampak agak memanjang ke belakang"
      ],
      "#d97706",
      pCav
    );

    // Kanan: Oblique Cabinet (Skala 1:1/2:1)
    const pCab = subProgress(segProgress, 0.45, 0.92);
    const cfgCab = {
      originX: bx + 1140,
      originY: by + 630,
      alphaDeg: 0,
      betaDeg: 45,
      sx: 1,
      sy: 0.5,
      sz: 1,
      unitScale: 3.7,
      axisLength: 220
    };
    if (pCab > 0) {
      drawProjectionAxes(ctx, cfgCab, pCab, true);
      const tipCab = drawProjectedLBlock(ctx, cfgCab, pCab, true);
      drawBoardNoteCard(
        ctx,
        bx + 780,
        by + 100,
        660,
        160,
        "B. Oblique Cabinet (Skala 1 : ½ : 1) — Paling Umum",
        [
          "• Sumbu X = 0° (Siku-siku 90° dengan Z) | Sumbu Y = 45°",
          "• Kedalaman Y dikali ½: 40 mm × 0,5 = 20 mm",
          "• Bentuk tampak realistis & tidak mengalami distorsi"
        ],
        "#b45309",
        pCab
      );
      pointerTarget = { x: tipCab.x, y: tipCab.y, isDrawing: pCab < 0.9 };
    } else {
      pointerTarget = { x: tipCav.x, y: tipCav.y, isDrawing: true };
    }
  } else if (phase === "morph_iso_to_dim") {
    ctx.fillText("CARA MENGUBAH: PROYEKSI ISOMETRI ➔ PROYEKSI DIMETRI", bx + 45, by + 58);

    // Interpolasi mulus dari Isometri (30, 30, sy=1) ke Dimetri (7, 42, sy=0.5)
    const morphT = easeInOutCubic(subProgress(segProgress, 0.12, 0.85));
    const curAlpha = lerp(30, 7, morphT);
    const curBeta = lerp(30, 42, morphT);
    const curSy = lerp(1.0, 0.5, morphT);

    // Bayangan tipis posisi awal Isometri sebagai pembanding visual
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawProjectedLBlock(
      ctx,
      { originX: bx + 530, originY: by + 640, alphaDeg: 30, betaDeg: 30, sx: 1, sy: 1, sz: 1, unitScale: 4.8 },
      1,
      false
    );
    ctx.restore();

    const cfg = {
      originX: bx + 530,
      originY: by + 640,
      alphaDeg: curAlpha,
      betaDeg: curBeta,
      sx: 1,
      sy: curSy,
      sz: 1,
      unitScale: 4.8,
      axisLength: 310
    };
    const yAxisTip = drawProjectionAxes(ctx, cfg, 1, true);
    drawProjectedLBlock(ctx, cfg, 1, true);

    drawBoardNoteCard(
      ctx,
      bx + 900,
      by + 115,
      560,
      290,
      "3 Langkah Konversi Isometri → Dimetri",
      [
        `1. Rebahkan Sumbu X: 30° ➔ ${curAlpha.toFixed(0)}° (Target: 7°)`,
        `2. Naikkan Sumbu Y:  30° ➔ ${curBeta.toFixed(0)}° (Target: 42°)`,
        `3. Pangkas Skala Y:  1,0 ➔ ${curSy.toFixed(2)} (Target: 0,5)`,
        `• Ukuran Gambar Y:   40 mm ➔ ${Math.round(40 * curSy)} mm`,
        "• Ukuran Sumbu X (60 mm) & Z (50 mm) TETAP!"
      ],
      "#059669",
      1
    );

    // Indikator Bar Transformasi Real-Time
    drawBoardNoteCard(
      ctx,
      bx + 900,
      by + 440,
      560,
      195,
      "Rumus Konversi Koordinat Gambar",
      [
        "• X_baru = X_asli × 1,0  (sudut 7°)",
        "• Y_baru = Y_asli × 0,5  (sudut 42°)",
        "• Z_baru = Z_asli × 1,0  (vertikal 90°)"
      ],
      "#2563eb",
      1
    );

    pointerTarget = { x: yAxisTip.x, y: yAxisTip.y, isDrawing: morphT > 0.05 && morphT < 0.95 };
  } else if (phase === "morph_dim_to_obl") {
    ctx.fillText("CARA MENGUBAH: PROYEKSI DIMETRI ➔ PROYEKSI MIRING (CABINET)", bx + 45, by + 58);

    const morphT = easeInOutCubic(subProgress(segProgress, 0.12, 0.85));
    const curAlpha = lerp(7, 0, morphT);
    const curBeta = lerp(42, 45, morphT);

    // Bayangan tipis Dimetri
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawProjectedLBlock(
      ctx,
      { originX: bx + 530, originY: by + 640, alphaDeg: 7, betaDeg: 42, sx: 1, sy: 0.5, sz: 1, unitScale: 4.8 },
      1,
      false
    );
    ctx.restore();

    const cfg = {
      originX: bx + 530,
      originY: by + 640,
      alphaDeg: curAlpha,
      betaDeg: curBeta,
      sx: 1,
      sy: 0.5,
      sz: 1,
      unitScale: 4.8,
      axisLength: 310
    };
    const yAxisTip = drawProjectionAxes(ctx, cfg, 1, true);
    drawProjectedLBlock(ctx, cfg, 1, true);

    drawBoardNoteCard(
      ctx,
      bx + 900,
      by + 115,
      560,
      290,
      "3 Langkah Konversi Dimetri → Miring Cabinet",
      [
        `1. Ratakan Sumbu X: 7° ➔ ${curAlpha.toFixed(1)}° (Horizontal 0°)`,
        "   (Bidang depan X-Z menjadi siku-siku 90°)",
        `2. Geser Sumbu Y:   42° ➔ ${curBeta.toFixed(0)}° (Target: 45°)`,
        "3. Skala Sumbu Y:   Tetap ½ (W = 20 mm) untuk Cabinet",
        "   (Atau kalikan 2 menjadi 40 mm untuk Cavalier)"
      ],
      "#d97706",
      1
    );

    drawBoardNoteCard(
      ctx,
      bx + 900,
      by + 440,
      560,
      195,
      "Keuntungan Konversi ke Proyeksi Miring",
      [
        "• Lingkaran atau profil rumit di bidang depan (X-Z)",
        "  dapat digambar langsung memakai jangka biasa",
        "  tanpa berubah menjadi elips!"
      ],
      "#b45309",
      1
    );

    pointerTarget = { x: cfg.originX - 180, y: cfg.originY, isDrawing: morphT > 0.05 && morphT < 0.95 };
  } else if (phase === "final_comparison") {
    ctx.fillText("RINGKASAN & PERBANDINGAN LENGKAP 3 PROYEKSI PIKTORIAL", bx + 45, by + 58);

    // Tabel Perbandingan Lengkap di Bagian Atas Papan Tulis
    const tx = bx + 45;
    const ty = by + 90;
    const tw = 1420;
    const rowH = 54;
    const cols = [0, 310, 590, 880, 1140, 1420];
    const rows = [
      ["Jenis Proyeksi", "Sudut Sumbu X (α)", "Sudut Sumbu Y (β)", "Skala (X : Y : Z)", "Ukuran Gambar (L×W×H)"],
      ["1. Isometri", "30° (Naik Kiri)", "30° (Naik Kanan)", "1 : 1 : 1", "60 × 40 × 50 mm"],
      ["2. Dimetri", "7° (Landai)", "42° (Curam)", "1 : ½ : 1", "60 × 20 × 50 mm"],
      ["3. Miring (Cabinet)", "0° (Mendatar Siku)", "45° (Miring)", "1 : ½ : 1", "60 × 20 × 50 mm"],
      ["4. Miring (Cavalier)", "0° (Mendatar Siku)", "45° (Miring)", "1 : 1 : 1", "60 × 40 × 50 mm"]
    ];

    rows.forEach((r, rIdx) => {
      const yPos = ty + rIdx * rowH;
      ctx.fillStyle = rIdx === 0 ? "#1e3a8a" : rIdx % 2 === 1 ? "#eff6ff" : "#ffffff";
      ctx.fillRect(tx, yPos, tw, rowH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, yPos, tw, rowH);

      ctx.fillStyle = rIdx === 0 ? "#ffffff" : "#0f172a";
      ctx.font = rIdx === 0 ? "bold 19px sans-serif" : "bold 18px sans-serif";
      r.forEach((cellText, cIdx) => {
        ctx.fillText(cellText, tx + cols[cIdx] + 16, yPos + 34);
      });
    });

    // Tiga Ilustrasi Berdampingan di Bawah Tabel
    const models = [
      { label: "ISOMETRI (30°/30°, 1:1:1)", ox: bx + 270, oy: by + 695, a: 30, b: 30, sy: 1.0, col: "#2563eb" },
      { label: "DIMETRI (7°/42°, 1:½:1)", ox: bx + 770, oy: by + 695, a: 7, b: 42, sy: 0.5, col: "#059669" },
      { label: "MIRING CABINET (0°/45°, 1:½:1)", ox: bx + 1270, oy: by + 695, a: 0, b: 45, sy: 0.5, col: "#d97706" }
    ];

    models.forEach((m) => {
      const cfg = {
        originX: m.ox,
        originY: m.oy,
        alphaDeg: m.a,
        betaDeg: m.b,
        sx: 1,
        sy: m.sy,
        sz: 1,
        unitScale: 2.9,
        axisLength: 165
      };
      drawProjectionAxes(ctx, cfg, 1, false);
      drawProjectedLBlock(ctx, cfg, 1, false);

      ctx.fillStyle = m.col;
      ctx.font = "bold 19px sans-serif";
      ctx.fillText(m.label, m.ox - 135, m.oy + 70);
    });

    // Tunjuk bergantian ke ketiga model
    const idx = Math.min(2, Math.floor(segProgress * 3));
    pointerTarget = {
      x: models[idx].ox,
      y: models[idx].oy - 60 + Math.sin(globalTime * 3) * 12,
      isDrawing: false
    };
  }

  ctx.restore();
  return pointerTarget;
}

// ============================================================================
// PENGGAMBARAN INSTRUKTUR MANUSIA DENGAN KINEMATIKA NYATA (BERNAPAS, JALAN,
// MENOLEH, KEDIP MATA, LIP-SYNC SUARA, DAN IK TANGAN MENGGAMBAR/MENUNJUK)
// ============================================================================
function drawAnimatedInstructor(ctx, globalTime, isSpeaking, pointerTarget) {
  ctx.save();

  // Posisi berdiri dinamis: instruktur bergeser sedikit mendekati area papan tulis yang sedang aktif
  const targetStandX = clamp(pointerTarget.x - 270, 175, 315);
  const standX = lerp(225, targetStandX, 0.65) + Math.sin(globalTime * 1.1) * 6;
  const breathY = Math.sin(globalTime * 2.4) * 3.5;
  const floorY = 980;

  // Bayangan kaki di lantai
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(standX, floorY + 6, 72, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- KAKI & SEPATU ---
  const hipX = standX;
  const hipY = 740 + breathY * 0.5;
  const stepSwing = Math.sin(globalTime * 1.1) * 5;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Kaki Kiri
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.moveTo(hipX - 20, hipY);
  ctx.lineTo(hipX - 26 - stepSwing * 0.4, 860);
  ctx.lineTo(hipX - 24 - stepSwing, floorY - 10);
  ctx.stroke();

  // Kaki Kanan
  ctx.strokeStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(hipX + 20, hipY);
  ctx.lineTo(hipX + 26 + stepSwing * 0.4, 860);
  ctx.lineTo(hipX + 24 + stepSwing, floorY - 10);
  ctx.stroke();

  // Sepatu Kulit Cokelat Tua
  ctx.fillStyle = "#451a03";
  drawRoundedRect(ctx, hipX - 46 - stepSwing, floorY - 18, 46, 22, 8);
  ctx.fill();
  drawRoundedRect(ctx, hipX + 6 + stepSwing, floorY - 18, 48, 22, 8);
  ctx.fill();

  // --- BADAN / TORSO (Kemeja Teknik Biru Muda + Rompi/Jas Instruktur Navy) ---
  const torsoTopY = 535 + breathY;
  const torsoBottomY = hipY + 10;

  // Kemeja Dalam
  ctx.fillStyle = "#e0f2fe";
  drawRoundedRect(ctx, hipX - 54, torsoTopY, 108, torsoBottomY - torsoTopY, 26);
  ctx.fill();

  // Dasi Merah Marun Teknik
  ctx.fillStyle = "#b91c1c";
  ctx.beginPath();
  ctx.moveTo(hipX, torsoTopY + 12);
  ctx.lineTo(hipX + 11, torsoTopY + 95);
  ctx.lineTo(hipX, torsoTopY + 125);
  ctx.lineTo(hipX - 9, torsoTopY + 95);
  ctx.closePath();
  ctx.fill();

  // Jas / Blazer Instruktur
  ctx.fillStyle = "#1e3a8a";
  // Sisi kiri jas
  drawRoundedRect(ctx, hipX - 58, torsoTopY + 4, 42, torsoBottomY - torsoTopY - 4, 16);
  ctx.fill();
  // Sisi kanan jas
  drawRoundedRect(ctx, hipX + 16, torsoTopY + 4, 42, torsoBottomY - torsoTopY - 4, 16);
  ctx.fill();

  // Sabuk
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(hipX - 52, torsoBottomY - 16, 104, 12);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(hipX - 10, torsoBottomY - 17, 20, 14);

  // --- LENGAN KIRI (Gestur Menjelaskan / Memegang Penggaris Segitiga Teknik) ---
  const leftShoulderX = hipX - 50;
  const leftShoulderY = torsoTopY + 26;
  const gestureWave = isSpeaking ? Math.sin(globalTime * 5.2) * 18 : Math.sin(globalTime * 1.8) * 6;
  const leftHandTargetX = hipX - 88 + Math.cos(globalTime * 2.5) * 10;
  const leftHandTargetY = torsoTopY + 105 + gestureWave;

  const leftArm = solveArmIK(leftShoulderX, leftShoulderY, leftHandTargetX, leftHandTargetY, 78, 74, 1);

  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(leftShoulderX, leftShoulderY);
  ctx.lineTo(leftArm.elbowX, leftArm.elbowY);
  ctx.lineTo(leftArm.handX, leftArm.handY);
  ctx.stroke();

  // Tangan Kiri & Penggaris Segitiga 30°-60°
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(leftArm.handX, leftArm.handY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Penggaris Segitiga Kuning Transparan di Tangan Kiri
  ctx.save();
  ctx.translate(leftArm.handX - 8, leftArm.handY + 6);
  ctx.rotate(-0.35 + gestureWave * 0.004);
  ctx.fillStyle = "rgba(250, 204, 21, 0.78)";
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-68, 38);
  ctx.lineTo(0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // --- KEPALA, WAJAH EKSPRESIF & LIP-SYNC ---
  const neckX = hipX;
  const neckY = torsoTopY - 8;

  // Leher
  ctx.fillStyle = "#e0ac69";
  ctx.fillRect(neckX - 14, neckY - 20, 28, 28);

  const headCenterX = neckX + 4;
  const headCenterY = neckY - 58;
  // Sedikit anggukan kepala mengikuti irama bicara dan arah papan tulis
  const lookAngle = clamp((pointerTarget.y - headCenterY) * 0.00035, -0.12, 0.12) +
    (isSpeaking ? Math.sin(globalTime * 6.0) * 0.03 : 0);

  ctx.save();
  ctx.translate(headCenterX, headCenterY);
  ctx.rotate(lookAngle);

  // Wajah Oval
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Telinga
  ctx.beginPath();
  ctx.arc(-40, 4, 10, 0, Math.PI * 2);
  ctx.fill();

  // Rambut Rapi Profesional
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, -14, 44, Math.PI * 0.92, Math.PI * 2.08);
  ctx.lineTo(36, -4);
  ctx.quadraticCurveTo(10, -32, -36, -12);
  ctx.closePath();
  ctx.fill();

  // Alis Ekspresif
  const browLift = isSpeaking ? Math.sin(globalTime * 4.5) * 2.5 : 0;
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-14, -14 - browLift);
  ctx.lineTo(-2, -16 - browLift);
  ctx.moveTo(12, -16 - browLift);
  ctx.lineTo(26, -13 - browLift);
  ctx.stroke();

  // Mata + Kedipan Alami (Berkedip setiap ~3.8 detik)
  const blinkCycle = globalTime % 3.8;
  const isBlinking = blinkCycle > 3.62;
  const eyeLookX = clamp((pointerTarget.x - headCenterX) * 0.004, 1, 5);
  const eyeLookY = clamp((pointerTarget.y - headCenterY) * 0.004, -3, 3);

  if (isBlinking) {
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-1, -4);
    ctx.moveTo(12, -4);
    ctx.lineTo(25, -4);
    ctx.stroke();
  } else {
    // Bola mata putih
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-7, -4, 7.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(18, -4, 7.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil melirik ke arah objek papan tulis
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-7 + eyeLookX, -4 + eyeLookY, 3.3, 0, Math.PI * 2);
    ctx.arc(18 + eyeLookX, -4 + eyeLookY, 3.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kacamata Frame Tipis Modern (Khas Dosen/Instruktur Teknik)
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, -18, -12, 22, 16, 4);
  ctx.stroke();
  drawRoundedRect(ctx, 8, -12, 22, 16, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -5);
  ctx.lineTo(8, -5);
  ctx.moveTo(-18, -5);
  ctx.lineTo(-36, -2);
  ctx.stroke();

  // Hidung
  ctx.strokeStyle = "#c68642";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.lineTo(11, 10);
  ctx.lineTo(4, 12);
  ctx.stroke();

  // Mulut Lip-Sync (Sinkron dengan Suara Narasi)
  const mouthOpen = isSpeaking
    ? Math.abs(Math.sin(globalTime * 11.5)) * 7.5 + Math.abs(Math.cos(globalTime * 7.3)) * 4.0
    : 1.2;

  ctx.fillStyle = "#7f1d1d";
  ctx.beginPath();
  ctx.ellipse(6, 25, 11, Math.max(2, mouthOpen), 0, 0, Math.PI * 2);
  ctx.fill();

  if (mouthOpen > 4) {
    // Gigi atas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, 20, 16, 4);
  }

  ctx.restore(); // Selesai transformasi kepala

  // --- LENGAN KANAN + TANGAN + TONGKAT PENUNJUK / SPIDOL (IK AKTIF KE PAPAN TULIS) ---
  const rightShoulderX = hipX + 46;
  const rightShoulderY = torsoTopY + 26;

  // Hitung titik tangan kanan agar mengarah ke target di papan tulis, lalu tongkat penunjuk menjangkau titik tepat di papan
  const dxBoard = pointerTarget.x - rightShoulderX;
  const dyBoard = pointerTarget.y - rightShoulderY;
  const angleToBoard = Math.atan2(dyBoard, dxBoard);
  const maxHandReach = 148;
  const distToBoard = Math.hypot(dxBoard, dyBoard);

  // Jarak ujung tangan kanan
  const handReachDist = Math.min(maxHandReach, distToBoard * 0.45);
  const handTargetX = rightShoulderX + Math.cos(angleToBoard) * handReachDist;
  const handTargetY = rightShoulderY + Math.sin(angleToBoard) * handReachDist +
    (pointerTarget.isDrawing ? Math.sin(globalTime * 18) * 3 : 0);

  const rightArm = solveArmIK(rightShoulderX, rightShoulderY, handTargetX, handTargetY, 82, 78, 1);

  // Gambar Lengan Kanan (Bahu -> Siku -> Pergelangan Tangan)
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(rightShoulderX, rightShoulderY);
  ctx.lineTo(rightArm.elbowX, rightArm.elbowY);
  ctx.lineTo(rightArm.handX, rightArm.handY);
  ctx.stroke();

  // Manset Putih Kemeja di Pergelangan
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(rightArm.handX, rightArm.handY, 13, 0, Math.PI * 2);
  ctx.fill();

  // Tongkat Penunjuk Teleskopik / Spidol Teknik yang Menyentuh Titik Aktif di Papan Tulis
  const tipX = pointerTarget.x;
  const tipY = pointerTarget.y;

  // Batang penunjuk metalik dari tangan kanan ke titik papan tulis
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(rightArm.handX, rightArm.handY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Ujung Penunjuk Berkilau (Merah menyala saat menggambar/menunjuk)
  ctx.fillStyle = pointerTarget.isDrawing ? "#ef4444" : "#f59e0b";
  ctx.beginPath();
  ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 14 + Math.sin(globalTime * 10) * 3, 0, Math.PI * 2);
  ctx.stroke();

  // Telapak Tangan Kanan Memegang Penunjuk
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(rightArm.handX, rightArm.handY, 11.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ============================================================================
// CAPTION RINGKAS & TIDAK BERLEBIHAN (HANYA SATU BARIS PENDEK SAAT BICARA,
// TANPA TEKS BANNER ATAS MAUPUN BAWAH)
// ============================================================================
function drawMinimalCaption(ctx, narrationText, voiceProgress, isSpeaking) {
  if (!isSpeaking || !narrationText) return;

  const words = narrationText.trim().split(/\s+/);
  const chunkSize = 7; // Maksimal 7 kata per potongan agar ringkas & tidak berlebihan
  const totalChunks = Math.ceil(words.length / chunkSize);
  const chunkIdx = clamp(Math.floor(voiceProgress * totalChunks), 0, totalChunks - 1);
  const activePhrase = words.slice(chunkIdx * chunkSize, (chunkIdx + 1) * chunkSize).join(" ");

  ctx.save();
  ctx.font = "600 22px sans-serif";
  const textWidth = ctx.measureText(activePhrase).width;
  const pillW = textWidth + 44;
  const pillH = 44;
  const pillX = 340 + (1510 - pillW) / 2;
  const pillY = 930; // Di area lantai bawah papan tulis, bersih dan tidak menutupi gambar

  ctx.fillStyle = "rgba(15, 23, 42, 0.76)";
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 22);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(activePhrase, pillX + pillW / 2, pillY + pillH / 2 + 1);
  ctx.restore();
}

// ============================================================================
// PIPELINE RENDER UTAMA (STREAMING RGBA BUFFER KE FFMPEG)
// ============================================================================
async function main() {
  const { timeline, totalDuration, masterAudioPath } = await prepareAudioAndTimeline();
  const totalFrames = Math.ceil(totalDuration * FPS);

  console.log(`=== [2/3] Merender ${totalFrames} Frame Video (1920x1080 @ ${FPS}fps) ===`);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Jalankan proses FFmpeg penerima rawvideo RGBA + master audio WAV (TANPA atempo=1.18)
  const ffmpegArgs = [
    "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", `${WIDTH}x${HEIGHT}`,
    "-r", String(FPS),
    "-i", "-",
    "-i", masterAudioPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_FILE
  ];

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "ignore", "pipe"]
  });

  let ffmpegErrLog = "";
  ffmpegProc.stderr.on("data", (chunk) => {
    ffmpegErrLog += chunk.toString();
  });

  let segIdx = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame / FPS;

    while (segIdx < timeline.length - 1 && currentTime >= timeline[segIdx].endTime) {
      segIdx++;
    }

    const activeSeg = timeline[segIdx];
    const localTime = Math.max(0, currentTime - activeSeg.startTime);
    const segProgress = clamp(localTime / activeSeg.duration, 0, 1);
    const isSpeaking = localTime <= activeSeg.voiceDuration;
    const voiceProgress = clamp(localTime / Math.max(0.1, activeSeg.voiceDuration), 0, 1);

    // 1. Gambar Studio & Papan Tulis
    drawStudioAndWhiteboardShell(ctx);

    // 2. Gambar Ilustrasi Geometri Proyeksi di Papan Tulis & dapatkan titik fokus tangan
    const pointerTarget = renderWhiteboardContent(ctx, activeSeg.boardPhase, segProgress, currentTime);

    // 3. Gambar Instruktur Animasi dengan Kinematika Lengan & Lip-Sync
    drawAnimatedInstructor(ctx, currentTime, isSpeaking, pointerTarget);

    // 4. Gambar Caption Singkat (7 kata per frasa, tanpa teks atas/bawah yang berlebihan)
    drawMinimalCaption(ctx, activeSeg.narration, voiceProgress, isSpeaking);

    // Ambil buffer RGBA murni dari @napi-rs/canvas atau fallback getImageData
    const rawBuffer =
      typeof canvas.data === "function"
        ? canvas.data()
        : Buffer.from(ctx.getImageData(0, 0, WIDTH, HEIGHT).data.buffer);

    const canWrite = ffmpegProc.stdin.write(rawBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpegProc.stdin.once("drain", resolve));
    }

    if (frame % (FPS * 15) === 0 || frame === totalFrames - 1) {
      const pct = (((frame + 1) / totalFrames) * 100).toFixed(1);
      console.log(`Progres Render: ${pct}% (${(frame / FPS).toFixed(0)}s / ${totalDuration.toFixed(0)}s)`);
    }
  }

  ffmpegProc.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpegProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg keluar dengan kode ${code}:\n${ffmpegErrLog.slice(-600)}`));
    });
  });

  // Bersihkan file sementara
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (e) {
    // Abaikan jika gagal hapus folder temp
  }

  console.log(`=== [3/3] Selesai! Video tersimpan di: ${OUTPUT_FILE} ===`);
}

main().catch((err) => {
  console.error("Gagal merender video:", err);
  process.exit(1);
});
```
