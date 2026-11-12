```javascript
/**
 * ============================================================================
 * JOULE THIEF 3D ANIMATION & EDUCATIONAL RENDER ENGINE (render.js)
 * ============================================================================
 * Resolusi: 1920x1080 (Full HD 60/30 FPS)
 * Durasi Target: ~3 Menit 20 Detik (200 Detik)
 * Karakter Utama: Udin (17 Tahun, Siswa SMA Indonesia, Kreator Edukasi)
 * Suara: id_andrew_studio (Pria Hangat & Natural)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

const VOICE_MODEL = "id_andrew_studio";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const OUTPUT_VIDEO = path.resolve('./output.mp4');
const TEMP_DIR = path.resolve('./temp_joule_thief_audio');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// 1. NASKAH LENGKAP & PEMBAGIAN ADEGAN (~3 MENIT)
// ============================================================================
const SCENES = [
  {
    id: 1,
    name: "Adegan 1: Hook & Masalah Baterai Bekas",
    targetDuration: 30,
    narration: "Punya baterai bekas di rumah yang udah nggak kuat nyalain jam dinding? Jangan buru-buru dibuang! Liat nih, tegangan baterai ini cuma sisa nol koma delapan lima Volt. Buat nyalain satu lampu L E D yang butuh minimal tiga Volt aja, dia udah nyerah total. Tapi, dengan rangkaian legendaris bernama Joule Thief, alias si pencuri energi, kita bisa peras sisa tenaga baterai ini sampai tetes terakhir. Yuk, kita rakit!"
  },
  {
    id: 2,
    name: "Adegan 2: Pengenalan Bahan & Komponen 3D",
    targetDuration: 28,
    narration: "Bahannya simpel banget dan gampang dicari. Pertama, inti ferit bentuk donat alias toroid. Kedua, dua utas kawat tembaga, di sini gue bedain warna merah dan biru biar gampang liatnya. Ketiga, transistor N P N tipe dua N dua dua dua dua. Keempat, resistor satu kilo Ohm dengan gelang cokelat, hitam, merah, dan emas. Kelima, lampu L E D lima milimeter tiga Volt. Dan terakhir, baterai A A bekas tadi."
  },
  {
    id: 3,
    name: "Adegan 3: Proses Perakitan 3D & Penyolderan",
    targetDuration: 58,
    narration: "Cara rakitnya gampang. Lilitkan kawat merah dan biru barengan secara bifilar ke inti ferit sekitar sepuluh lilitan rapi. Nah, perhatiin bagian penting ini: ambil ujung awal kawat merah dan ujung akhir kawat biru, lalu pelintir jadi satu. Ini bakal jadi jalur positif baterai. Lanjut, sisa ujung kawat biru kita sambungin ke resistor satu kilo Ohm, terus masuk ke kaki tengah transistor alias Basis. Sisa ujung kawat merah masuk ke kaki kanan transistor alias Kolektor. Terakhir, pasang kaki panjang positif L E D ke Kolektor, dan kaki pendek negatif L E D barengan sama kaki kiri Emitor transistor ke jalur negatif baterai. Solder semua titik sambungannya sampai timah mengkilap biar kuat dan arus mengalir sempurna."
  },
  {
    id: 4,
    name: "Adegan 4: Uji Coba Mode Gelap & Cara Kerja X-Ray",
    targetDuration: 64,
    narration: "Sekarang kita matiin lampu kamar, dan pasang baterainya. Boom! Nyala terang banget kan? Kok bisa tegangan nol koma delapan lima Volt nyalain L E D tiga Volt? Mari kita intip ke dalam rangkaiannya lewat mode X-Ray! Jadi gini, saat baterai dipasang, arus kecil ngalir lewat resistor ke Basis dan bikin gerbang transistor kebuka sedikit. Arus pun ngalir lewat kawat merah ke Kolektor dan nyiptain medan magnet biru yang membesar di donat ferit. Nah, medan magnet ini menginduksi kawat biru dengan arah berlawanan dan nutup gerbang Basis transistor secara mendadak! Karena arusnya putus tiba-tiba, medan magnet di toroid langsung runtuh seketika dan nembakin lonjakan tegangan tinggi melewati L E D hingga menyala terang. Proses buka tutup sakelar otomatis ini terjadi puluhan ribu kali dalam sedetik. Mata kita nggak bisa liat kedipannya, jadi L E D kelihatan nyala stabil terus-menerus!"
  },
  {
    id: 5,
    name: "Adegan 5: Penutup & Kesimpulan Eksperimen",
    targetDuration: 22,
    narration: "Keren banget kan? Dari barang-barang bekas yang kelihatan udah nggak berguna, ternyata masih bisa dimanfaatin maksimal pakai prinsip fisika induksi magnetik dan elektronika dasar. Selamat mencoba di rumah, dan jangan lupa selalu hati-hati pas pakai solder panas. Gue Udin, sampai ketemu di eksperimen seru berikutnya!"
  }
];

// ============================================================================
// 2. UTILITAS MATEMATIKA, INTERPOLASI & PROYEKSI 3D PBR/STYLIZED
// ============================================================================
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOutBack = (x) => {
  const t = clamp(x, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOutCubic = (x) => {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

class Camera3D {
  constructor() {
    this.pos = { x: 0, y: 120, z: -480 };
    this.target = { x: 0, y: 80, z: 0 };
    this.fov = 720;
    this.roll = 0;
  }

  setPose(px, py, pz, tx, ty, tz, fov = 720, roll = 0) {
    this.pos.x = px; this.pos.y = py; this.pos.z = pz;
    this.target.x = tx; this.target.y = ty; this.target.z = tz;
    this.fov = fov;
    this.roll = roll;
  }

  project(x, y, z) {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dz = this.target.z - this.pos.z;
    const lenF = Math.hypot(dx, dy, dz) || 1;
    const fx = dx / lenF, fy = dy / lenF, fz = dz / lenF;

    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(fy) > 0.99) { ux = 0; uy = 0; uz = 1; }

    let rx = uy * fz - uz * fy;
    let ry = uz * fx - ux * fz;
    let rz = ux * fy - uy * fx;
    const lenR = Math.hypot(rx, ry, rz) || 1;
    rx /= lenR; ry /= lenR; rz /= lenR;

    const tux = fy * rz - fz * ry;
    const tuy = fz * rx - fx * rz;
    const tuz = fx * ry - fy * rx;

    const vx = x - this.pos.x;
    const vy = y - this.pos.y;
    const vz = z - this.pos.z;

    let cx = vx * rx + vy * ry + vz * rz;
    let cy = vx * tux + vy * tuy + vz * tuz;
    const cz = vx * fx + vy * fy + vz * fz;

    if (this.roll !== 0) {
      const c = Math.cos(this.roll);
      const s = Math.sin(this.roll);
      const ncx = cx * c - cy * s;
      const ncy = cx * s + cy * c;
      cx = ncx; cy = ncy;
    }

    const safeZ = Math.max(15, cz);
    const scale = this.fov / safeZ;
    return {
      x: WIDTH * 0.5 + cx * scale,
      y: HEIGHT * 0.5 - cy * scale,
      z: cz,
      scale: scale,
      visible: cz > 15
    };
  }
}

// ============================================================================
// 3. HELPER GAMBAR 2D/3D STYLIZED (SILINDER, KAPSUL, TEKS MELAYANG)
// ============================================================================
function drawCapsule3D(ctx, cam, p1, p2, radius3D, colorMain, colorHighlight, colorShadow) {
  const a = cam.project(p1.x, p1.y, p1.z);
  const b = cam.project(p2.x, p2.y, p2.z);
  if (!a.visible && !b.visible) return;

  const rA = Math.max(1.5, radius3D * a.scale);
  const rB = Math.max(1.5, radius3D * b.scale);
  const rAvg = (rA + rB) * 0.5;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.save();
  const grad = ctx.createLinearGradient(
    (a.x + b.x) * 0.5 - nx * rAvg,
    (a.y + b.y) * 0.5 - ny * rAvg,
    (a.x + b.x) * 0.5 + nx * rAvg,
    (a.y + b.y) * 0.5 + ny * rAvg
  );
  grad.addColorStop(0, colorHighlight || colorMain);
  grad.addColorStop(0.45, colorMain);
  grad.addColorStop(1, colorShadow || colorMain);

  ctx.strokeStyle = grad;
  ctx.lineWidth = rAvg * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawSphere3D(ctx, cam, center, radius3D, colorCore, colorEdge, glowColor = null, glowAlpha = 0) {
  const p = cam.project(center.x, center.y, center.z);
  if (!p.visible) return p;
  const r = Math.max(1.5, radius3D * p.scale);

  ctx.save();
  if (glowColor && glowAlpha > 0.01) {
    const gRad = r * 3.8;
    const glow = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, gRad);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.globalAlpha = clamp(glowAlpha, 0, 1);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, gRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const grad = ctx.createRadialGradient(p.x - r * 0.32, p.y - r * 0.32, r * 0.1, p.x, p.y, r);
  grad.addColorStop(0, colorCore);
  grad.addColorStop(1, colorEdge);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return p;
}

function drawPolygon3D(ctx, cam, pts3D, fillStyle, strokeStyle = null, lineWidth = 1.5) {
  const proj = pts3D.map(pt => cam.project(pt.x, pt.y, pt.z));
  if (proj.every(p => !p.visible)) return;

  ctx.save();
  ctx.beginPath();
  proj.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFloatingLabel3D(ctx, cam, pos3D, text, subtext = "", accentColor = "#38bdf8", alpha = 1, offset2D = { x: 0, y: -42 }) {
  if (alpha <= 0.01) return;
  const p = cam.project(pos3D.x, pos3D.y, pos3D.z);
  if (!p.visible) return;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);

  const bx = p.x + offset2D.x;
  const by = p.y + offset2D.y;

  // Garis penunjuk (callout line)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(bx, by + 12);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "bold 18px sans-serif";
  const w1 = ctx.measureText(text).width;
  ctx.font = "14px sans-serif";
  const w2 = subtext ? ctx.measureText(subtext).width : 0;
  const boxW = Math.max(w1, w2) + 28;
  const boxH = subtext ? 52 : 34;

  const rx = bx - boxW * 0.5;
  const ry = by - boxH;

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rx, ry, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx, ry + (subtext ? 18 : 17));

  if (subtext) {
    ctx.fillStyle = accentColor;
    ctx.font = "600 13px sans-serif";
    ctx.fillText(subtext, bx, ry + 38);
  }
  ctx.restore();
}

// ============================================================================
// 4. LINGKUNGAN 3D: KAMAR REMAJA, JENDELA SORE, RAK BUKU & MEJA WORKBENCH
// ============================================================================
function renderEnvironment3D(ctx, cam, state) {
  const { darkMode, ledGlow, time } = state;
  const darkFactor = clamp(darkMode, 0, 1);

  // 1. Dinding Kamar (Gradasi hangat sore vs biru gelap malam/mode uji)
  const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (darkFactor < 0.5) {
    wallGrad.addColorStop(0, "#2c221e");
    wallGrad.addColorStop(0.55, "#433228");
    wallGrad.addColorStop(1, "#1e1612");
  } else {
    wallGrad.addColorStop(0, "#070b14");
    wallGrad.addColorStop(0.55, "#0f172a");
    wallGrad.addColorStop(1, "#05080f");
  }
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Interpolasi overlay gelap saat lampu kamar dimatikan
  if (darkFactor > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(6, 10, 22, ${darkFactor * 0.72})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  // 2. Elemen Latar Belakang (Hanya tampak jelas saat kamera tidak full top-down)
  const camPitch = (cam.pos.y - cam.target.y) / Math.hypot(cam.pos.x - cam.target.x, cam.pos.y - cam.target.y, cam.pos.z - cam.target.z);
  const bgVisibility = clamp(1 - (camPitch - 0.55) * 2.5, 0, 1);

  if (bgVisibility > 0.02) {
    ctx.save();
    ctx.globalAlpha = bgVisibility;

    // A. Jendela Kamar di Kiri Belakang (Cahaya Matahari Sore / Golden Hour)
    const winX = 110, winY = 70, winW = 310, winH = 420;
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    if (darkFactor < 0.6) {
      skyGrad.addColorStop(0, "#f97316");
      skyGrad.addColorStop(0.5, "#fb923c");
      skyGrad.addColorStop(1, "#fde047");
    } else {
      skyGrad.addColorStop(0, "#1e1b4b");
      skyGrad.addColorStop(0.6, "#312e81");
      skyGrad.addColorStop(1, "#7c2d12");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    // Matahari sore & siluet pohon luar jendela
    ctx.fillStyle = darkFactor < 0.6 ? "rgba(254, 240, 138, 0.85)" : "rgba(251, 146, 60, 0.35)";
    ctx.beginPath();
    ctx.arc(winX + 210, winY + 260, 52, 0, Math.PI * 2);
    ctx.fill();

    // Kusen Jendela Kayu
    ctx.strokeStyle = "#271c15";
    ctx.lineWidth = 14;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.beginPath();
    ctx.moveTo(winX + winW * 0.5, winY);
    ctx.lineTo(winX + winW * 0.5, winY + winH);
    ctx.moveTo(winX, winY + winH * 0.5);
    ctx.lineTo(winX + winW, winY + winH * 0.5);
    ctx.stroke();

    // Sinar Golden Hour (Volumetric Sunbeams) masuk dari jendela
    const sunBeamAlpha = lerp(0.22, 0.05, darkFactor);
    const beamGrad = ctx.createLinearGradient(winX + winW, winY + 100, WIDTH * 0.65, HEIGHT * 0.85);
    beamGrad.addColorStop(0, `rgba(253, 186, 116, ${sunBeamAlpha})`);
    beamGrad.addColorStop(1, "rgba(253, 186, 116, 0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(winX + winW, winY);
    ctx.lineTo(WIDTH * 0.72, HEIGHT * 0.65);
    ctx.lineTo(WIDTH * 0.45, HEIGHT);
    ctx.lineTo(winX, winY + winH);
    ctx.closePath();
    ctx.fill();

    // B. Poster Skema Elektronika di Dinding Tengah-Kiri
    const postX = 480, postY = 85, postW = 240, postH = 310;
    ctx.fillStyle = darkFactor > 0.5 ? "#0f2942" : "#1e3a8a";
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 3;
    ctx.fillRect(postX, postY, postW, postH);
    ctx.strokeRect(postX, postY, postW, postH);

    // Grid & Gambar Skema pada Poster
    ctx.strokeStyle = "rgba(147, 197, 253, 0.35)";
    ctx.lineWidth = 1;
    for (let gx = postX + 20; gx < postX + postW; gx += 25) {
      ctx.beginPath(); ctx.moveTo(gx, postY + 10); ctx.lineTo(gx, postY + postH - 10); ctx.stroke();
    }
    for (let gy = postY + 20; gy < postY + postH; gy += 25) {
      ctx.beginPath(); ctx.moveTo(postX + 10, gy); ctx.lineTo(postX + postW - 10, gy); ctx.stroke();
    }
    ctx.fillStyle = "#e0f2fe";
    ctx.font = "bold 15px monospace";
    ctx.fillText("JOULE THIEF SCHEMATIC", postX + 22, postY + 34);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(postX + 40, postY + 75, 160, 110);
    ctx.beginPath();
    ctx.arc(postX + 120, postY + 235, 32, 0, Math.PI * 2);
    ctx.stroke();

    // C. Rak Buku Pelajaran SMA & Kotak Komponen di Kanan Belakang
    const shelfX = 1410, shelfY = 75, shelfW = 390, shelfH = 430;
    ctx.fillStyle = darkFactor > 0.5 ? "#1c130e" : "#3e2723";
    ctx.fillRect(shelfX, shelfY, shelfW, shelfH);
    ctx.strokeStyle = "#271815";
    ctx.lineWidth = 10;
    ctx.strokeRect(shelfX, shelfY, shelfW, shelfH);

    // Sekat Rak
    for (let sy of [shelfY + 140, shelfY + 280]) {
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(shelfX + 5, sy, shelfW - 10, 14);
    }

    // Buku-buku SMA (Fisika, Matematika, Elektronika Dasar)
    const books = [
      { x: shelfX + 24, y: shelfY + 25, w: 34, h: 115, c: "#ef4444", t: "FISIKA XII" },
      { x: shelfX + 62, y: shelfY + 32, w: 30, h: 108, c: "#3b82f6", t: "KIMIA" },
      { x: shelfX + 96, y: shelfY + 20, w: 38, h: 120, c: "#10b981", t: "ELEKTRONIKA" },
      { x: shelfX + 138, y: shelfY + 36, w: 28, h: 104, c: "#f59e0b", t: "MATEMATIKA" },
      { x: shelfX + 170, y: shelfY + 28, w: 34, h: 112, c: "#8b5cf6", t: "PRAKARYA" }
    ];
    books.forEach(b => {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(b.x + 4, b.y + 12, b.w - 8, 6);
    });

    // Kotak Laci Komponen (Component Drawer) di Rak Tengah
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const bx = shelfX + 220 + c * 38;
        const by = shelfY + 60 + r * 38;
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(bx, by, 34, 32);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(bx + 8, by + 12, 18, 6);
      }
    }

    // Trofi / Pajangan Robot Mini di Rak Kedua
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(shelfX + 80, shelfY + 215, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(shelfX + 62, shelfY + 240, 36, 40);

    ctx.restore();
  }

  // 3. Permukaan Meja Kayu 3D (Workbench)
  const deskY = 0;
  const deskCorners = [
    { x: -780, y: deskY, z: -260 },
    { x: 780, y: deskY, z: -260 },
    { x: 780, y: deskY, z: 380 },
    { x: -780, y: deskY, z: 380 }
  ];
  const deskColor = darkFactor > 0.5 ? "#231710" : "#5c3a21";
  const deskStroke = darkFactor > 0.5 ? "#140d09" : "#3b2313";
  drawPolygon3D(ctx, cam, deskCorners, deskColor, deskStroke, 3);

  // Sisi Depan Tebal Meja
  const deskFront = [
    { x: -780, y: deskY, z: -260 },
    { x: 780, y: deskY, z: -260 },
    { x: 780, y: deskY - 45, z: -260 },
    { x: -780, y: deskY - 45, z: -260 }
  ];
  drawPolygon3D(ctx, cam, deskFront, darkFactor > 0.5 ? "#160e09" : "#3d2514");

  // 4. Alas Potong Hijau (Green Cutting Mat dengan Grid Presisi)
  const matCorners = [
    { x: -340, y: deskY + 1.5, z: -185 },
    { x: 340, y: deskY + 1.5, z: -185 },
    { x: 340, y: deskY + 1.5, z: 165 },
    { x: -340, y: deskY + 1.5, z: 165 }
  ];
  const matColor = darkFactor > 0.5 ? "#064e3b" : "#059669";
  drawPolygon3D(ctx, cam, matCorners, matColor, "#34d399", 2);

  // Garis Grid di atas Cutting Mat
  ctx.save();
  ctx.strokeStyle = darkFactor > 0.5 ? "rgba(110, 231, 183, 0.16)" : "rgba(209, 250, 229, 0.28)";
  ctx.lineWidth = 1;
  for (let gx = -300; gx <= 300; gx += 40) {
    const p1 = cam.project(gx, deskY + 1.8, -175);
    const p2 = cam.project(gx, deskY + 1.8, 155);
    if (p1.visible && p2.visible) {
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }
  for (let gz = -160; gz <= 140; gz += 40) {
    const p1 = cam.project(-325, deskY + 1.8, gz);
    const p2 = cam.project(325, deskY + 1.8, gz);
    if (p1.visible && p2.visible) {
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }
  ctx.restore();

  // Cahaya Pantulan LED Joule Thief pada Meja saat Mode Gelap
  if (ledGlow > 0.02) {
    const glowPos = cam.project(0, deskY + 15, -10);
    if (glowPos.visible) {
      ctx.save();
      const rad = 360 * glowPos.scale * 0.55;
      const g = ctx.createRadialGradient(glowPos.x, glowPos.y, 10, glowPos.x, glowPos.y, rad);
      g.addColorStop(0, `rgba(186, 230, 253, ${0.55 * ledGlow})`);
      g.addColorStop(0.5, `rgba(56, 189, 248, ${0.22 * ledGlow})`);
      g.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(glowPos.x, glowPos.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================================
// 5. DESAIN KARAKTER 3D: UDIN (REMAJA SMA 17 TAHUN, RIGGING WAJAH & TANGAN)
// ============================================================================
function renderUdin3D(ctx, cam, state) {
  const {
    time,
    udinVisible = 1,
    expression = "smile", // "smile" | "surprised" | "focused" | "proud"
    speaking = false,
    leftHandPos = { x: -120, y: 45, z: -40 },
    rightHandPos = { x: 120, y: 45, z: -40 },
    leftHandGesture = "open",  // "open" | "point" | "hold" | "thumbsup"
    rightHandGesture = "open",
    headTilt = 0,
    headYaw = 0,
    shrug = 0,
    darkMode = 0,
    ledGlow = 0
  } = state;

  if (udinVisible <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = clamp(udinVisible, 0, 1);

  const breath = Math.sin(time * 2.6) * 2.5;
  const shoulderY = 148 + breath + shrug * 16;
  const bodyZ = 185;

  // Warna Seragam SMA Indonesia (dipengaruhi pencahayaan kamar & cahaya LED)
  const shirtMain = darkMode > 0.5 ? (ledGlow > 0.5 ? "#cbd5e1" : "#64748b") : "#f8fafc";
  const shirtShadow = darkMode > 0.5 ? "#334155" : "#cbd5e1";
  const skinMain = darkMode > 0.5 ? (ledGlow > 0.5 ? "#e2b897" : "#9a6b4c") : "#f1c27d";
  const skinShadow = darkMode > 0.5 ? "#5c3d28" : "#c68642";

  // 1. Torso / Kemeja Putih SMA
  const torsoPts = [
    { x: -95, y: shoulderY, z: bodyZ },
    { x: 95, y: shoulderY, z: bodyZ },
    { x: 78, y: 0, z: bodyZ - 15 },
    { x: -78, y: 0, z: bodyZ - 15 }
  ];
  drawPolygon3D(ctx, cam, torsoPts, shirtMain, shirtShadow, 2);

  // Kerah Kemeja & Dasi SMA Abu-abu (agak dilonggarkan)
  const collarL = [
    { x: -36, y: shoulderY + 6, z: bodyZ - 6 },
    { x: -8, y: shoulderY - 22, z: bodyZ - 12 },
    { x: -4, y: shoulderY + 4, z: bodyZ - 8 }
  ];
  const collarR = [
    { x: 36, y: shoulderY + 6, z: bodyZ - 6 },
    { x: 8, y: shoulderY - 22, z: bodyZ - 12 },
    { x: 4, y: shoulderY + 4, z: bodyZ - 8 }
  ];
  drawPolygon3D(ctx, cam, collarL, "#e2e8f0", "#94a3b8", 1.5);
  drawPolygon3D(ctx, cam, collarR, "#e2e8f0", "#94a3b8", 1.5);

  // Simpul & Untaian Dasi Abu-abu
  const tieKnot = [
    { x: -11, y: shoulderY - 12, z: bodyZ - 13 },
    { x: 11, y: shoulderY - 12, z: bodyZ - 13 },
    { x: 7, y: shoulderY - 28, z: bodyZ - 14 },
    { x: -7, y: shoulderY - 28, z: bodyZ - 14 }
  ];
  const tieBody = [
    { x: -7, y: shoulderY - 28, z: bodyZ - 14 },
    { x: 7, y: shoulderY - 28, z: bodyZ - 14 },
    { x: 14, y: shoulderY - 105, z: bodyZ - 18 },
    { x: 0, y: shoulderY - 122, z: bodyZ - 18 },
    { x: -14, y: shoulderY - 105, z: bodyZ - 18 }
  ];
  drawPolygon3D(ctx, cam, tieKnot, "#475569", "#1e293b", 1.5);
  drawPolygon3D(ctx, cam, tieBody, "#64748b", "#334155", 1.5);

  // Badge OSIS SMA di Saku Kiri
  const pocket = [
    { x: 28, y: shoulderY - 45, z: bodyZ - 12 },
    { x: 64, y: shoulderY - 45, z: bodyZ - 12 },
    { x: 64, y: shoulderY - 88, z: bodyZ - 14 },
    { x: 28, y: shoulderY - 88, z: bodyZ - 14 }
  ];
  drawPolygon3D(ctx, cam, pocket, shirtMain, "#94a3b8", 1.5);
  drawSphere3D(ctx, cam, { x: 46, y: shoulderY - 64, z: bodyZ - 15 }, 9, "#f59e0b", "#b45309");

  // 2. Leher & Kepala 3D Stylized
  const neckTop = { x: headYaw * 12, y: shoulderY + 26, z: bodyZ - 10 };
  drawCapsule3D(ctx, cam, { x: 0, y: shoulderY - 4, z: bodyZ - 8 }, neckTop, 20, skinMain, skinMain, skinShadow);

  const headCenter = {
    x: headYaw * 18,
    y: shoulderY + 72,
    z: bodyZ - 18
  };
  const hp = drawSphere3D(ctx, cam, headCenter, 54, skinMain, skinShadow);

  if (hp.visible) {
    const r = 54 * hp.scale;
    ctx.save();
    ctx.translate(hp.x, hp.y);
    ctx.rotate(headTilt);

    // Telinga Kiri & Kanan
    ctx.fillStyle = skinMain;
    ctx.beginPath();
    ctx.ellipse(-r * 0.95, r * 0.05, r * 0.18, r * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.95, r * 0.05, r * 0.18, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rambut Hitam Agak Acak-acakan Khas Anak Baru Pulang Sekolah
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -r * 0.18, r * 1.04, Math.PI * 0.92, Math.PI * 2.08);
    // Jambul & helai rambut acak
    ctx.lineTo(r * 0.95, -r * 0.55);
    ctx.lineTo(r * 0.65, -r * 1.18);
    ctx.lineTo(r * 0.25, -r * 0.98);
    ctx.lineTo(-r * 0.05, -r * 1.26);
    ctx.lineTo(-r * 0.42, -r * 0.96);
    ctx.lineTo(-r * 0.82, -r * 1.12);
    ctx.lineTo(-r * 1.05, -r * 0.45);
    ctx.closePath();
    ctx.fill();

    // Poni depan menyapu dahi
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.42);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.1, -r * 0.1, -r * 0.48);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.08, r * 0.48, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.85, -r * 0.42);
    ctx.lineTo(r * 0.85, -r * 0.75);
    ctx.lineTo(-r * 0.85, -r * 0.75);
    ctx.closePath();
    ctx.fill();

    // Facial Blendshapes: Alis, Mata, dan Mulut
    const eyeY = -r * 0.02;
    const eyeSep = r * 0.36;
    const blink = (Math.sin(time * 3.1) > 0.97) ? 0.12 : 1.0;

    let browLift = 0;
    let browTilt = 0;
    let eyeSquint = 1.0;

    if (expression === "surprised") {
      browLift = -r * 0.14;
      eyeSquint = 1.22;
    } else if (expression === "focused") {
      browLift = r * 0.06;
      browTilt = 0.22;
      eyeSquint = 0.62;
    } else if (expression === "proud") {
      browLift = -r * 0.05;
      browTilt = -0.08;
    }

    // Gambar Mata Kiri & Kanan
    [-1, 1].forEach(dir => {
      const ex = dir * eyeSep + headYaw * r * 0.18;
      const ey = eyeY;

      // Sklera putih
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.16, r * 0.17 * blink * eyeSquint, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris & Pupil Cokelat Tua
      if (blink > 0.2) {
        ctx.fillStyle = "#1e1b18";
        ctx.beginPath();
        ctx.arc(ex + headYaw * r * 0.05, ey + r * 0.02, r * 0.09 * eyeSquint, 0, Math.PI * 2);
        ctx.fill();

        // Pantulan cahaya mata (eye catchlight)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - r * 0.03, ey - r * 0.03, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }

      // Alis Ekspresif
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(2.5, r * 0.075);
      ctx.lineCap = "round";
      ctx.beginPath();
      const by = ey - r * 0.24 + browLift;
      ctx.moveTo(ex - r * 0.17, by - dir * browTilt * r * 0.12);
      ctx.quadraticCurveTo(ex, by - r * 0.06, ex + r * 0.17, by + dir * browTilt * r * 0.12);
      ctx.stroke();
    });

    // Hidung 3D Stylized
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(headYaw * r * 0.2, eyeY + r * 0.05);
    ctx.lineTo(headYaw * r * 0.25 - r * 0.04, eyeY + r * 0.28);
    ctx.lineTo(headYaw * r * 0.2, eyeY + r * 0.31);
    ctx.stroke();

    // Mulut (Lip-Sync & Blendshapes)
    const mouthY = r * 0.44;
    const mouthX = headYaw * r * 0.18;
    const talkOpen = speaking ? (0.35 + 0.65 * Math.abs(Math.sin(time * 14.5))) : 0;

    if (expression === "surprised" && !speaking) {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.ellipse(mouthX, mouthY, r * 0.13, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expression === "focused" && !speaking) {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = Math.max(2.5, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(mouthX - r * 0.16, mouthY);
      ctx.lineTo(mouthX + r * 0.14, mouthY - r * 0.03);
      ctx.stroke();
    } else {
      // Senyum ramah / bangga atau sedang berbicara
      const smileWidth = expression === "proud" ? r * 0.28 : r * 0.22;
      const openH = speaking ? r * (0.06 + 0.16 * talkOpen) : (expression === "proud" ? r * 0.12 : r * 0.04);

      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.moveTo(mouthX - smileWidth, mouthY - r * 0.03);
      ctx.quadraticCurveTo(mouthX, mouthY + openH * 1.6, mouthX + smileWidth, mouthY - r * 0.03);
      ctx.quadraticCurveTo(mouthX, mouthY + r * 0.02, mouthX - smileWidth, mouthY - r * 0.03);
      ctx.closePath();
      ctx.fill();

      // Baris gigi atas saat tersenyum lebar / bicara
      if (openH > r * 0.06) {
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.rect(mouthX - smileWidth * 0.65, mouthY - r * 0.01, smileWidth * 1.3, r * 0.055);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // 3. Sistem Rigging Lengan (Lengan Kemeja Digulung sampai Siku + Gelang Karet Hitam di Tangan Kiri)
  // Di ruang kamera 3D: Sisi Kanan Karakter (Tangan Kanan Udin) berada di X negatif,
  // Sisi Kiri Karakter (Tangan Kiri Udin dengan gelang karet hitam) berada di X positif.
  const rightShoulder = { x: -92, y: shoulderY - 8, z: bodyZ - 5 };
  const leftShoulder = { x: 92, y: shoulderY - 8, z: bodyZ - 5 };

  const rightElbow = {
    x: lerp(rightShoulder.x, rightHandPos.x, 0.48) - 28,
    y: Math.min(shoulderY - 45, (rightShoulder.y + rightHandPos.y) * 0.5 - 12),
    z: (rightShoulder.z + rightHandPos.z) * 0.5 + 18
  };
  const leftElbow = {
    x: lerp(leftShoulder.x, leftHandPos.x, 0.48) + 28,
    y: Math.min(shoulderY - 45, (leftShoulder.y + leftHandPos.y) * 0.5 - 12),
    z: (leftShoulder.z + leftHandPos.z) * 0.5 + 18
  };

  // Lengan Atas (Tertutup Kemeja Putih + Lipatan di Siku)
  drawCapsule3D(ctx, cam, rightShoulder, rightElbow, 21, shirtMain, "#ffffff", shirtShadow);
  drawCapsule3D(ctx, cam, leftShoulder, leftElbow, 21, shirtMain, "#ffffff", shirtShadow);

  // Gulungan Lengan Kemeja di Siku (Rolled-up cuffs)
  drawSphere3D(ctx, cam, rightElbow, 23, "#e2e8f0", "#94a3b8");
  drawSphere3D(ctx, cam, leftElbow, 23, "#e2e8f0", "#94a3b8");

  // Lengan Bawah (Kulit)
  drawCapsule3D(ctx, cam, rightElbow, rightHandPos, 15, skinMain, skinMain, skinShadow);
  drawCapsule3D(ctx, cam, leftElbow, leftHandPos, 15, skinMain, skinMain, skinShadow);

  // Gelang Karet Hitam di Pergelangan Tangan Kiri Udin
  const wristLeft = {
    x: lerp(leftElbow.x, leftHandPos.x, 0.84),
    y: lerp(leftElbow.y, leftHandPos.y, 0.84),
    z: lerp(leftElbow.z, leftHandPos.z, 0.84)
  };
  drawSphere3D(ctx, cam, wristLeft, 17.5, "#1e293b", "#020617");

  // 4. Hand Rig & Jari Artikulatif
  renderArticulatedHand3D(ctx, cam, rightHandPos, rightHandGesture, false, skinMain, skinShadow);
  renderArticulatedHand3D(ctx, cam, leftHandPos, leftHandGesture, true, skinMain, skinShadow);

  ctx.restore();
}

function renderArticulatedHand3D(ctx, cam, pos, gesture, isLeft, skinMain, skinShadow) {
  // Telapak tangan
  const palm = drawSphere3D(ctx, cam, pos, 17, skinMain, skinShadow);
  if (!palm.visible) return;

  const dirSign = isLeft ? -1 : 1;

  if (gesture === "thumbsup") {
    // Kepalan jari
    drawSphere3D(ctx, cam, { x: pos.x + dirSign * 6, y: pos.y - 2, z: pos.z - 8 }, 15, skinMain, skinShadow);
    // Jempol mengacung ke atas dengan tegas
    drawCapsule3D(
      ctx,
      cam,
      { x: pos.x, y: pos.y + 8, z: pos.z - 6 },
      { x: pos.x, y: pos.y + 42, z: pos.z - 10 },
      7.5,
      skinMain,
      skinMain,
      skinShadow
    );
  } else if (gesture === "point") {
    // Jari telunjuk menunjuk ke komponen
    drawCapsule3D(
      ctx,
      cam,
      pos,
      { x: pos.x + dirSign * 18, y: pos.y - 12, z: pos.z - 34 },
      6,
      skinMain,
      skinMain,
      skinShadow
    );
    // Jari lain menekuk
    for (let i = 1; i <= 3; i++) {
      drawSphere3D(ctx, cam, { x: pos.x - dirSign * (i * 5), y: pos.y - 6, z: pos.z - 12 }, 6.5, skinMain, skinShadow);
    }
  } else if (gesture === "hold") {
    // Jari mencubit/memegang komponen atau baterai
    drawCapsule3D(ctx, cam, pos, { x: pos.x + dirSign * 14, y: pos.y - 6, z: pos.z - 22 }, 6, skinMain, skinMain, skinShadow);
    drawCapsule3D(ctx, cam, pos, { x: pos.x + dirSign * 4, y: pos.y - 12, z: pos.z - 24 }, 6, skinMain, skinMain, skinShadow);
  } else {
    // Gestur tangan terbuka ekspresif (5 jari artikulatif)
    const fingerOffsets = [
      { dx: dirSign * 18, dy: 10, dz: -14 },
      { dx: dirSign * 12, dy: 4, dz: -26 },
      { dx: 0, dy: 2, dz: -28 },
      { dx: -dirSign * 10, dy: 0, dz: -25 },
      { dx: -dirSign * 18, dy: -4, dz: -20 }
    ];
    fingerOffsets.forEach(fo => {
      drawCapsule3D(
        ctx,
        cam,
        pos,
        { x: pos.x + fo.dx, y: pos.y + fo.dy, z: pos.z + fo.dz },
        5.2,
        skinMain,
        skinMain,
        skinShadow
      );
    });
  }
}

// ============================================================================
// 6. ASET 3D KOMPONEN ELEKTRONIK & ALAT BENGKEL (WORKBENCH PROPS)
// ============================================================================

// A. Multitester Digital (dengan layar LCD animasi angka voltase)
function renderMultimeter3D(ctx, cam, pos, lcdText = "0.85 V", showProbes = false, probeTarget = null) {
  const { x, y, z } = pos;
  // Bodi Kuning/Oranye Pelindung Karet Multitester
  const bodyPts = [
    { x: x - 48, y: y + 6, z: z + 65 },
    { x: x + 48, y: y + 6, z: z + 65 },
    { x: x + 48, y: y + 2, z: z - 65 },
    { x: x - 48, y: y + 2, z: z - 65 }
  ];
  drawPolygon3D(ctx, cam, bodyPts, "#f59e0b", "#b45309", 3);

  // Panel Dalam Abu-abu Gelap
  const innerPts = [
    { x: x - 40, y: y + 8, z: z + 56 },
    { x: x + 40, y: y + 8, z: z + 56 },
    { x: x + 40, y: y + 4, z: z - 56 },
    { x: x - 40, y: y + 4, z: z - 56 }
  ];
  drawPolygon3D(ctx, cam, innerPts, "#1e293b", "#0f172a", 1.5);

  // Layar LCD Hijau Klasik
  const lcdPts = [
    { x: x - 34, y: y + 10, z: z + 48 },
    { x: x + 34, y: y + 10, z: z + 48 },
    { x: x + 34, y: y + 8, z: z + 14 },
    { x: x - 34, y: y + 8, z: z + 14 }
  ];
  drawPolygon3D(ctx, cam, lcdPts, "#84cc16", "#3f6212", 2);

  // Teks Angka Digital di Layar Multitester
  const lcdCenter = cam.project(x, y + 12, z + 30);
  if (lcdCenter.visible) {
    ctx.save();
    ctx.fillStyle = "#0f172a";
    const fontSize = Math.max(12, Math.round(18 * lcdCenter.scale * 0.42));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(lcdText, lcdCenter.x, lcdCenter.y);
    ctx.restore();
  }

  // Dial Putar Tengah Multitester
  drawSphere3D(ctx, cam, { x, y: y + 10, z: z - 15 }, 20, "#334155", "#0f172a");

  // Kabel & Probe Merah-Hitam jika aktif mengukur
  if (showProbes && probeTarget) {
    drawCapsule3D(
      ctx,
      cam,
      { x: x - 16, y: y + 8, z: z - 50 },
      { x: probeTarget.x - 28, y: probeTarget.y + 8, z: probeTarget.z },
      3.2,
      "#ef4444",
      "#f87171",
      "#991b1b"
    );
    drawCapsule3D(
      ctx,
      cam,
      { x: x + 16, y: y + 8, z: z - 50 },
      { x: probeTarget.x + 28, y: probeTarget.y + 8, z: probeTarget.z },
      3.2,
      "#1e293b",
      "#475569",
      "#020617"
    );
  }
}

// B. Dudukan Solder, Solder Panas (Glow Oranye Tipis), Timah & Tang Potong
function renderWorkbenchTools3D(ctx, cam, solderIronPos = null, solderGlow = 0.7) {
  // Dudukan Solder di Kanan Meja
  const standBase = [
    { x: 245, y: 2, z: 45 },
    { x: 325, y: 2, z: 45 },
    { x: 325, y: 2, z: 135 },
    { x: 245, y: 2, z: 135 }
  ];
  drawPolygon3D(ctx, cam, standBase, "#334155", "#0f172a", 2);

  // Gulungan Timah (Solder Wire Spool) di Kanan Depan
  drawSphere3D(ctx, cam, { x: 265, y: 18, z: -45 }, 22, "#94a3b8", "#475569");
  drawSphere3D(ctx, cam, { x: 265, y: 22, z: -45 }, 12, "#3b82f6", "#1d4ed8");

  // Tang Potong (Side Cutter Pliers) di Kiri Atas Cutting Mat
  drawCapsule3D(ctx, cam, { x: -275, y: 6, z: 95 }, { x: -235, y: 6, z: 135 }, 6, "#ef4444", "#f87171", "#991b1b");
  drawCapsule3D(ctx, cam, { x: -255, y: 6, z: 85 }, { x: -225, y: 6, z: 130 }, 6, "#ef4444", "#f87171", "#991b1b");
  drawCapsule3D(ctx, cam, { x: -230, y: 7, z: 132 }, { x: -212, y: 7, z: 152 }, 5, "#cbd5e1", "#f8fafc", "#475569");

  // Solder Panas (Bisa berada di dudukan atau bergerak menyolder komponen)
  const tipPos = solderIronPos || { x: 275, y: 42, z: 75 };
  const handleStart = { x: tipPos.x + 55, y: tipPos.y + 68, z: tipPos.z + 25 };
  const metalMid = { x: tipPos.x + 18, y: tipPos.y + 22, z: tipPos.z + 8 };

  // Gagang Solder Biru Tua
  drawCapsule3D(ctx, cam, handleStart, metalMid, 10, "#1d4ed8", "#60a5fa", "#1e3a8a");
  // Batang Logam Pemanas
  drawCapsule3D(ctx, cam, metalMid, tipPos, 4.5, "#cbd5e1", "#ffffff", "#64748b");
  // Ujung Solder dengan Efek Glow Oranye Tipis
  drawSphere3D(ctx, cam, tipPos, 5.5, "#fb923c", "#ea580c", "rgba(249, 115, 22, 0.85)", solderGlow);
}

// C. Inti Ferit Toroid + Lilitan Kawat Bifilar (Merah & Biru)
function renderToroid3D(ctx, cam, center, radius = 38, windingProgress = 0, xrayMode = 0) {
  const { x, y, z } = center;
  const numSegs = 28;

  // Gambar Cincin Donat Ferit Hitam Matte (Transparan saat X-Ray)
  const coreAlpha = lerp(1.0, 0.32, xrayMode);
  ctx.save();
  ctx.globalAlpha = coreAlpha;
  for (let i = 0; i < numSegs; i++) {
    const a1 = (i / numSegs) * Math.PI * 2;
    const a2 = ((i + 1) / numSegs) * Math.PI * 2;
    const p1 = { x: x + Math.cos(a1) * radius, y: y, z: z + Math.sin(a1) * radius };
    const p2 = { x: x + Math.cos(a2) * radius, y: y, z: z + Math.sin(a2) * radius };
    drawCapsule3D(
      ctx,
      cam,
      p1,
      p2,
      12,
      xrayMode > 0.3 ? "#1e293b" : "#18181b",
      xrayMode > 0.3 ? "#38bdf8" : "#3f3f46",
      "#09090b"
    );
  }
  ctx.restore();

  // Lilitan Bifilar: 10 Lilitan Kawat Merah & Kawat Biru Berdampingan
  const totalTurns = 10;
  const activeTurns = clamp(windingProgress, 0, 1) * totalTurns;
  const steps = Math.floor(activeTurns * 12);

  for (let s = 0; s < steps; s++) {
    const turnIdx = s / 12;
    const baseAngle = (turnIdx / totalTurns) * Math.PI * 1.65 - Math.PI * 0.82;
    const poloidalAngle = (s % 12) / 12 * Math.PI * 2;
    const nextPoloidal = ((s + 1) % 12) / 12 * Math.PI * 2;

    const r1 = radius + Math.cos(poloidalAngle) * 13.5;
    const y1 = y + Math.sin(poloidalAngle) * 13.5;
    const r2 = radius + Math.cos(nextPoloidal) * 13.5;
    const y2 = y + Math.sin(nextPoloidal) * 13.5;

    // Kawat Merah
    const mr1 = { x: x + Math.cos(baseAngle) * r1, y: y1, z: z + Math.sin(baseAngle) * r1 };
    const mr2 = { x: x + Math.cos(baseAngle + 0.04) * r2, y: y2, z: z + Math.sin(baseAngle + 0.04) * r2 };
    drawCapsule3D(ctx, cam, mr1, mr2, 2.4, "#ef4444", "#fca5a5", "#991b1b");

    // Kawat Biru (berdampingan)
    const bAngle = baseAngle + 0.075;
    const mb1 = { x: x + Math.cos(bAngle) * r1, y: y1, z: z + Math.sin(bAngle) * r1 };
    const mb2 = { x: x + Math.cos(bAngle + 0.04) * r2, y: y2, z: z + Math.sin(bAngle + 0.04) * r2 };
    drawCapsule3D(ctx, cam, mb1, mb2, 2.4, "#3b82f6", "#93c5fd", "#1e3a8a");
  }
}

// D. Transistor NPN 2N2222 (Bodi Hitam Setengah Silinder + 3 Kaki E-B-C)
function renderTransistor3D(ctx, cam, pos, xrayMode = 0, gateOpen = 0) {
  const { x, y, z } = pos;

  // Tiga Kaki Logam: Kiri = Emitor (E), Tengah = Basis (B), Kanan = Kolektor (C)
  const legs = [
    { lx: x - 14, label: "E" },
    { lx: x, label: "B" },
    { lx: x + 14, label: "C" }
  ];
  legs.forEach(l => {
    drawCapsule3D(
      ctx,
      cam,
      { x: l.lx, y: y + 18, z },
      { x: l.lx, y: y - 12, z },
      2.2,
      "#cbd5e1",
      "#ffffff",
      "#64748b"
    );
  });

  // Bodi Hitam TO-92 Setengah Silinder
  ctx.save();
  ctx.globalAlpha = lerp(1.0, 0.45, xrayMode);
  drawCapsule3D(
    ctx,
    cam,
    { x, y: y + 18, z },
    { x, y: y + 42, z },
    16,
    "#18181b",
    "#52525b",
    "#09090b"
  );
  ctx.restore();

  // Visualisasi Gerbang Internal saat X-Ray Mode
  if (xrayMode > 0.1) {
    const coreColor = gateOpen > 0.5 ? "#22c55e" : "#ef4444";
    const glowColor = gateOpen > 0.5 ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)";
    drawSphere3D(ctx, cam, { x, y: y + 28, z }, 8, coreColor, "#ffffff", glowColor, xrayMode * 0.9);
  }
}

// E. Resistor 1k Ohm (Warna Krem + Gelang Cokelat-Hitam-Merah-Emas)
function renderResistor3D(ctx, cam, p1, p2) {
  // Kawat kaki resistor
  drawCapsule3D(ctx, cam, p1, p2, 2.0, "#cbd5e1", "#ffffff", "#64748b");

  // Bodi Krem Resistor di tengah
  const bStart = {
    x: lerp(p1.x, p2.x, 0.25),
    y: lerp(p1.y, p2.y, 0.25),
    z: lerp(p1.z, p2.z, 0.25)
  };
  const bEnd = {
    x: lerp(p1.x, p2.x, 0.75),
    y: lerp(p1.y, p2.y, 0.75),
    z: lerp(p1.z, p2.z, 0.75)
  };
  drawCapsule3D(ctx, cam, bStart, bEnd, 8.5, "#fde68a", "#fef3c7", "#d97706");

  // 4 Gelang Warna: Cokelat (1), Hitam (0), Merah (x100), Emas (5%)
  const bands = [
    { t: 0.34, c: "#78350f" },
    { t: 0.45, c: "#09090b" },
    { t: 0.56, c: "#dc2626" },
    { t: 0.68, c: "#eab308" }
  ];
  bands.forEach(b => {
    const bp1 = {
      x: lerp(p1.x, p2.x, b.t - 0.02),
      y: lerp(p1.y, p2.y, b.t - 0.02),
      z: lerp(p1.z, p2.z, b.t - 0.02)
    };
    const bp2 = {
      x: lerp(p1.x, p2.x, b.t + 0.02),
      y: lerp(p1.y, p2.y, b.t + 0.02),
      z: lerp(p1.z, p2.z, b.t + 0.02)
    };
    drawCapsule3D(ctx, cam, bp1, bp2, 9.2, b.c, b.c, b.c);
  });
}

// F. Lampu LED 5mm (Kubah Bening + Efek Emissive Glow Putih/Biru Terang)
function renderLED3D(ctx, cam, pos, brightness = 0) {
  const { x, y, z } = pos;
  // Kaki Panjang (+) dan Kaki Pendek (-)
  drawCapsule3D(ctx, cam, { x: x - 7, y: y + 18, z }, { x: x - 7, y: y - 16, z }, 2.2, "#cbd5e1", "#ffffff", "#64748b");
  drawCapsule3D(ctx, cam, { x: x + 7, y: y + 18, z }, { x: x + 7, y: y - 8, z }, 2.2, "#cbd5e1", "#ffffff", "#64748b");

  // Kubah LED 5mm
  const coreCol = brightness > 0.1 ? "#ffffff" : "rgba(224, 242, 254, 0.82)";
  const edgeCol = brightness > 0.1 ? "#38bdf8" : "rgba(148, 163, 184, 0.65)";

  drawCapsule3D(
    ctx,
    cam,
    { x, y: y + 18, z },
    { x, y: y + 44, z },
    14,
    coreCol,
    "#ffffff",
    edgeCol
  );

  if (brightness > 0.02) {
    drawSphere3D(
      ctx,
      cam,
      { x, y: y + 34, z },
      18,
      "#ffffff",
      "#38bdf8",
      "rgba(56, 189, 248, 0.95)",
      brightness
    );
  }
}

// G. Baterai AA Bekas (Tampilan Sedikit Kusam + Label Voltase 0.85 V)
function renderBatteryAA3D(ctx, cam, p1, p2, showVoltageLabel = true) {
  // Bodi Silinder Baterai Kusam
  drawCapsule3D(ctx, cam, p1, p2, 18, "#475569", "#94a3b8", "#1e293b");

  // Bagian Kepala Kuningan/Tembaga Kusam (+)
  const brassStart = {
    x: lerp(p1.x, p2.x, 0.72),
    y: lerp(p1.y, p2.y, 0.72),
    z: lerp(p1.z, p2.z, 0.72)
  };
  drawCapsule3D(ctx, cam, brassStart, p2, 18.2, "#b45309", "#f59e0b", "#78350f");

  // Tonjolan Kutub Positif (+)
  const nubEnd = {
    x: p2.x + (p2.x - p1.x) * 0.08,
    y: p2.y + (p2.y - p1.y) * 0.08,
    z: p2.z + (p2.z - p1.z) * 0.08
  };
  drawCapsule3D(ctx, cam, p2, nubEnd, 7.5, "#cbd5e1", "#ffffff", "#475569");

  if (showVoltageLabel) {
    const mid = {
      x: (p1.x + p2.x) * 0.5,
      y: (p1.y + p2.y) * 0.5 + 24,
      z: (p1.z + p2.z) * 0.5
    };
    drawFloatingLabel3D(ctx, cam, mid, "Baterai AA Bekas", "Tegangan: 0.85 V", "#f59e0b", 1, { x: 0, y: -38 });
  }
}

// ============================================================================
// 7. RANGKAIAN LENGKAP JOULE THIEF, PENYOLDERAN, & EFEK X-RAY ELEKTRON
// ============================================================================
function renderAssembledJouleThief3D(ctx, cam, state) {
  const {
    time,
    assemblyProgress = 1, // 0..1 tahapan perakitan di Adegan 3
    xrayMode = 0,
    ledBrightness = 0,
    cyclePhase = 0,       // 0..1 fase siklus lambat di Adegan 4
    fastPulse = false
  } = state;

  // Koordinat Komponen Utama di atas Cutting Mat
  const toroidPos = { x: 0, y: 18, z: 25 };
  const transPos = { x: 0, y: 18, z: -55 };
  const ledPos = { x: 68, y: 18, z: -55 };
  const resStart = { x: -78, y: 18, z: -5 };
  const resEnd = { x: -24, y: 18, z: -48 };
  const batNeg = { x: -155, y: 20, z: -75 };
  const batPos = { x: -155, y: 20, z: 15 };

  // 1. Toroid & Lilitan Kawat Merah-Biru (Tahap 1: 0.00 - 0.22)
  const windProg = smoothstep(0.0, 0.22, assemblyProgress);
  renderToroid3D(ctx, cam, toroidPos, 38, windProg, xrayMode);

  // 2. Pilinan Kawat Merah Awal & Kawat Biru Akhir -> Jalur Positif Baterai (Tahap 2: 0.22 - 0.38)
  const twistProg = smoothstep(0.22, 0.38, assemblyProgress);
  if (twistProg > 0) {
    const twistNode = { x: -58, y: 18, z: 45 };
    drawCapsule3D(ctx, cam, { x: -35, y: 18, z: 38 }, twistNode, 2.8, "#ef4444", "#fca5a5", "#991b1b");
    drawCapsule3D(ctx, cam, { x: -32, y: 21, z: 32 }, twistNode, 2.8, "#3b82f6", "#93c5fd", "#1e3a8a");

    // Kabel dari pilinan ke kutub (+) Baterai
    const targetBatPos = {
      x: lerp(twistNode.x, batPos.x, twistProg),
      y: 18,
      z: lerp(twistNode.z, batPos.z + 8, twistProg)
    };
    drawCapsule3D(ctx, cam, twistNode, targetBatPos, 3.0, "#f59e0b", "#fde047", "#b45309");

    if (assemblyProgress > 0.24 && assemblyProgress < 0.92) {
      drawFloatingLabel3D(ctx, cam, twistNode, "Jalur Baterai (+)", "Merah Awal + Biru Akhir", "#f59e0b", twistProg, { x: -30, y: -48 });
    }
  }

  // 3. Kawat Biru Satunya -> Resistor 1k -> Basis Transistor (Tahap 3: 0.38 - 0.56)
  const baseProg = smoothstep(0.38, 0.56, assemblyProgress);
  if (baseProg > 0) {
    drawCapsule3D(ctx, cam, { x: -36, y: 16, z: 12 }, resStart, 2.6, "#3b82f6", "#93c5fd", "#1e3a8a");
    renderResistor3D(ctx, cam, resStart, resEnd);
    drawCapsule3D(ctx, cam, resEnd, { x: transPos.x, y: transPos.y + 8, z: transPos.z }, 2.4, "#cbd5e1", "#ffffff", "#64748b");
  }

  // 4. Transistor 2N2222 & Kawat Merah -> Kolektor (Tahap 4: 0.56 - 0.72)
  const colProg = smoothstep(0.56, 0.72, assemblyProgress);
  if (assemblyProgress > 0.35) {
    const gateOpen = (xrayMode > 0.1 && (fastPulse || (cyclePhase > 0.05 && cyclePhase < 0.58))) ? 1 : 0;
    renderTransistor3D(ctx, cam, transPos, xrayMode, gateOpen);
  }
  if (colProg > 0) {
    const colPin = { x: transPos.x + 14, y: transPos.y + 8, z: transPos.z };
    drawCapsule3D(
      ctx,
      cam,
      { x: 38, y: 16, z: 15 },
      { x: lerp(38, colPin.x, colProg), y: 16, z: lerp(15, colPin.z, colProg) },
      2.8,
      "#ef4444",
      "#fca5a5",
      "#991b1b"
    );
  }

  // 5. Pemasangan LED 5mm & Jalur Negatif Baterai (Tahap 5: 0.72 - 0.88)
  const ledProg = smoothstep(0.72, 0.88, assemblyProgress);
  if (ledProg > 0) {
    renderLED3D(ctx, cam, ledPos, ledBrightness);
    // Kaki Positif LED ke Kolektor Transistor
    drawCapsule3D(
      ctx,
      cam,
      { x: transPos.x + 14, y: transPos.y + 6, z: transPos.z },
      { x: ledPos.x - 7, y: ledPos.y + 6, z: ledPos.z },
      2.5,
      "#ef4444",
      "#fca5a5",
      "#991b1b"
    );
    // Kaki Negatif LED + Emitor Transistor ke Kutub Negatif (-) Baterai
    drawCapsule3D(
      ctx,
      cam,
      { x: ledPos.x + 7, y: ledPos.y + 4, z: ledPos.z },
      { x: transPos.x - 14, y: transPos.y + 4, z: transPos.z - 12 },
      2.5,
      "#38bdf8",
      "#bae6fd",
      "#0369a1"
    );
    drawCapsule3D(
      ctx,
      cam,
      { x: transPos.x - 14, y: transPos.y + 4, z: transPos.z - 12 },
      batNeg,
      2.8,
      "#38bdf8",
      "#bae6fd",
      "#0369a1"
    );
  }

  // Baterai AA Bekas Terpasang
  if (assemblyProgress > 0.82) {
    renderBatteryAA3D(ctx, cam, batNeg, batPos, xrayMode < 0.2);
  }

  // 6. Titik Bulatan Timah Mengkilap & Animasi Solder (Tahap 6: 0.85 - 1.00)
  const solderJoints = [
    { x: -58, y: 18, z: 45 },
    { x: transPos.x - 14, y: transPos.y + 6, z: transPos.z },
    { x: transPos.x, y: transPos.y + 6, z: transPos.z },
    { x: transPos.x + 14, y: transPos.y + 6, z: transPos.z },
    { x: ledPos.x - 7, y: ledPos.y + 6, z: ledPos.z },
    { x: ledPos.x + 7, y: ledPos.y + 6, z: ledPos.z }
  ];

  const solderProg = smoothstep(0.84, 0.99, assemblyProgress);
  if (solderProg > 0) {
    const activeJointIdx = Math.min(solderJoints.length - 1, Math.floor(solderProg * solderJoints.length));
    solderJoints.forEach((jt, idx) => {
      if (idx <= activeJointIdx || assemblyProgress >= 0.99) {
        drawSphere3D(ctx, cam, jt, 4.2, "#f8fafc", "#64748b");
      }
    });

    if (assemblyProgress < 0.995) {
      const targetJoint = solderJoints[activeJointIdx];
      renderWorkbenchTools3D(ctx, cam, { x: targetJoint.x, y: targetJoint.y + 4, z: targetJoint.z }, 0.95);

      // Efek kepulan asap tipis saat penyolderan
      const sp = cam.project(targetJoint.x, targetJoint.y + 18 + (time * 35) % 28, targetJoint.z);
      if (sp.visible) {
        ctx.save();
        ctx.fillStyle = "rgba(226, 232, 240, 0.45)";
        ctx.beginPath();
        ctx.arc(sp.x + Math.sin(time * 8) * 8, sp.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      renderWorkbenchTools3D(ctx, cam, null, 0.5);
    }
  } else {
    renderWorkbenchTools3D(ctx, cam, null, 0.6);
  }

  // 7. VISUALISASI X-RAY: PARTIKEL ELEKTRON, MEDAN MAGNET TOROID & LONJAKAN TEGANGAN
  if (xrayMode > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(xrayMode, 0, 1);

    const pCycle = fastPulse ? ((time * 6.5) % 1) : cyclePhase;

    // Fase 1 (0.00 - 0.28): Arus kecil lewat resistor ke Basis -> Gerbang transistor terbuka
    if (pCycle < 0.35 || fastPulse) {
      for (let i = 0; i < 6; i++) {
        const t = ((pCycle * 3.2) + i / 6) % 1;
        const ex = lerp(resStart.x, transPos.x, t);
        const ez = lerp(resStart.z, transPos.z, t);
        drawSphere3D(ctx, cam, { x: ex, y: 22, z: ez }, 4.2, "#fde047", "#eab308", "rgba(250, 204, 21, 0.9)", 0.9);
      }
    }

    // Fase 2 (0.25 - 0.60): Arus lewat kawat merah ke Kolektor -> Cincin gelombang biru medan magnet membesar
    if ((pCycle >= 0.22 && pCycle < 0.68) || fastPulse) {
      const magGrowth = fastPulse ? (0.5 + 0.5 * Math.sin(time * 28)) : smoothstep(0.22, 0.58, pCycle);
      const tc = cam.project(toroidPos.x, toroidPos.y + 8, toroidPos.z);
      if (tc.visible) {
        for (let ring = 1; ring <= 3; ring++) {
          const rad = (35 + ring * 26 * magGrowth) * tc.scale * 0.55;
          ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - ring * 0.25) * 0.85})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.ellipse(tc.x, tc.y, rad * 1.25, rad * 0.72, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Partikel elektron di jalur kawat merah
      for (let i = 0; i < 7; i++) {
        const t = ((time * (fastPulse ? 8 : 2.2)) + i / 7) % 1;
        const ex = lerp(toroidPos.x + 25, transPos.x + 14, t);
        const ez = lerp(toroidPos.z, transPos.z, t);
        drawSphere3D(ctx, cam, { x: ex, y: 22, z: ez }, 4.5, "#fde047", "#f59e0b", "rgba(253, 224, 71, 0.9)", 0.9);
      }
    }

    // Fase 3 (0.58 - 0.75): Induksi balik pada kawat biru -> Gerbang Basis tertutup mendadak!
    if (pCycle >= 0.56 && pCycle < 0.76 && !fastPulse) {
      drawFloatingLabel3D(
        ctx,
        cam,
        { x: transPos.x, y: transPos.y + 38, z: transPos.z },
        "Induksi Kawat Biru!",
        "Gerbang Basis Tertutup Mendadak",
        "#ef4444",
        1,
        { x: 0, y: -45 }
      );
    }

    // Fase 4 (0.72 - 1.00): Medan magnet runtuh -> Lonjakan tegangan (Voltage Spike Oranye Terang) ke LED!
    if (pCycle >= 0.70 || fastPulse) {
      const collapseT = fastPulse ? ((time * 12) % 1) : smoothstep(0.70, 0.98, pCycle);
      for (let i = 0; i < 8; i++) {
        const t = (collapseT + i / 8) % 1;
        const sx = lerp(toroidPos.x + 28, ledPos.x, t);
        const sz = lerp(toroidPos.z, ledPos.z, t);
        drawSphere3D(ctx, cam, { x: sx, y: 26, z: sz }, 6.5, "#ffffff", "#f97316", "rgba(249, 115, 22, 0.98)", 1.0);
      }

      if (!fastPulse) {
        drawFloatingLabel3D(
          ctx,
          cam,
          { x: ledPos.x, y: ledPos.y + 48, z: ledPos.z },
          "LONJAKAN TEGANGAN (> 3.2V)!",
          "Medan Magnet Runtuh Menyalakan LED",
          "#f97316",
          1,
          { x: 25, y: -52 }
        );
      }
    }

    ctx.restore();
  }
}

// ============================================================================
// 8. OVERLAY HUD EDUKASI, JUDUL ADEGAN & SUBTITLE NARASI
// ============================================================================
function renderUIOverlay(ctx, scene, sceneTime, globalTime, totalDuration) {
  ctx.save();

  // Header Badge Kiri Atas
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(36, 32, 460, 58, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("EKSPERIMEN FISIKA & ELEKTRONIKA 3D", 56, 54);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 19px sans-serif";
  ctx.fillText(scene.name, 56, 78);

  // Indikator Progress Waktu di Kanan Atas
  const mm = String(Math.floor(globalTime / 60)).padStart(2, '0');
  const ss = String(Math.floor(globalTime % 60)).padStart(2, '0');
  const tmm = String(Math.floor(totalDuration / 60)).padStart(2, '0');
  const tss = String(Math.floor(totalDuration % 60)).padStart(2, '0');

  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.beginPath();
  ctx.roundRect(WIDTH - 240, 32, 204, 48, 10);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${mm}:${ss} / ${tmm}:${tss}`, WIDTH - 138, 62);
  ctx.textAlign = "left";

  // Subtitle Dinamis Berdasarkan Kalimat Narasi Adegan
  const sentences = scene.narration.match(/[^.!?]+[.!?]+/g) || [scene.narration];
  const progress = clamp(sceneTime / scene.duration, 0, 0.999);
  const idx = Math.min(sentences.length - 1, Math.floor(progress * sentences.length));
  const currentSentence = sentences[idx].trim();

  ctx.font = "600 24px sans-serif";
  const maxSubW = WIDTH - 360;
  const words = currentSentence.split(' ');
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxSubW) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const subBoxH = lines.length * 34 + 26;
  const subBoxY = HEIGHT - subBoxH - 28;

  ctx.fillStyle = "rgba(9, 13, 24, 0.84)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(180, subBoxY, WIDTH - 360, subBoxH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  lines.forEach((ln, i) => {
    ctx.fillText(ln, WIDTH * 0.5, subBoxY + 32 + i * 34);
  });

  ctx.restore();
}

// ============================================================================
// 9. SUTRADARA ADEGAN 1 - 5 (KAMERA, ANIMASI KARAKTER & OBJEK 3D)
// ============================================================================
function renderMasterFrame(ctx, cam, globalTime, sceneTimings, totalDuration) {
  let activeScene = sceneTimings[0];
  for (const st of sceneTimings) {
    if (globalTime >= st.start && globalTime <= st.end) {
      activeScene = st;
      break;
    }
  }
  const sceneTime = clamp(globalTime - activeScene.start, 0, activeScene.duration);
  const p = clamp(sceneTime / activeScene.duration, 0, 1);

  // --------------------------------------------------------------------------
  // ADEGAN 1: Hook & Masalah (00:00 - 00:30)
  // --------------------------------------------------------------------------
  if (activeScene.id === 1) {
    // Kamera Medium Shot Udin lalu zoom-in perlahan ke tangan & baterai AA
    const zoomT = smoothstep(0.18, 0.85, p);
    cam.setPose(
      lerp(0, -35, zoomT),
      lerp(135, 92, zoomT),
      lerp(-430, -265, zoomT),
      lerp(0, -45, zoomT),
      lerp(85, 38, zoomT),
      lerp(40, -15, zoomT),
      720
    );

    renderEnvironment3D(ctx, cam, { darkMode: 0, ledGlow: 0, time: globalTime });
    renderWorkbenchTools3D(ctx, cam, null, 0.65);

    // Ekspresi Udin: Penasaran -> Kecewa (angkat bahu saat LED mati) -> Antusias
    let expr = "smile";
    let shrugVal = 0;
    if (p > 0.28 && p < 0.54) {
      expr = "surprised";
      shrugVal = Math.sin(smoothstep(0.28, 0.42, p) * Math.PI);
    } else if (p >= 0.54 && p < 0.78) {
      expr = "focused";
    }

    const spinOffset = Math.sin(globalTime * 4.5) * 14;
    renderUdin3D(ctx, cam, {
      time: globalTime,
      udinVisible: 1,
      expression: expr,
      speaking: true,
      shrug: shrugVal,
      headTilt: shrugVal * 0.12,
      headYaw: Math.sin(globalTime * 1.4) * 0.25,
      rightHandPos: { x: -55 + spinOffset * (p < 0.28 ? 1 : 0.2), y: 38, z: -20 },
      leftHandPos: { x: 45, y: 36, z: -20 },
      rightHandGesture: "hold",
      leftHandGesture: p > 0.52 ? "point" : "hold"
    });

    // Baterai AA Bekas di meja / tangan Udin
    const batP1 = { x: -75, y: 20, z: -20 };
    const batP2 = { x: -15, y: 20, z: -20 };
    renderBatteryAA3D(ctx, cam, batP1, batP2, p > 0.35);

    // Uji tempel LED langsung ke baterai (LED tidak menyala)
    if (p > 0.22 && p < 0.55) {
      renderLED3D(ctx, cam, { x: -45, y: 28, z: -20 }, 0);
      drawFloatingLabel3D(ctx, cam, { x: -45, y: 65, z: -20 }, "LED 3V Tidak Menyala!", "Tegangan Kurang (< 3.0 V)", "#ef4444", 1);
    }

    // Multitester Digital mengukur baterai -> menampilkan 0.85 V
    const probing = p >= 0.38;
    const lcdVal = p < 0.42 ? "0.00 V" : "0.85 V";
    renderMultimeter3D(ctx, cam, { x: -175, y: 4, z: 35 }, lcdVal, probing, { x: -45, y: 20, z: -20 });
  }

  // --------------------------------------------------------------------------
  // ADEGAN 2: Pengenalan Bahan (00:30 - 00:58)
  // --------------------------------------------------------------------------
  else if (activeScene.id === 2) {
    // Transisi kamera menyapu ke atas menjadi Top-Down View menghadap cutting mat hijau
    const topT = easeInOutCubic(smoothstep(0.0, 0.18, p));
    cam.setPose(
      0,
      lerp(135, 390, topT),
      lerp(-380, -95, topT),
      0,
      lerp(75, 10, topT),
      lerp(20, 0, topT),
      740
    );

    renderEnvironment3D(ctx, cam, { darkMode: 0, ledGlow: 0, time: globalTime });
    renderWorkbenchTools3D(ctx, cam, null, 0.5);

    // Tangan Udin menyingkir perlahan
    if (topT < 0.85) {
      renderUdin3D(ctx, cam, {
        time: globalTime,
        udinVisible: 1 - topT,
        expression: "smile",
        speaking: true,
        rightHandPos: { x: -180, y: 40, z: 60 },
        leftHandPos: { x: 180, y: 40, z: 60 }
      });
    }

    // 6 Komponen muncul satu per satu dengan efek membal (elastic pop-up)
    const pop = (startP) => easeOutBack(smoothstep(startP, startP + 0.11, p));

    // 1. Inti Ferit Toroid
    const s1 = pop(0.10);
    if (s1 > 0.01) {
      const yOff = (1 - s1) * -80;
      renderToroid3D(ctx, cam, { x: -200, y: 18 + yOff, z: 55 }, 32 * clamp(s1, 0.2, 1.2), 0, 0);
      drawFloatingLabel3D(ctx, cam, { x: -200, y: 42, z: 55 }, "1. Inti Ferit (Toroid)", "Donat Ferit Hitam", "#38bdf8", clamp(s1, 0, 1));
    }

    // 2. Kawat Tembaga Bifilar (Merah & Biru)
    const s2 = pop(0.24);
    if (s2 > 0.01) {
      const yOff = (1 - s2) * -80;
      drawCapsule3D(ctx, cam, { x: -45, y: 16 + yOff, z: 75 }, { x: 45, y: 16 + yOff, z: 75 }, 3.5, "#ef4444", "#fca5a5", "#991b1b");
      drawCapsule3D(ctx, cam, { x: -45, y: 16 + yOff, z: 45 }, { x: 45, y: 16 + yOff, z: 45 }, 3.5, "#3b82f6", "#93c5fd", "#1e3a8a");
      drawFloatingLabel3D(ctx, cam, { x: 0, y: 38, z: 60 }, "2. Kawat Tembaga (Bifilar)", "Merah & Biru", "#f43f5e", clamp(s2, 0, 1));
    }

    // 3. Transistor NPN 2N2222
    const s3 = pop(0.40);
    if (s3 > 0.01) {
      const yOff = (1 - s3) * -80;
      renderTransistor3D(ctx, cam, { x: 195, y: 18 + yOff, z: 55 }, 0, 0);
      drawFloatingLabel3D(ctx, cam, { x: 195, y: 55, z: 55 }, "3. Transistor NPN 2N2222", "Emitor | Basis | Kolektor", "#a855f7", clamp(s3, 0, 1));
    }

    // 4. Resistor 1k Ohm
    const s4 = pop(0.55);
    if (s4 > 0.01) {
      const yOff = (1 - s4) * -80;
      renderResistor3D(ctx, cam, { x: -235, y: 18 + yOff, z: -55 }, { x: -155, y: 18 + yOff, z: -55 });
      drawFloatingLabel3D(ctx, cam, { x: -195, y: 38, z: -55 }, "4. Resistor 1k Ohm", "Cokelat-Hitam-Merah-Emas", "#eab308", clamp(s4, 0, 1));
    }

    // 5. Lampu LED 5mm 3V
    const s5 = pop(0.70);
    if (s5 > 0.01) {
      const yOff = (1 - s5) * -80;
      renderLED3D(ctx, cam, { x: 0, y: 18 + yOff, z: -55 }, 0.25);
      drawFloatingLabel3D(ctx, cam, { x: 0, y: 58, z: -55 }, "5. LED 5mm (3 Volt)", "Kubah Bening Emissive", "#22c55e", clamp(s5, 0, 1));
    }

    // 6. Baterai AA Bekas (0.85 V)
    const s6 = pop(0.83);
    if (s6 > 0.01) {
      const yOff = (1 - s6) * -80;
      renderBatteryAA3D(ctx, cam, { x: 155, y: 20 + yOff, z: -55 }, { x: 235, y: 20 + yOff, z: -55 }, true);
    }
  }

  // --------------------------------------------------------------------------
  // ADEGAN 3: Proses Perakitan 3D (00:58 - 01:56)
  // --------------------------------------------------------------------------
  else if (activeScene.id === 3) {
    // Kamera Close-up Dinamis mengorbit halus mengikuti perakitan presisi
    const orbitAngle = (p - 0.5) * 0.55;
    cam.setPose(
      Math.sin(orbitAngle) * 230,
      lerp(185, 145, Math.sin(p * Math.PI)),
      -Math.cos(orbitAngle) * 245,
      0,
      24,
      -15,
      760
    );

    renderEnvironment3D(ctx, cam, { darkMode: 0, ledGlow: 0, time: globalTime });

    // Udin tampak fokus di latar belakang memperhatikan proses rakitan & menyolder
    renderUdin3D(ctx, cam, {
      time: globalTime,
      udinVisible: 0.92,
      expression: "focused",
      speaking: true,
      headYaw: Math.sin(p * Math.PI * 2) * 0.18,
      rightHandPos: { x: -165, y: 34, z: 75 },
      leftHandPos: { x: 165, y: 34, z: 75 },
      rightHandGesture: "point",
      leftHandGesture: "open"
    });

    renderAssembledJouleThief3D(ctx, cam, {
      time: globalTime,
      assemblyProgress: p,
      xrayMode: 0,
      ledBrightness: 0,
      cyclePhase: 0,
      fastPulse: false
    });

    // Label Kaki Transistor saat disambungkan
    if (p > 0.42 && p < 0.85) {
      drawFloatingLabel3D(ctx, cam, { x: 0, y: 52, z: -55 }, "Transistor 2N2222", "Kiri: Emitor | Tengah: Basis | Kanan: Kolektor", "#38bdf8", 1, { x: 40, y: -55 });
    }
  }

  // --------------------------------------------------------------------------
  // ADEGAN 4: Uji Coba Mode Gelap & Cara Kerja X-Ray (01:56 - 03:00)
  // --------------------------------------------------------------------------
  else if (activeScene.id === 4) {
    // Fase di Adegan 4:
    // 0.00 - 0.10: Udin menekan sakelar lampu meja -> Ruangan berubah gelap
    // 0.10 - 0.22: Baterai dipasang -> BLAR! LED menyala putih terang menyinari wajah Udin
    // 0.22 - 0.82: Kamera zoom mikroskopis X-Ray (Slow-Mo siklus induksi & lonjakan tegangan)
    // 0.82 - 1.00: Kecepatan normal (ribuan denyutan per detik -> LED menyala stabil)

    const darkT = smoothstep(0.04, 0.12, p);
    const ledOnT = smoothstep(0.11, 0.16, p);
    const xrayT = smoothstep(0.22, 0.30, p) * (1 - smoothstep(0.90, 0.98, p));
    const isFast = p >= 0.82;

    // Gerakan Kamera: Medium Shot Udin -> Zoom Mikroskopis menembus Toroid & Transistor
    const zoomMicro = smoothstep(0.20, 0.32, p) * (1 - smoothstep(0.88, 0.96, p));
    cam.setPose(
      lerp(0, 28, zoomMicro),
      lerp(135, 96, zoomMicro),
      lerp(-390, -175, zoomMicro),
      lerp(0, 8, zoomMicro),
      lerp(75, 24, zoomMicro),
      lerp(20, -18, zoomMicro),
      lerp(720, 820, zoomMicro)
    );

    const slowCycle = clamp((p - 0.28) / 0.52, 0, 1);
    const effectiveLedGlow = isFast ? 1.0 : (xrayT > 0.5 ? (slowCycle > 0.72 ? 1.0 : 0.25) : ledOnT);

    renderEnvironment3D(ctx, cam, {
      darkMode: darkT,
      ledGlow: effectiveLedGlow,
      time: globalTime
    });

    renderUdin3D(ctx, cam, {
      time: globalTime,
      udinVisible: lerp(1.0, 0.35, zoomMicro),
      expression: ledOnT > 0.5 ? "proud" : "smile",
      speaking: true,
      darkMode: darkT,
      ledGlow: effectiveLedGlow,
      rightHandPos: p < 0.12 ? { x: -190, y: 65, z: 40 } : { x: -135, y: 32, z: 35 },
      leftHandPos: { x: 135, y: 32, z: 35 },
      rightHandGesture: "point",
      leftHandGesture: "open"
    });

    renderAssembledJouleThief3D(ctx, cam, {
      time: globalTime,
      assemblyProgress: 1.0,
      xrayMode: xrayT,
      ledBrightness: effectiveLedGlow,
      cyclePhase: slowCycle,
      fastPulse: isFast
    });

    if (isFast) {
      drawFloatingLabel3D(
        ctx,
        cam,
        { x: 68, y: 62, z: -55 },
        "Frekuensi > 20.000 Hz (Puluhan Ribu Kedipan/Detik)",
        "Mata Melihat LED Menyala Terang Stabil!",
        "#38bdf8",
        1,
        { x: 0, y: -48 }
      );
    }
  }

  // --------------------------------------------------------------------------
  // ADEGAN 5: Penutup / Outro (03:00 - 03:22)
  // --------------------------------------------------------------------------
  else {
    // Medium Close-Up Udin di meja belajar, lampu kamar kembali menyala terang
    cam.setPose(
      0,
      138,
      -375,
      0,
      88,
      35,
      740
    );

    renderEnvironment3D(ctx, cam, { darkMode: 0, ledGlow: 0.85, time: globalTime });
    renderMultimeter3D(ctx, cam, { x: -185, y: 4, z: 20 }, "0.85 V", false, null);

    // Rangkaian Joule Thief tetap menyala terang di atas meja samping multitester
    renderAssembledJouleThief3D(ctx, cam, {
      time: globalTime,
      assemblyProgress: 1.0,
      xrayMode: 0,
      ledBrightness: 1.0,
      cyclePhase: 0,
      fastPulse: true
    });

    // Udin menatap kamera sambil mengacungkan jempol (Thumbs Up) & tersenyum bangga
    renderUdin3D(ctx, cam, {
      time: globalTime,
      udinVisible: 1.0,
      expression: "proud",
      speaking: p < 0.92,
      headTilt: 0.04,
      headYaw: Math.sin(globalTime * 1.5) * 0.08,
      rightHandPos: { x: -85, y: 78 + Math.sin(globalTime * 4) * 4, z: -15 },
      leftHandPos: { x: 115, y: 38, z: 25 },
      rightHandGesture: "thumbsup",
      leftHandGesture: "open"
    });
  }

  // Overlay UI & Subtitle
  renderUIOverlay(ctx, activeScene, sceneTime, globalTime, totalDuration);
}

// ============================================================================
// 10. SINTESIS AUDIO NARASI (TTS), EFEK SUARA (SFX) & LO-FI BEAT
// ============================================================================
function getAudioDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { stdio: ['pipe', 'pipe', 'ignore'] }
    ).toString().trim();
    const d = parseFloat(out);
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch (e) {
    return null;
  }
}

async function generateSceneVoice(scene, outputMp3) {
  if (typeof global.generateStudioVoice === 'function') {
    await global.generateStudioVoice(scene.narration, outputMp3, VOICE_MODEL);
    if (fs.existsSync(outputMp3) && fs.statSync(outputMp3).size > 100) {
      return;
    }
  }
  // Fallback hening sesuai target durasi apabila dijalankan di lingkungan lokal tanpa server TTS
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${scene.targetDuration} -q:a 9 -acodec libmp3lame "${outputMp3}"`,
    { stdio: 'ignore' }
  );
}

function generateBackgroundLofiAndSFX(outputWav, totalDuration, sceneTimings) {
  const sampleRate = 44100;
  const numSamples = Math.floor(totalDuration * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // Header WAV PCM 16-bit
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const s1 = sceneTimings[0];
  const s2 = sceneTimings[1];
  const s3 = sceneTimings[2];
  const s4 = sceneTimings[3];
  const s5 = sceneTimings[4];

  // Progresi Chord Lo-Fi Hangat (Fmaj7 - Em7 - Dm7 - Cmaj7)
  const chords = [
    [174.61, 220.00, 261.63, 329.63],
    [164.81, 196.00, 246.94, 293.66],
    [146.83, 174.61, 220.00, 261.63],
    [130.81, 164.81, 196.00, 246.94]
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // 1. Lo-Fi Beat masuk mulai Adegan 2 dan naik sedikit di Penutup lalu fade-out
    if (t >= s2.start) {
      const chordIdx = Math.floor((t * 0.5) % chords.length);
      const activeChord = chords[chordIdx];
      let pad = 0;
      for (const freq of activeChord) {
        pad += Math.sin(2 * Math.PI * freq * t);
      }
      pad *= 0.25;

      // Ketukan Drum Lo-Fi Lembut (80 BPM)
      const beatPhase = (t * (80 / 60)) % 1;
      const kick = beatPhase < 0.12 ? Math.sin(2 * Math.PI * (95 - beatPhase * 450) * t) * (1 - beatPhase / 0.12) : 0;

      let bgVol = 0.045;
      if (t >= s5.start) {
        const outroP = (t - s5.start) / s5.duration;
        bgVol = outroP > 0.75 ? lerp(0.08, 0.0, (outroP - 0.75) / 0.25) : 0.075;
      }
      sample += (pad * 0.6 + kick * 0.4) * bgVol;
    }

    // 2. SFX Adegan 1: Kursi berdecit pelan & Beep Multitester saat mengukur 0.85V
    const beepTime = s1.start + s1.duration * 0.42;
    if (t >= beepTime && t <= beepTime + 0.18) {
      sample += Math.sin(2 * Math.PI * 2450 * t) * 0.22;
    }

    // 3. SFX Adegan 2: Bunyi "Pop!" ringan setiap komponen muncul
    for (const frac of [0.10, 0.24, 0.40, 0.55, 0.70, 0.83]) {
      const popT = s2.start + s2.duration * frac;
      if (t >= popT && t <= popT + 0.09) {
        const dt = (t - popT) / 0.09;
        sample += Math.sin(2 * Math.PI * (320 + dt * 520) * t) * (1 - dt) * 0.24;
      }
    }

    // 4. SFX Adegan 3: Suara desis solder ("tssss") saat titik sambungan disolder
    const solderStart = s3.start + s3.duration * 0.84;
    const solderEnd = s3.start + s3.duration * 0.98;
    if (t >= solderStart && t <= solderEnd) {
      const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      sample += noise * 0.065 * Math.sin(((t - solderStart) / (solderEnd - solderStart)) * Math.PI);
    }

    // 5. SFX Adegan 4: Klik sakelar, Whoosh medan magnet, & Dengung frekuensi tinggi halus
    const switchT = s4.start + s4.duration * 0.08;
    if (t >= switchT && t <= switchT + 0.04) {
      sample += Math.sin(2 * Math.PI * 950 * t) * 0.3;
    }
    if (t >= s4.start + s4.duration * 0.22 && t <= s4.end) {
      sample += Math.sin(2 * Math.PI * 1850 * t) * 0.015;
    }

    const pcm = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.floor(pcm * 32767), 44 + i * 2);
  }

  fs.writeFileSync(outputWav, buffer);
}

// ============================================================================
// 11. PIPELINE UTAMA: GENERATE AUDIO -> RENDER 3D CANVAS -> FFMPEG MP4
// ============================================================================
async function main() {
  console.log("=== Memulai Proses Pembuatan Video 3D Joule Thief (Udin) ===");

  const sceneTimings = [];
  let currentStart = 0;

  for (const scene of SCENES) {
    const rawMp3 = path.join(TEMP_DIR, `scene_${scene.id}_raw.mp3`);
    const paddedWav = path.join(TEMP_DIR, `scene_${scene.id}_pad.wav`);

    console.log(`[TTS] Membuat suara Udin untuk ${scene.name}...`);
    await generateSceneVoice(scene, rawMp3);

    const voiceDur = getAudioDuration(rawMp3) || scene.targetDuration;
    const finalDur = Math.max(scene.targetDuration, Math.ceil(voiceDur + 1.2));

    // Konversi dan tambahkan jeda napas alami di akhir adegan tanpa filter atempo=1.18
    execSync(
      `ffmpeg -y -i "${rawMp3}" -af "apad=whole_dur=${finalDur}" -ar 44100 -ac 2 "${paddedWav}"`,
      { stdio: 'ignore' }
    );

    sceneTimings.push({
      ...scene,
      file: paddedWav,
      start: currentStart,
      duration: finalDur,
      end: currentStart + finalDur
    });
    currentStart += finalDur;
  }

  const totalDuration = currentStart;
  console.log(`[Audio] Total durasi video: ${totalDuration.toFixed(1)} detik (~${(totalDuration / 60).toFixed(2)} menit).`);

  // Gabungkan semua segmen suara narasi
  const concatListPath = path.join(TEMP_DIR, 'concat_list.txt');
  fs.writeFileSync(
    concatListPath,
    sceneTimings.map(st => `file '${st.file.replace(/'/g, "'\\''")}'`).join('\n')
  );

  const fullVoiceWav = path.join(TEMP_DIR, 'full_voice.wav');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${fullVoiceWav}"`,
    { stdio: 'ignore' }
  );

  // Buat trek musik latar Lo-Fi & SFX lalu campurkan dengan suara narasi Udin
  const bgSfxWav = path.join(TEMP_DIR, 'bg_sfx.wav');
  generateBackgroundLofiAndSFX(bgSfxWav, totalDuration, sceneTimings);

  const masterAudioMp3 = path.join(TEMP_DIR, 'master_audio.mp3');
  execSync(
    `ffmpeg -y -i "${fullVoiceWav}" -i "${bgSfxWav}" -filter_complex "[0:a]volume=1.0[v];[1:a]volume=0.85[bg];[v][bg]amix=inputs=2:duration=first:dropout_transition=2[out]" -map "[out]" -c:a libmp3lame -q:a 2 "${masterAudioMp3}"`,
    { stdio: 'ignore' }
  );

  // Mulai proses streaming frame RGBA murni dari @napi-rs/canvas ke FFmpeg
  const totalFrames = Math.floor(totalDuration * FPS);
  console.log(`[Render] Merender ${totalFrames} frame pada resolusi ${WIDTH}x${HEIGHT} (${FPS} FPS)...`);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const cam = new Camera3D();

  const ffmpegArgs = [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${WIDTH}x${HEIGHT}`,
    '-r', String(FPS),
    '-i', 'pipe:0',
    '-i', masterAudioMp3,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    OUTPUT_VIDEO
  ];

  const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });

  let ffmpegErr = '';
  ffmpegProc.stderr.on('data', chunk => {
    ffmpegErr += chunk.toString();
  });

  for (let frame = 0; frame < totalFrames; frame++) {
    const globalTime = frame / FPS;
    renderMasterFrame(ctx, cam, globalTime, sceneTimings, totalDuration);

    const rawBuffer = canvas.data();
    const canWrite = ffmpegProc.stdin.write(rawBuffer);
    if (!canWrite) {
      await new Promise(resolve => ffmpegProc.stdin.once('drain', resolve));
    }

    if (frame % (FPS * 15) === 0 || frame === totalFrames - 1) {
      const pct = ((frame + 1) / totalFrames * 100).toFixed(1);
      console.log(`[Progress] Frame ${frame + 1}/${totalFrames} (${pct}%)`);
    }
  }

  ffmpegProc.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpegProc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg keluar dengan kode ${code}: ${ffmpegErr.slice(-400)}`));
    });
  });

  console.log(`=== Selesai! Video disimpan di: ${OUTPUT_VIDEO} ===`);
}

main().catch(err => {
  console.error("Terjadi kesalahan saat merender video:", err);
  process.exit(1);
});
```
