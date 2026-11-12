const VOICE_MODEL = "id_brian_narrator";

/**
 * ============================================================================
 * RENDER.JS - CINEMATIC 9:16 (60 FPS, 5 MENIT) DOKUMENTER ANIMASI NUKLIR & CHERNOBYL
 * ============================================================================
 * Fitur Utama:
 * 1. Resolusi 1080x1920 (9:16 Vertical Full HD), 60 FPS, Durasi Target 300 Detik (5 Menit).
 * 2. Animasi Karakter Manusia Lengkap (Rigging Kepala, Ekspresi Wajah, Lip-Sync Suara,
 *    Kedipan Mata, Bahu, Siku, Tangan, Kaki Berjalan, Jas Lab, Seragam Operator RBMK,
 *    dan Hazmat Likuidator).
 * 3. Visualisasi Benda & Fisika Lengkap (Inti Atom Uranium-235, Reaksi Berantai Fisi,
 *    Skema PLTN & Turbin Berputar, Ruang Kontrol Chernobyl Unit 4, Batang Kendali
 *    Berujung Grafit, Koefisien Rongga Positif, Ledakan Reaktor RBMK-1000, Helikopter
 *    Likuidator, Bianglala Pripyat, Hutan Merah, dan New Safe Confinement).
 * 4. Perhitungan Durasi Audio Presisi (ffprobe) + Anti-Tabrakan Suara (Zero Voice Overlap).
 * 5. Synthesizer Efek Suara (SFX) & Ambient Sinematik Prosedural (Detak Geiger Counter,
 *    Sirene Alarm AZ-5, Gemuruh Uap Tekanan Tinggi, Ledakan Reaktor, Helikopter,
 *    Turbin Listrik, dan Drone Atmosferik) yang digabung murni tanpa filter atempo=1.18.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

let createCanvas;
try {
  createCanvas = require("@napi-rs/canvas").createCanvas;
} catch (err) {
  createCanvas = require("canvas").createCanvas;
}

// ============================================================================
// KONFIGURASI VIDEO & TIMELINE UTAMA
// ============================================================================
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 60;
const TARGET_TOTAL_DURATION = 300.0; // 5 Menit tepat (300 detik = 18.000 frame @ 60fps)
const OUTPUT_FILE = path.resolve("./output.mp4");
const TEMP_DIR = path.resolve("./temp_nuclear_studio");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// DAFTAR 15 ADEGAN CERITA LENGKAP (5 BABAK NARASI MENDALAM)
// ============================================================================
const SCENES = [
  {
    id: "scene_01",
    act: "BABAK I: RAHASIA INTI ATOM",
    title: "Energi Terdahsyat di Alam Semesta",
    timeLabel: "LABORATORIUM FISIKA NUKLIR",
    geigerCpm: 18,
    powerMw: 0,
    themeColor: "#00f2fe",
    sfxType: "lab_hum",
    cameraZoom: 1.04,
    minDuration: 19.0,
    narration:
      "Pernahkah kamu membayangkan, bahwa di dalam sebutir logam seukuran ujung jari ini, tersimpan energi yang setara dengan seribu ton batu bara? Inilah energi nuklir. Sebuah kekuatan mahadahsyat yang bersembunyi di jantung setiap atom di alam semesta kita. Hari ini, saya akan mengajakmu menyelami kisah nyata di balik kekuatan atom, bagaimana ia menerangi jutaan rumah, hingga malam kelam ketika ia lepas kendali di Chernobyl."
  },
  {
    id: "scene_02",
    act: "BABAK I: RAHASIA INTI ATOM",
    title: "Anatomi Uranium-235 & Tumbukan Neutron",
    timeLabel: "SKALA SUB-MIKROSKOPIS: 10⁻¹⁵ METER",
    geigerCpm: 45,
    powerMw: 10,
    themeColor: "#38ef7d",
    sfxType: "atom_pulse",
    cameraZoom: 1.08,
    minDuration: 20.0,
    narration:
      "Mari kita perbesar pandangan kita jutaan kali lipat ke dalam inti atom Uranium dua tiga lima. Inti ini sangat padat namun tidak stabil, terdiri dari sembilan puluh dua proton dan seratus empat puluh tiga neutron yang saling berdesakan. Ketika satu partikel neutron bebas ditembakkan dengan kecepatan tepat ke arahnya, inti Uranium akan menangkap neutron itu, berguncang hebat, lalu terbelah menjadi dua inti yang lebih kecil."
  },
  {
    id: "scene_03",
    act: "BABAK I: RAHASIA INTI ATOM",
    title: "Reaksi Berantai Eksponensial",
    timeLabel: "FISI NUKLIR & E = mc²",
    geigerCpm: 120,
    powerMw: 250,
    themeColor: "#f7971e",
    sfxType: "chain_reaction",
    cameraZoom: 1.06,
    minDuration: 20.0,
    narration:
      "Pembelahan yang disebut fisi nuklir ini melepaskan energi panas luar biasa sesuai persamaan legendaris Albert Einstein, E sama dengan m c kuadrat. Bukan hanya itu, setiap satu inti yang terbelah ikut melontarkan dua hingga tiga neutron baru. Neutron-neutron baru ini langsung menabrak inti Uranium lain di dekatnya, menciptakan reaksi berantai kilat yang melipatgandakan energi dalam hitungan nanodetik."
  },
  {
    id: "scene_04",
    act: "BABAK II: MESIN RAKSASA PEMBANGKIT LISTRIK",
    title: "Mengendalikan Sang Naga di Dalam Reaktor",
    timeLabel: "TERAS REAKTOR & BATANG KENDALI",
    geigerCpm: 85,
    powerMw: 1500,
    themeColor: "#00d2ff",
    sfxType: "reactor_core",
    cameraZoom: 1.05,
    minDuration: 20.0,
    narration:
      "Bagaimana manusia menjinakkan reaksi berantai ini agar tidak meledak? Di dalam pembangkit listrik tenaga nuklir, batang-batang bahan bakar Uranium disusun rapi di dalam bejana baja bertekanan tinggi. Di sela-selanya, terdapat batang kendali berbahan Boron atau Kadmium yang bertugas menyerap neutron berlebih. Saat batang kendali diturunkan, reaksi melambat. Saat diangkat sedikit, reaksi menghangat secara terukur."
  },
  {
    id: "scene_05",
    act: "BABAK II: MESIN RAKSASA PEMBANGKIT LISTRIK",
    title: "Dari Uap Panas Menjadi Cahaya Kota",
    timeLabel: "SIKLUS TERMODINAMIKA PLTN",
    geigerCpm: 30,
    powerMw: 3200,
    themeColor: "#4facfe",
    sfxType: "turbine_spin",
    cameraZoom: 1.04,
    minDuration: 20.0,
    narration:
      "Panas ekstrem dari teras reaktor mendidihkan air murni hingga berubah menjadi uap bertekanan tinggi. Uap inilah yang memutar bilah-bilah turbin raksasa dengan kecepatan ribuan putaran per menit. Putaran turbin menggerakkan generator elektromagnetik yang mengalirkan listrik bersih bebas asap karbon ke jutaan rumah, rumah sakit, dan pabrik, sementara uap air didinginkan kembali melalui menara pendingin."
  },
  {
    id: "scene_06",
    act: "BABAK III: KRONOLOGI TRAGEDI CHERNOBYL",
    title: "Malam 25-26 April 1986: Reaktor RBMK-1000",
    timeLabel: "PRIPYAT, UKRAINA - 25 APRIL 1986, 23:00",
    geigerCpm: 60,
    powerMw: 1600,
    themeColor: "#f857a6",
    sfxType: "control_room",
    cameraZoom: 1.06,
    minDuration: 20.0,
    narration:
      "Namun sejarah mencatat satu malam ketika aturan fisika dilanggar oleh ambisi dan kecerobohan. Tanggal dua puluh lima April seribu sembilan ratus delapan puluh enam, di Pembangkit Listrik Tenaga Nuklir Chernobyl dekat kota Pripyat, Ukraina. Para operator reaktor nomor empat yang bertipe R B M K seribu sedang bersiap menjalankan uji coba keamanan turbin apabila aliran listrik utama mendadak mati."
  },
  {
    id: "scene_07",
    act: "BABAK III: KRONOLOGI TRAGEDI CHERNOBYL",
    title: "Jebakan Racun Xenon & Daya Anjlok",
    timeLabel: "26 APRIL 1986 - 00:28 DINI HARI",
    geigerCpm: 140,
    powerMw: 30,
    themeColor: "#ff512f",
    sfxType: "xenon_warning",
    cameraZoom: 1.07,
    minDuration: 20.0,
    narration:
      "Uji coba itu ditunda selama berjam-jam karena permintaan listrik kota, sehingga giliran kerja jatuh kepada kru malam yang belum terlatih untuk skenario tersebut. Saat daya reaktor diturunkan, terjadi kesalahan prosedur yang membuat daya anjlok drastis hingga tinggal tiga puluh megawatt. Pada titik serendah itu, gas racun Xenon seratus tiga puluh lima menumpuk di dalam teras dan mencekik reaksi nuklir."
  },
  {
    id: "scene_08",
    act: "BABAK III: KRONOLOGI TRAGEDI CHERNOBYL",
    title: "Cacat Fatal: Koefisien Rongga Positif",
    timeLabel: "26 APRIL 1986 - 01:22:30 DINI HARI",
    geigerCpm: 420,
    powerMw: 200,
    themeColor: "#ff0844",
    sfxType: "void_boiling",
    cameraZoom: 1.09,
    minDuration: 21.0,
    narration:
      "Demi memaksa daya naik kembali, wakil kepala insinyur memerintahkan pencabutan hampir seluruh batang kendali, menyisakan jauh di bawah batas aman. Di sinilah cacat desain reaktor R B M K bekerja bagai bom waktu, yaitu koefisien rongga positif. Ketika air pendingin mendidih dan membentuk gelembung uap, bukannya melambat, reaktivitas neutron di dalam blok moderator grafit justru melonjak semakin liar dan tak terkendali."
  },
  {
    id: "scene_09",
    act: "BABAK III: KRONOLOGI TRAGEDI CHERNOBYL",
    title: "Tombol AZ-5 & Ujung Grafit Pembawa Petaka",
    timeLabel: "26 APRIL 1986 - 01:23:40 DINI HARI",
    geigerCpm: 2800,
    powerMw: 33000,
    themeColor: "#ff0000",
    sfxType: "az5_alarm",
    cameraZoom: 1.12,
    minDuration: 21.0,
    narration:
      "Pukul satu lewat dua puluh tiga menit empat puluh detik, kepala shift Aleksandr Akimov menekan tombol darurat A Z lima untuk memasukkan semua batang kendali sekaligus. Namun mereka tidak tahu, ujung bawah setiap batang kendali R B M K terbuat dari grafit pemercepat reaksi! Saat batang mulai turun, ujung grafit itu mendesak air keluar dan memicu lonjakan daya seratus kali lipat hingga tiga puluh tiga ribu megawatt!"
  },
  {
    id: "scene_10",
    act: "BABAK III: KRONOLOGI TRAGEDI CHERNOBYL",
    title: "Pukul 01:23:45 — Dua Ledakan Mengoyak Malam",
    timeLabel: "26 APRIL 1986 - 01:23:45 DINI HARI",
    geigerCpm: 99999,
    powerMw: 33000,
    themeColor: "#ff4e00",
    sfxType: "explosion_blast",
    cameraZoom: 1.15,
    minDuration: 20.0,
    narration:
      "Saluran bahan bakar pecah lebur seketika. Tekanan uap raksasa meledakkan tutup pelindung biologis seberat dua ribu ton hingga terlempar ke udara! Tiga detik kemudian, ledakan kedua yang dipicu reaksi hidrogen dan grafit panas menghancurkan atap gedung reaktor. Serpihan bahan bakar radioaktif dan grafit membara berhamburan keluar, sementara cahaya biru pendaran ionisasi menembus lurus ke langit malam."
  },
  {
    id: "scene_11",
    act: "BABAK IV: DAMPAK & PERJUANGAN KEMANUSIAAN",
    title: "Musuh Tak Kasatmata & Pemadam Kebakaran",
    timeLabel: "26 APRIL 1986 - 02:00 DINI HARI",
    geigerCpm: 45000,
    powerMw: 0,
    themeColor: "#ff2a54",
    sfxType: "geiger_heavy",
    cameraZoom: 1.07,
    minDuration: 20.0,
    narration:
      "Regu pemadam kebakaran tiba hanya dalam hitungan menit tanpa mengetahui bahwa teras reaktor telah terbuka. Mereka mengira itu hanyalah kebakaran atap biasa. Padahal, setiap detik tubuh mereka dihujani sinar gamma berenergi tinggi yang memutus untaian D N A di dalam sel-sel hidup. Dua puluh delapan petugas dan operator gugur dalam beberapa minggu akibat sindrom radiasi akut yang sangat menyakitkan."
  },
  {
    id: "scene_12",
    act: "BABAK IV: DAMPAK & PERJUANGAN KEMANUSIAAN",
    title: "Pengorbanan 600.000 Likuidator & Helikopter",
    timeLabel: "MEI 1986 - OPERASI PEMADAMAN TERAS",
    geigerCpm: 18500,
    powerMw: 0,
    themeColor: "#f7b733",
    sfxType: "helicopter_drop",
    cameraZoom: 1.06,
    minDuration: 20.0,
    narration:
      "Kebakaran grafit di dalam kawah reaktor terus menyemburkan awan radioaktif selama sepuluh hari. Pilot-pilot helikopter terbang nekat menembus kepulan asap mematikan untuk menjatuhkan lima ribu ton pasir, timbal, dan boron. Tiga sukarelawan penyelam bahkan turun ke lorong banjir yang gelap gulita di bawah reaktor untuk membuka katup air agar lelehan korium tidak memicu ledakan uap kedua yang lebih dahsyat."
  },
  {
    id: "scene_13",
    act: "BABAK IV: DAMPAK & PERJUANGAN KEMANUSIAAN",
    title: "Kota Hantu Pripyat & Hutan Merah",
    timeLabel: "27 APRIL 1986 - EVAKUASI 49.000 WARGA",
    geigerCpm: 6200,
    powerMw: 0,
    themeColor: "#e65c00",
    sfxType: "evac_siren",
    cameraZoom: 1.05,
    minDuration: 20.0,
    narration:
      "Tiga puluh enam jam setelah ledakan, lebih dari seribu bus dikerahkan untuk mengevakuasi empat puluh sembilan ribu penduduk Pripyat. Mereka hanya diberi waktu dua jam untuk mengemas barang dan tidak pernah diizinkan pulang selamanya. Pohon-pohon pinus di sekitar reaktor mati mengering dan berubah warna menjadi merah karat akibat radiasi ekstrem, sementara awan Iodium dan Cesium terbawa angin melintasi benua Eropa."
  },
  {
    id: "scene_14",
    act: "BABAK V: WARISAN SAINS & MASA DEPAN",
    title: "Kubah Pelindung Baja & Revolusi Keamanan",
    timeLabel: "NEW SAFE CONFINEMENT - ABAD KE-21",
    geigerCpm: 110,
    powerMw: 0,
    themeColor: "#00b09b",
    sfxType: "modern_shield",
    cameraZoom: 1.05,
    minDuration: 20.0,
    narration:
      "Untuk mengurung sisa radiasi selama seratus tahun ke depan, dunia bersatu membangun struktur baja lengkung raksasa bernama New Safe Confinement yang digeser menutupi sarkofagus lama. Tragedi Chernobyl memicu revolusi besar dalam rekayasa nuklir dunia. Reaktor modern generasi terbaru kini wajib memiliki koefisien negatif alami dan sistem pendingin pasif berbasis gravitasi yang otomatis berhenti sendiri tanpa bantuan listrik."
  },
  {
    id: "scene_15",
    act: "BABAK V: WARISAN SAINS & MASA DEPAN",
    title: "Pelajaran Abadi dari Jantung Atom",
    timeLabel: "EPILOG: SAINS, KEJUJURAN & KEMANUSIAAN",
    geigerCpm: 15,
    powerMw: 4000,
    themeColor: "#00f2fe",
    sfxType: "epilogue_pad",
    cameraZoom: 1.04,
    minDuration: 19.0,
    narration:
      "Pada akhirnya, kisah energi nuklir dan Chernobyl mengajarkan kita satu kebenaran abadi. Sains memberikan manusia kunci menuju energi yang nyaris tak terbatas untuk menyelamatkan bumi dari krisis iklim. Namun kekuatan sebesar itu menuntut kerendahan hati, keselamatan tanpa kompromi, dan kejujuran mutlak terhadap hukum alam. Terima kasih telah menyimak perjalanan sains ini sampai akhir."
  }
];

// ============================================================================
// UTILITAS: PENGUKURAN DURASI AUDIO PRESISI & FALLBACK TTS
// ============================================================================
function getAudioDurationSec(filePath) {
  try {
    const out = execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    const val = parseFloat(out.toString().trim());
    if (!Number.isNaN(val) && val > 0.1) {
      return val;
    }
  } catch (e) {
    // Fallback estimasi kata jika ffprobe gagal pada file korup
  }
  return 0;
}

function generateSilentOrToneMp3Fallback(filePath, durationSec) {
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=44100:cl=stereo:d=${durationSec.toFixed(3)}`,
    "-c:a",
    "libmp3lame",
    "-q:a",
    "4",
    filePath
  ]);
}

async function buildVoiceoverTimeline() {
  console.log("=== [1/4] MEMBUAT VOICEOVER STUDIO & MENGHITUNG TIMELINE ANTI-TABRAKAN ===");
  const prePad = 0.65;
  const postPad = 1.15;

  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    const mp3Path = path.join(TEMP_DIR, `${sc.id}_voice.mp3`);
    sc.voicePath = mp3Path;

    const wordCount = sc.narration.trim().split(/\s+/).length;
    const estimatedVoiceSec = Math.max(12.0, wordCount / 2.35);

    try {
      if (typeof global.generateStudioVoice === "function") {
        const res = global.generateStudioVoice(sc.narration, mp3Path, VOICE_MODEL);
        if (res && typeof res.then === "function") {
          await res;
        }
      } else {
        generateSilentOrToneMp3Fallback(mp3Path, estimatedVoiceSec);
      }
    } catch (err) {
      console.warn(`[WARN] Fallback voice untuk ${sc.id}:`, err.message);
      generateSilentOrToneMp3Fallback(mp3Path, estimatedVoiceSec);
    }

    if (!fs.existsSync(mp3Path) || fs.statSync(mp3Path).size < 256) {
      generateSilentOrToneMp3Fallback(mp3Path, estimatedVoiceSec);
    }

    let measuredSec = getAudioDurationSec(mp3Path);
    if (measuredSec <= 0.2) {
      measuredSec = estimatedVoiceSec;
    }

    sc.voiceDuration = measuredSec;
    sc.prePad = prePad;
    sc.postPad = postPad;
    sc.rawDuration = Math.max(sc.minDuration, sc.voiceDuration + prePad + postPad);
  }

  // Hitung total durasi awal dan sesuaikan agar tepat >= 300 detik (5 menit) tanpa menabrakkan suara
  const sumRaw = SCENES.reduce((acc, s) => acc + s.rawDuration, 0);
  const extraNeeded = Math.max(0, TARGET_TOTAL_DURATION - sumRaw);
  const extraPerScene = extraNeeded / SCENES.length;

  let cursor = 0.0;
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    sc.duration = sc.rawDuration + extraPerScene;
    sc.startTime = cursor;
    sc.endTime = cursor + sc.duration;
    // Voiceover selalu mulai setelah prePad dari startTime adegan, dan selesai sebelum endTime - postPad
    sc.voiceStartTime = sc.startTime + sc.prePad;
    sc.voiceEndTime = sc.voiceStartTime + sc.voiceDuration;
    cursor = sc.endTime;

    // Pecah kata untuk animasi subtitle sinkron & lip-sync karakter
    const words = sc.narration.trim().split(/\s+/);
    const totalChars = words.reduce((a, w) => a + w.length + 1, 0);
    let wCursor = sc.voiceStartTime;
    sc.wordTimings = words.map((w) => {
      const wDur = ( (w.length + 1) / totalChars ) * sc.voiceDuration;
      const item = {
        word: w,
        start: wCursor,
        end: wCursor + wDur
      };
      wCursor += wDur;
      return item;
    });

    console.log(
      `  -> ${sc.id} | Scene: [${sc.startTime.toFixed(2)}s - ${sc.endTime.toFixed(2)}s] | ` +
      `Voice: [${sc.voiceStartTime.toFixed(2)}s - ${sc.voiceEndTime.toFixed(2)}s] (${sc.voiceDuration.toFixed(2)}s)`
    );
  }

  const totalFinalDuration = cursor;
  console.log(`=== TOTAL DURASI TERKUNCI: ${totalFinalDuration.toFixed(2)} DETIK (${Math.round(totalFinalDuration * FPS)} FRAMES @ ${FPS} FPS) ===`);
  return totalFinalDuration;
}

// ============================================================================
// SYNTHESIZER EFEK SUARA (SFX) & AMBIENT MUSIK PROSEDURAL (WAV 44.1kHz STEREO)
// ============================================================================
function generateProceduralSfxWav(totalDurationSec, outWavPath) {
  console.log("=== [2/4] MENSINTESIS EFEK SUARA (SFX) SINEMATIK SESUAI JALAN CERITA ===");
  const sampleRate = 22050; // 22.05kHz Stereo untuk efisiensi memori & kejernihan SFX
  const totalSamples = Math.ceil(totalDurationSec * sampleRate);
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // Header WAV standar
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PRNG deterministik untuk noise ledakan & klik Geiger Counter
  let seed = 19860426;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  }

  let lowPassState = 0;
  let geigerHoldSamples = 0;
  let geigerFreq = 2400;

  let sceneIdx = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    while (sceneIdx < SCENES.length - 1 && t >= SCENES[sceneIdx].endTime) {
      sceneIdx++;
    }
    const sc = SCENES[sceneIdx];
    const localT = t - sc.startTime;
    const sceneProgress = Math.max(0, Math.min(1, localT / sc.duration));

    // Ducking volume SFX saat karakter sedang berbicara agar narasi jernih 100%
    const isSpeaking = t >= sc.voiceStartTime && t <= sc.voiceEndTime;
    const duckGain = isSpeaking ? 0.24 : 0.58;

    let left = 0;
    let right = 0;

    // 1. Sub-bass & Drone Atmosferik sesuai Babak
    const baseFreq = sceneIdx >= 5 && sceneIdx <= 12 ? 55.0 : 65.41; // A1 (tegang) vs C2 (ilmiah/harapan)
    const fifthFreq = baseFreq * 1.498;
    const minorThirdFreq = baseFreq * (sceneIdx >= 5 && sceneIdx <= 12 ? 1.189 : 1.26);
    const padSlowMod = 0.5 + 0.5 * Math.sin(t * 0.45);
    const drone =
      0.08 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.04 * Math.sin(2 * Math.PI * fifthFreq * t + Math.sin(t * 0.8)) +
      0.03 * padSlowMod * Math.sin(2 * Math.PI * minorThirdFreq * t);
    left += drone;
    right += drone * 0.95;

    // 2. Detak Jantung Sinematik saat ketegangan Chernobyl (Scene 6 - 11)
    if (sceneIdx >= 5 && sceneIdx <= 10) {
      const beatPeriod = sceneIdx >= 8 ? 0.62 : 0.88;
      const beatPhase = t % beatPeriod;
      if (beatPhase < 0.12) {
        const env = Math.sin((beatPhase / 0.12) * Math.PI);
        const thump = Math.sin(2 * Math.PI * 46 * beatPhase) * env * 0.16;
        left += thump;
        right += thump;
      } else if (beatPhase >= 0.16 && beatPhase < 0.28) {
        const env2 = Math.sin(((beatPhase - 0.16) / 0.12) * Math.PI);
        const thump2 = Math.sin(2 * Math.PI * 38 * (beatPhase - 0.16)) * env2 * 0.11;
        left += thump2;
        right += thump2;
      }
    }

    // 3. Efek Spesifik per Adegan
    if (sc.sfxType === "atom_pulse" || sc.sfxType === "chain_reaction") {
      // Dengung partikel kuantum & zap tumbukan neutron
      const shimmer = 0.04 * Math.sin(2 * Math.PI * (440 + 180 * Math.sin(t * 3.5)) * t);
      const pulseGate = Math.pow(Math.max(0, Math.sin(t * (sc.sfxType === "chain_reaction" ? 9.0 : 3.5))), 8);
      const zap = pulseGate * 0.12 * Math.sin(2 * Math.PI * (880 - 300 * (t % 0.3)) * t);
      left += shimmer + zap;
      right += shimmer * 0.8 + zap * 1.1;
    } else if (sc.sfxType === "reactor_core" || sc.sfxType === "turbine_spin") {
      // Deru turbin uap & mekanisme batang kendali
      const rpmFreq = sc.sfxType === "turbine_spin" ? 100 + 25 * Math.sin(t * 0.5) : 72;
      const hum =
        0.06 * Math.sin(2 * Math.PI * rpmFreq * t) +
        0.03 * Math.sin(2 * Math.PI * rpmFreq * 2 * t);
      const steamNoise = rand() * 0.025;
      lowPassState = 0.88 * lowPassState + 0.12 * steamNoise;
      left += hum + lowPassState;
      right += hum + lowPassState;
    } else if (sc.sfxType === "void_boiling") {
      // Gelembung uap bertekanan tinggi mendidih di pipa RBMK
      const rumble = rand() * (0.06 + 0.08 * sceneProgress);
      lowPassState = 0.92 * lowPassState + 0.08 * rumble;
      const pipePing = Math.pow(Math.max(0, Math.sin(t * 6.5)), 14) * 0.09 * Math.sin(2 * Math.PI * 1120 * t);
      left += lowPassState + pipePing;
      right += lowPassState + pipePing * 0.9;
    } else if (sc.sfxType === "az5_alarm") {
      // Sirene Darurat Ruang Kontrol AZ-5 (Dual-tone Soviet Klaxon)
      const sirenCycle = t % 1.1;
      const sirenFreq = sirenCycle < 0.55 ? 680 + 180 * (sirenCycle / 0.55) : 860 - 180 * ((sirenCycle - 0.55) / 0.55);
      const sirenWave =
        0.13 * Math.sin(2 * Math.PI * sirenFreq * t) +
        0.06 * Math.sign(Math.sin(2 * Math.PI * sirenFreq * t));
      const steamBuild = rand() * 0.12 * sceneProgress;
      lowPassState = 0.9 * lowPassState + 0.1 * steamBuild;
      left += sirenWave * 0.85 + lowPassState;
      right += sirenWave + lowPassState;
    } else if (sc.sfxType === "explosion_blast") {
      // Dua Ledakan Dahsyat Chernobyl (Detik ke-1.2 dan ke-4.0 dalam scene_10)
      const blast1T = localT - 1.2;
      const blast2T = localT - 4.0;
      let blastAmp = 0;
      if (blast1T >= 0 && blast1T < 3.5) {
        blastAmp += 0.55 * Math.exp(-blast1T * 1.35);
      }
      if (blast2T >= 0 && blast2T < 6.5) {
        blastAmp += 0.75 * Math.exp(-blast2T * 0.75);
      }
      const rawNoise = rand();
      lowPassState = 0.93 * lowPassState + 0.07 * rawNoise;
      const subBoom =
        blastAmp *
        (lowPassState * 2.4 + 0.35 * Math.sin(2 * Math.PI * 34 * localT) + 0.18 * rawNoise);
      left += subBoom;
      right += subBoom * 0.96;
    } else if (sc.sfxType === "helicopter_drop") {
      // Baling-baling Helikopter Mi-8 Likuidator
      const bladeGate = 0.5 + 0.5 * Math.sin(2 * Math.PI * 11.5 * t);
      const rotorNoise = rand() * 0.14 * Math.pow(bladeGate, 3);
      lowPassState = 0.84 * lowPassState + 0.16 * rotorNoise;
      left += lowPassState * 1.2;
      right += lowPassState * 0.9;
    } else if (sc.sfxType === "evac_siren") {
      // Sirene Evakuasi Kota Pripyat dari kejauhan
      const wailFreq = 480 + 160 * Math.sin(2 * Math.PI * 0.28 * t);
      const wail = 0.07 * Math.sin(2 * Math.PI * wailFreq * t);
      left += wail;
      right += wail * 0.85;
    }

    // 4. Detektor Radiasi Geiger-Müller Counter (Aktif sesuai intensitas geigerCpm)
    const cpm = sc.geigerCpm || 20;
    const clicksPerSec = Math.min(180, cpm / 25);
    const clickProb = clicksPerSec / sampleRate;
    if (geigerHoldSamples <= 0 && (seed & 0xffff) / 65536 < clickProb) {
      geigerHoldSamples = Math.floor(sampleRate * 0.0018);
      geigerFreq = 2100 + ((seed >>> 8) % 1400);
    }
    if (geigerHoldSamples > 0) {
      const clickWave = 0.22 * Math.sin(2 * Math.PI * geigerFreq * t) * (rand() * 0.5 + 0.5);
      left += clickWave;
      right += clickWave;
      geigerHoldSamples--;
    }

    // Transisi lembut di awal & akhir adegan (Whoosh pendek)
    if (localT < 0.35) {
      const wEnv = Math.sin((localT / 0.35) * Math.PI);
      const whoosh = rand() * 0.04 * wEnv;
      left += whoosh;
      right += whoosh;
    }

    // Terapkan ducking gain & soft clipping
    const outL = Math.max(-0.95, Math.min(0.95, left * duckGain));
    const outR = Math.max(-0.95, Math.min(0.95, right * duckGain));

    const offset = 44 + i * 4;
    buffer.writeInt16LE(Math.floor(outL * 32767), offset);
    buffer.writeInt16LE(Math.floor(outR * 32767), offset + 2);
  }

  fs.writeFileSync(outWavPath, buffer);
}

// ============================================================================
// PENGGABUNGAN AUDIO MASTER (VOICEOVER + SFX TANPA TABRAKAN, TANPA ATEMPO=1.18)
// ============================================================================
function buildMasterAudioTrack(totalDurationSec, sfxWavPath, masterAudioPath) {
  console.log("=== [3/4] MENGGABUNGKAN TRACK VOICEOVER & SFX DENGAN FFMPEG ===");
  const inputs = ["-y", "-i", sfxWavPath];
  const filterParts = [];
  const mixLabels = ["[0:a]"];

  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    inputs.push("-i", sc.voicePath);
    const delayMs = Math.round(sc.voiceStartTime * 1000);
    const inIdx = i + 1;
    // Gunakan adelay presisi milidetik & volume boost jernih (tanpa atempo=1.18)
    filterParts.push(
      `[${inIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,adelay=${delayMs}|${delayMs}[v${i}]`
    );
    mixLabels.push(`[v${i}]`);
  }

  const totalInputsCount = SCENES.length + 1;
  filterParts.push(
    `${mixLabels.join("")}amix=inputs=${totalInputsCount}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[aout]`
  );

  const filterComplex = filterParts.join(";");
  execFileSync("ffmpeg", [
    ...inputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[aout]",
    "-t",
    totalDurationSec.toFixed(3),
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    masterAudioPath
  ]);
}

// ============================================================================
// ENGINE GRAFIS & ANIMASI MANUSIA, FISIKA NUKLIR, DAN CHERNOBYL (60 FPS)
// ============================================================================
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeInOutCubic(x) {
  const c = clamp(x, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
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

/**
 * Menggambar Karakter Manusia Artikulasi Penuh (Kepala, Ekspresi, Lip-Sync,
 * Kacamata/Topi Operator/Masker Hazmat, Torso, Tangan Bersendi, Kaki Berjalan, & Properti)
 */
function drawArticulatedHuman(ctx, opts) {
  const {
    x,
    y,
    scale = 1.0,
    role = "scientist", // "scientist" | "operator" | "firefighter" | "liquidator"
    emotion = "normal", // "normal" | "excited" | "shocked" | "panicked" | "somber"
    isSpeaking = false,
    speechPhase = 0,
    time = 0,
    walkSpeed = 0,
    pointAngle = -0.5,
    prop = "none", // "atom_orb" | "pointer" | "clipboard" | "geiger" | "az5_hand"
    facing = 1
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);

  // Gerakan bernapas & berjalan
  const breath = Math.sin(time * 2.6) * 3.5;
  const walkCycle = walkSpeed > 0 ? Math.sin(time * 6.5) * walkSpeed : 0;
  const bodyBob = Math.abs(walkCycle) * 6;

  ctx.translate(0, -bodyBob + breath);

  // Warna pakaian berdasarkan peran cerita
  let coatColor = "#f1f5f9";
  let shirtColor = "#1e293b";
  let tieColor = "#0ea5e9";
  let pantsColor = "#0f172a";
  let skinColor = "#f4c29f";

  if (role === "operator") {
    coatColor = "#e2e8f0";
    shirtColor = "#334155";
    tieColor = "#dc2626";
    pantsColor = "#1e293b";
  } else if (role === "firefighter") {
    coatColor = "#9a3412";
    shirtColor = "#431407";
    tieColor = "#facc15";
    pantsColor = "#7c2d12";
  } else if (role === "liquidator") {
    coatColor = "#3f6212";
    shirtColor = "#1a2e05";
    tieColor = "#eab308";
    pantsColor = "#365314";
  }

  // Bayangan lantai di bawah kaki
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  ctx.ellipse(0, 210 + bodyBob - breath, 68, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- KAKI BELAKANG & DEPAN (Berjalan / Berdiri) ----
  const drawLeg = (hipX, phaseOffset, isFront) => {
    const swing = Math.sin(time * 6.5 + phaseOffset) * 0.35 * walkSpeed;
    const kneeBend = Math.max(0, Math.cos(time * 6.5 + phaseOffset)) * 0.3 * walkSpeed;

    ctx.save();
    ctx.translate(hipX, 75);
    ctx.rotate(swing);

    // Paha
    ctx.strokeStyle = isFront ? pantsColor : "#090d16";
    ctx.lineWidth = 24;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 65);
    ctx.stroke();

    // Betis & Sepatu
    ctx.translate(0, 65);
    ctx.rotate(kneeBend);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 62);
    ctx.stroke();

    // Sepatu
    ctx.fillStyle = "#111827";
    drawRoundedRect(ctx, -12, 55, 38, 18, 8);
    ctx.fill();
    ctx.restore();
  };

  drawLeg(-18, Math.PI, false);
  drawLeg(18, 0, true);

  // ---- LENGAN BELAKANG ----
  ctx.save();
  ctx.translate(-36, -42);
  const backArmAngle = 0.25 + Math.sin(time * 2.2) * 0.08 - walkCycle * 0.3;
  ctx.rotate(backArmAngle);
  ctx.strokeStyle = coatColor;
  ctx.lineWidth = 20;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-10, 58);
  ctx.stroke();

  ctx.translate(-10, 58);
  ctx.rotate(-0.35 + Math.cos(time * 2.5) * 0.1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(12, 52);
  ctx.stroke();

  // Telapak tangan belakang
  ctx.fillStyle = role === "liquidator" ? "#1f2937" : skinColor;
  ctx.beginPath();
  ctx.arc(12, 56, 10, 0, Math.PI * 2);
  ctx.fill();

  if (prop === "clipboard") {
    ctx.fillStyle = "#92400e";
    drawRoundedRect(ctx, -6, 42, 36, 48, 4);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    drawRoundedRect(ctx, -2, 47, 28, 38, 2);
    ctx.fill();
  }
  ctx.restore();

  // ---- TORSO / BADAN & JAS LAB / SERAGAM ----
  ctx.save();
  // Kemeja dalam
  ctx.fillStyle = shirtColor;
  drawRoundedRect(ctx, -42, -58, 84, 138, 22);
  ctx.fill();

  // Dasi Ilmuwan / Operator
  if (role === "scientist" || role === "operator") {
    ctx.fillStyle = tieColor;
    ctx.beginPath();
    ctx.moveTo(-6, -48);
    ctx.lineTo(6, -48);
    ctx.lineTo(10, 22);
    ctx.lineTo(0, 36);
    ctx.lineTo(-10, 22);
    ctx.closePath();
    ctx.fill();
  }

  // Belahan Jas Lab / Jaket Pelindung
  ctx.fillStyle = coatColor;
  drawRoundedRect(ctx, -46, -58, 34, 144, 14);
  ctx.fill();
  drawRoundedRect(ctx, 12, -58, 34, 144, 14);
  ctx.fill();

  // Kerah Jas & Lencana Radiasi
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -56);
  ctx.lineTo(-32, -20);
  ctx.lineTo(-12, -10);
  ctx.moveTo(14, -56);
  ctx.lineTo(32, -20);
  ctx.lineTo(12, -10);
  ctx.stroke();

  // Lencana Dosimeter di Dada Kanan
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(28, -8, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(28, -8, 3, 0, Math.PI * 2);
  ctx.fill();

  // Rompi Timbal (Lead Apron) untuk Liquidator
  if (role === "liquidator" || role === "firefighter") {
    ctx.fillStyle = role === "liquidator" ? "rgba(30, 41, 59, 0.85)" : "rgba(234, 179, 8, 0.85)";
    ctx.fillRect(-44, 12, 88, 22);
  }
  ctx.restore();

  // ---- LEHER & KEPALA ARTIKULASI ----
  ctx.save();
  const headTilt =
    emotion === "shocked" || emotion === "panicked"
      ? Math.sin(time * 14) * 0.05
      : Math.sin(time * 1.8) * 0.06;
  ctx.translate(0, -64);
  ctx.rotate(headTilt);

  // Leher
  ctx.fillStyle = skinColor;
  drawRoundedRect(ctx, -13, -16, 26, 26, 8);
  ctx.fill();

  // Wajah / Kepala
  ctx.fillStyle = skinColor;
  drawRoundedRect(ctx, -38, -92, 76, 82, 32);
  ctx.fill();

  // Telinga
  ctx.beginPath();
  ctx.arc(-38, -50, 9, 0, Math.PI * 2);
  ctx.arc(38, -50, 9, 0, Math.PI * 2);
  ctx.fill();

  // Rambut / Topi Operator Chernobyl / Helm Pemadam / Masker Gas Liquidator
  if (role === "scientist") {
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, -76, 40, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // Jambul rambut dinamis
    ctx.beginPath();
    ctx.moveTo(-20, -98);
    ctx.quadraticCurveTo(5, -118, 28, -94);
    ctx.fill();
  } else if (role === "operator") {
    // Topi Putih Khas Operator Reaktor Nuklir Soviet (Shapka Putih)
    ctx.fillStyle = "#f8fafc";
    drawRoundedRect(ctx, -40, -112, 80, 34, 10);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-36, -90, 72, 8);
  } else if (role === "firefighter") {
    // Helm Pemadam Kebakaran Chernobyl
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.arc(0, -78, 44, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-48, -80, 96, 8);
  } else if (role === "liquidator") {
    // Tudung Hazmat & Respirator Gas Mask
    ctx.fillStyle = "#3f6212";
    ctx.beginPath();
    ctx.arc(0, -68, 44, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
  }

  // ---- MATA, KEDIPAN, ALIS, DAN KACAMATA ----
  const blinkCycle = time % 3.8;
  const isBlinking = blinkCycle > 3.65;
  const eyeScaleY = isBlinking ? 0.1 : emotion === "shocked" || emotion === "panicked" ? 1.35 : 1.0;

  const drawEye = (ex) => {
    ctx.save();
    ctx.translate(ex, -56);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupil bergerak hidup
    const lookX = Math.sin(time * 1.4) * 2.5 + (facing > 0 ? 1.5 : -1.5);
    const pupilR = emotion === "shocked" || emotion === "panicked" ? 3.2 : 4.8;
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(lookX, 0, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Pantulan cahaya mata
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(lookX + 1.8, -2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawEye(-15);
  drawEye(15);

  // Alis Ekspresif
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const browLift =
    emotion === "shocked" ? -7 : emotion === "panicked" ? -5 : isSpeaking ? Math.sin(speechPhase * 8) * 3 : 0;
  const browTilt = emotion === "panicked" || emotion === "somber" ? -4 : 2;

  ctx.beginPath();
  ctx.moveTo(-26, -68 + browLift - browTilt);
  ctx.lineTo(-6, -70 + browLift + browTilt);
  ctx.moveTo(6, -70 + browLift + browTilt);
  ctx.lineTo(26, -68 + browLift - browTilt);
  ctx.stroke();

  // Kacamata Ilmuwan
  if (role === "scientist") {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, -28, -66, 24, 18, 5);
    ctx.stroke();
    drawRoundedRect(ctx, 4, -66, 24, 18, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -57);
    ctx.lineTo(4, -57);
    ctx.stroke();
  }

  // ---- MULUT LIP-SYNC REALISTIS ATAU MASKER RESPIRATOR ----
  if (role === "liquidator") {
    // Masker Respirator Anti-Radiasi
    ctx.fillStyle = "#1e293b";
    drawRoundedRect(ctx, -22, -44, 44, 30, 12);
    ctx.fill();
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(-14, -28, 9, 0, Math.PI * 2);
    ctx.arc(14, -28, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(0, -28);
    if (isSpeaking) {
      const openAmount =
        0.25 +
        0.75 * Math.abs(Math.sin(speechPhase * 13.5) * Math.cos(speechPhase * 7.2));
      const mouthW = 14 + openAmount * 8;
      const mouthH = 4 + openAmount * 14;
      ctx.fillStyle = "#450a0a";
      ctx.beginPath();
      ctx.ellipse(0, 0, mouthW * 0.6, mouthH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Gigi atas & lidah
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-mouthW * 0.38, -mouthH * 0.5, mouthW * 0.76, 3.5);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.ellipse(0, mouthH * 0.25, mouthW * 0.35, mouthH * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (emotion === "shocked" || emotion === "panicked") {
      ctx.fillStyle = "#450a0a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (emotion === "somber") {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-10, 3);
      ctx.quadraticCurveTo(0, -3, 10, 3);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-11, -2);
      ctx.quadraticCurveTo(0, 5, 11, -2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore(); // Akhir kepala

  // ---- LENGAN DEPAN ARTIKULASI & PROPERTI CERITA ----
  ctx.save();
  ctx.translate(34, -42);
  const gestureWave = isSpeaking ? Math.sin(time * 5.2) * 0.22 : Math.sin(time * 2.0) * 0.08;
  const upperArmRot = pointAngle + gestureWave;
  ctx.rotate(upperArmRot);

  // Lengan Atas
  ctx.strokeStyle = coatColor;
  ctx.lineWidth = 21;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(48, 18);
  ctx.stroke();

  // Siku & Lengan Bawah
  ctx.translate(48, 18);
  ctx.rotate(-0.45 + gestureWave * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(52, -10);
  ctx.stroke();

  // Tangan Depan
  ctx.translate(52, -10);
  ctx.fillStyle = role === "liquidator" ? "#1f2937" : skinColor;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();

  // Properti yang Dipegang Tangan Karakter
  if (prop === "atom_orb") {
    const pulse = 1 + 0.15 * Math.sin(time * 6);
    const grad = ctx.createRadialGradient(18, -18, 2, 18, -18, 42 * pulse);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#00f2fe");
    grad.addColorStop(1, "rgba(0, 242, 254, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(18, -18, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Orbit elektron mini di tangan
    ctx.strokeStyle = "rgba(56, 239, 125, 0.85)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      ctx.save();
      ctx.translate(18, -18);
      ctx.rotate((k * Math.PI) / 3 + time * 2.2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 28, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else if (prop === "pointer") {
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(85, -55);
    ctx.stroke();
    ctx.fillStyle = "#00f2fe";
    ctx.beginPath();
    ctx.arc(85, -55, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === "geiger") {
    // Alat Detektor Radiasi Dosimeter Kuning
    ctx.fillStyle = "#eab308";
    drawRoundedRect(ctx, -6, -24, 42, 28, 5);
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, -10);
    ctx.lineTo(75, -30 + Math.sin(time * 8) * 8);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

// ============================================================================
// ILUSTRASI SPESIFIK SETIAP ADEGAN CERITA (FULL MOTION & OBJECTS)
// ============================================================================

// ADEGAN 1-3: FISIKA INTI ATOM URANIUM-235, TUMBUKAN NEUTRON & REAKSI BERANTAI
function drawAtomicPhysicsStage(ctx, sc, localT, globalT, isSpeaking) {
  const cx = WIDTH * 0.5;
  const cy = HEIGHT * 0.37;

  // Grid Kuantum Bercahaya di Latar
  ctx.save();
  ctx.strokeStyle = "rgba(0, 242, 254, 0.12)";
  ctx.lineWidth = 1.5;
  for (let r = 80; r <= 440; r += 75) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.sin(globalT * 2 + r) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (sc.id === "scene_01") {
    // Visual Perbandingan Energi: 1 Pelet Uranium (Kiri) vs Gunung Batu Bara (Kanan) + Atom Pusat
    const glowGrad = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy - 30, 260);
    glowGrad.addColorStop(0, "rgba(0, 242, 254, 0.45)");
    glowGrad.addColorStop(1, "rgba(0, 242, 254, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 260, 0, Math.PI * 2);
    ctx.fill();

    // Orbit 3D Elektron Mengelilingi Inti Uranium
    for (let o = 0; o < 4; o++) {
      ctx.save();
      ctx.translate(cx, cy - 30);
      ctx.rotate((o * Math.PI) / 4 + globalT * 0.9);
      ctx.strokeStyle = "rgba(56, 239, 125, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 220, 68, 0, 0, Math.PI * 2);
      ctx.stroke();

      const elAngle = globalT * 3.8 + o * 1.7;
      const ex = Math.cos(elAngle) * 220;
      const ey = Math.sin(elAngle) * 68;
      ctx.fillStyle = "#00f2fe";
      ctx.beginPath();
      ctx.arc(ex, ey, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Inti Atom Uranium Berdenyut
    for (let n = 0; n < 28; n++) {
      const a = n * 2.39996 + globalT * 1.2;
      const rad = Math.sqrt(n) * 10.5;
      const nx = cx + Math.cos(a) * rad;
      const ny = cy - 30 + Math.sin(a) * rad;
      ctx.fillStyle = n % 2 === 0 ? "#ef4444" : "#38bdf8";
      ctx.beginPath();
      ctx.arc(nx, ny, 13, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kartu Komparasi Energi di Bawah Atom
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "#00f2fe";
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 90, cy + 220, 900, 130, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38ef7d";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("1 PELET URANIUM (7 GRAM)  =  1.000 KG BATU BARA", cx, cy + 278);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "26px sans-serif";
    ctx.fillText("Densitas Energi 2.000.000x Lipat Bahan Bakar Fosil", cx, cy + 322);
    ctx.restore();

    // Ilmuwan Dr. Arya menjelaskan sambil memegang bola atom
    drawArticulatedHuman(ctx, {
      x: 250,
      y: 1210,
      scale: 1.25,
      role: "scientist",
      emotion: "excited",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.65,
      prop: "atom_orb",
      facing: 1
    });
  } else if (sc.id === "scene_02") {
    // Simulasi Tumbukan Neutron ke Inti U-235 & Terbelah Menjadi Barium + Krypton
    const cycle = (localT % 6.5) / 6.5;
    if (cycle < 0.42) {
      // Fase 1: Neutron meluncur cepat menumbuk U-235
      const p = easeInOutCubic(cycle / 0.42);
      const neutronX = lerp(80, cx - 55, p);

      // Jejak Neutron
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(neutronX - 95, cy);
      ctx.lineTo(neutronX, cy);
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(neutronX, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      // Label Neutron
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEUTRON BEBAS (n⁰)", neutronX, cy - 38);

      // Inti U-235 Bergetar
      const shake = p > 0.8 ? (p - 0.8) * 55 : 4;
      for (let k = 0; k < 36; k++) {
        const ang = k * 2.4 + globalT * 2;
        const r = Math.sqrt(k) * 14;
        const px = cx + Math.cos(ang) * r + Math.sin(globalT * 40 + k) * shake;
        const py = cy + Math.sin(ang) * r + Math.cos(globalT * 40 + k) * shake;
        ctx.fillStyle = k % 2 === 0 ? "#f43f5e" : "#0ea5e9";
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("INTI URANIUM-235 (92p + 143n)", cx, cy + 155);
    } else {
      // Fase 2: Fisi Nuklir! Terbelah menjadi Ba-141 & Kr-92 + Kilatan Energi + 3 Neutron Baru
      const splitP = easeInOutCubic((cycle - 0.42) / 0.58);
      const sep = splitP * 240;

      // Gelombang Kejut Energi Fisi
      ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - splitP).toFixed(3)})`;
      ctx.lineWidth = 14 * (1 - splitP);
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + splitP * 380, 0, Math.PI * 2);
      ctx.stroke();

      // Dua Inti Hasil Belahan (Barium-141 & Krypton-92)
      const drawCluster = (bx, by, label, count) => {
        for (let k = 0; k < count; k++) {
          const ang = k * 2.4 + globalT * 3;
          const r = Math.sqrt(k) * 12;
          ctx.fillStyle = k % 2 === 0 ? "#ef4444" : "#38bdf8";
          ctx.beginPath();
          ctx.arc(bx + Math.cos(ang) * r, by + Math.sin(ang) * r, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, bx, by + 105);
      };

      drawCluster(cx - sep, cy - sep * 0.35, "BARIUM-141", 18);
      drawCluster(cx + sep, cy + sep * 0.35, "KRYPTON-92", 14);

      // 3 Neutron Baru Terlontar
      const angles = [-0.6, 0.1, 0.75];
      angles.forEach((ang, idx) => {
        const nr = splitP * 340;
        const nx = cx + Math.cos(ang) * nr;
        const ny = cy + Math.sin(ang) * nr;
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(nx, ny, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(`n⁰ #${idx + 1}`, nx, ny - 24);
      });
    }

    drawArticulatedHuman(ctx, {
      x: 230,
      y: 1220,
      scale: 1.22,
      role: "scientist",
      emotion: "normal",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.8,
      prop: "pointer",
      facing: 1
    });
  } else {
    // Scene 03: Pohon Reaksi Berantai Eksponensial (1 -> 3 -> 9 -> 27) & Rumus E = mc^2
    const levels = 4;
    const treeTopY = 390;
    const levelH = 145;
    const animWave = (localT % 4.5) / 4.5;

    for (let lv = 0; lv < levels; lv++) {
      const count = Math.pow(2, lv);
      const yPos = treeTopY + lv * levelH;
      const spreadW = 760;

      for (let idx = 0; idx < count; idx++) {
        const xPos = cx - spreadW / 2 + ((idx + 0.5) / count) * spreadW;

        if (lv < levels - 1) {
          const nextCount = Math.pow(2, lv + 1);
          const child1X = cx - spreadW / 2 + ((idx * 2 + 0.5) / nextCount) * spreadW;
          const child2X = cx - spreadW / 2 + ((idx * 2 + 1.5) / nextCount) * spreadW;
          const nextY = treeTopY + (lv + 1) * levelH;

          ctx.strokeStyle = "rgba(247, 151, 30, 0.65)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(xPos, yPos);
          ctx.lineTo(child1X, nextY);
          ctx.moveTo(xPos, yPos);
          ctx.lineTo(child2X, nextY);
          ctx.stroke();

          // Partikel neutron mengalir di sepanjang garis cabang
          const pT = (animWave * 3 - lv * 0.4 + 3) % 1;
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(lerp(xPos, child1X, pT), lerp(yPos, nextY, pT), 8, 0, Math.PI * 2);
          ctx.arc(lerp(xPos, child2X, pT), lerp(yPos, nextY, pT), 8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Simpul Inti Uranium
        const pulse = 1 + 0.2 * Math.sin(globalT * 6 - lv);
        ctx.fillStyle = lv === levels - 1 ? "#ef4444" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(xPos, yPos, 22 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Banner Hologram E = mc²
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 220, 915, 640, 120, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("E = m · c²", cx, 995);
    ctx.restore();

    drawArticulatedHuman(ctx, {
      x: 820,
      y: 1220,
      scale: 1.22,
      role: "scientist",
      emotion: "excited",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.75,
      prop: "pointer",
      facing: -1
    });
  }
}

// ADEGAN 4-5: CARA KERJA PLTN (TERAS REAKTOR, BATANG KENDALI, TURBIN UAP, MENARA PENDINGIN)
function drawNuclearPlantStage(ctx, sc, localT, globalT, isSpeaking) {
  if (sc.id === "scene_04") {
    // Bejana Reaktor Terbuka dengan Batang Bahan Bakar & Batang Kendali Boron Naik-Turun
    const rx = 280;
    const ry = 370;
    const rw = 520;
    const rh = 560;

    // Bejana Tekan Baja
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 6;
    drawRoundedRect(ctx, rx, ry, rw, rh, 48);
    ctx.fill();
    ctx.stroke();

    // Air Pendingin Berpendar Cherenkov Biru
    const rodInsertion = 0.5 + 0.38 * Math.sin(globalT * 1.1); // 0 = cabut, 1 = masuk penuh
    const reactivity = 1 - rodInsertion;
    const waterGrad = ctx.createLinearGradient(rx, ry + 80, rx, ry + rh);
    waterGrad.addColorStop(0, `rgba(0, 210, 255, ${(0.25 + reactivity * 0.45).toFixed(3)})`);
    waterGrad.addColorStop(1, `rgba(255, 81, 47, ${(0.15 + reactivity * 0.55).toFixed(3)})`);
    ctx.fillStyle = waterGrad;
    drawRoundedRect(ctx, rx + 20, ry + 90, rw - 40, rh - 110, 32);
    ctx.fill();

    // 5 Batang Bahan Bakar Uranium-235 (Tetap)
    for (let i = 0; i < 5; i++) {
      const fx = rx + 65 + i * 95;
      ctx.fillStyle = "#f97316";
      drawRoundedRect(ctx, fx - 14, ry + 160, 28, 330, 8);
      ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("U-235", fx, ry + 518);
    }

    // 4 Batang Kendali Boron (Bergerak Naik-Turun Secara Dinamis)
    const rodY = ry + 30 + rodInsertion * 180;
    for (let i = 0; i < 4; i++) {
      const cxRod = rx + 112 + i * 95;
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cxRod - 4, ry - 45, 8, rodY - (ry - 45));
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38ef7d";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, cxRod - 16, rodY, 32, 260, 6);
      ctx.fill();
      ctx.stroke();
    }

    // Panel Status Reaktivitas
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    drawRoundedRect(ctx, 140, 960, 800, 105, 18);
    ctx.fill();
    ctx.fillStyle = "#38ef7d";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `POSISI BATANG KENDALI BORON: ${Math.round(rodInsertion * 100)}%  |  SUHU TERAS: ${Math.round(280 + reactivity * 320)}°C`,
      WIDTH / 2,
      1022
    );

    drawArticulatedHuman(ctx, {
      x: 210,
      y: 1230,
      scale: 1.2,
      role: "scientist",
      emotion: "normal",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.7,
      prop: "pointer",
      facing: 1
    });
  } else {
    // Scene 05: Diagram Lengkap Siklus Uap PLTN -> Turbin -> Generator -> Menara Pendingin & Kota
    // 1. Reaktor (Kiri)
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, 80, 460, 190, 270, 24);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fb923c";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REAKTOR", 175, 600);

    // Pipa Uap Panas (Merah) menuju Turbin
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(270, 510);
    ctx.lineTo(520, 510);
    ctx.stroke();

    // Partikel uap mengalir
    for (let p = 0; p < 6; p++) {
      const px = 280 + (((globalT * 140 + p * 42) % 230));
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(px, 510, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Turbin Raksasa Berputar (Tengah)
    const tx = 540;
    const ty = 510;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bilah Turbin Berputar 60 FPS
    ctx.rotate(globalT * 8.5);
    for (let b = 0; b < 8; b++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#38bdf8";
      drawRoundedRect(ctx, -8, -82, 16, 70, 5);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("TURBIN & GENERATOR", tx, ty + 132);

    // 3. Menara Pendingin Hyperbolic (Kanan)
    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(760, 740);
    ctx.quadraticCurveTo(805, 580, 785, 450);
    ctx.lineTo(935, 450);
    ctx.quadraticCurveTo(915, 580, 960, 740);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Kepulan Uap Air Bersih dari Menara Pendingin
    for (let s = 0; s < 5; s++) {
      const sy = 430 - ((globalT * 45 + s * 32) % 150);
      const sr = 24 + ((430 - sy) * 0.25);
      ctx.fillStyle = `rgba(241, 245, 249, ${(0.55 - (430 - sy) / 300).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(860 + Math.sin(globalT * 2 + s) * 18, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Siluet Gedung Kota Menyala Terang oleh Listrik Bersih
    const cityY = 820;
    const buildings = [
      { x: 110, w: 95, h: 170 },
      { x: 220, w: 115, h: 220 },
      { x: 350, w: 90, h: 150 },
      { x: 460, w: 130, h: 210 },
      { x: 610, w: 105, h: 180 }
    ];
    buildings.forEach((b, bi) => {
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#00f2fe";
      ctx.lineWidth = 2;
      ctx.fillRect(b.x, cityY + (220 - b.h), b.w, b.h);
      ctx.strokeRect(b.x, cityY + (220 - b.h), b.w, b.h);

      // Jendela gedung menyala
      ctx.fillStyle = "#fde047";
      for (let wy = cityY + (240 - b.h); wy < cityY + 200; wy += 28) {
        for (let wx = b.x + 14; wx < b.x + b.w - 18; wx += 24) {
          if ((wx + wy + bi) % 3 !== 0) {
            ctx.fillRect(wx, wy, 12, 16);
          }
        }
      }
    });

    drawArticulatedHuman(ctx, {
      x: 830,
      y: 1230,
      scale: 1.2,
      role: "scientist",
      emotion: "excited",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.6,
      prop: "clipboard",
      facing: -1
    });
  }
}

// ADEGAN 6-10: KRONOLOGI PENYEBAB CHERNOBYL (RUANG KONTROL, XENON-135, KOEFISIEN RONGGA, AZ-5, LEDAKAN!)
function drawChernobylDisasterStage(ctx, sc, localT, globalT, isSpeaking) {
  const cx = WIDTH / 2;

  if (sc.id === "scene_06" || sc.id === "scene_07" || sc.id === "scene_09") {
    // Ruang Kontrol Reaktor Nomor 4 Chernobyl & Panel RBMK-1000
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = sc.id === "scene_09" ? "#ef4444" : "#64748b";
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, 70, 360, 940, 480, 24);
    ctx.fill();
    ctx.stroke();

    // Peta Indikator Bundar Teras RBMK (Selsyn Dial Map di Dinding Ruang Kontrol)
    const mapX = 310;
    const mapY = 585;
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(mapX, mapY, 155, 0, Math.PI * 2);
    ctx.fill();

    for (let gx = -4; gx <= 4; gx++) {
      for (let gy = -4; gy <= 4; gy++) {
        if (gx * gx + gy * gy <= 18) {
          const cellX = mapX + gx * 28;
          const cellY = mapY + gy * 28;
          const isHot =
            sc.id === "scene_09"
              ? Math.sin(globalT * 18 + gx * gy) > -0.2
              : sc.id === "scene_07"
              ? (gx + gy) % 4 === 0
              : true;
          ctx.fillStyle =
            sc.id === "scene_09"
              ? isHot
                ? "#ef4444"
                : "#f97316"
              : sc.id === "scene_07"
              ? isHot
                ? "#a855f7"
                : "#1e293b"
              : "#38bdf8";
          ctx.fillRect(cellX - 10, cellY - 10, 20, 20);
        }
      }
    }

    // Meteran Daya Termal Reaktor (MW) & Racun Xenon-135
    let displayedMw = sc.powerMw;
    if (sc.id === "scene_09") {
      const surge = easeInOutCubic(clamp((localT - 3.0) / 12.0, 0, 1));
      displayedMw = Math.round(200 + surge * 32800);
    }

    ctx.fillStyle = "#090d16";
    drawRoundedRect(ctx, 520, 410, 440, 180, 16);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DAYA TERMAL REAKTOR UNIT 4", 740, 452);

    ctx.fillStyle = sc.id === "scene_09" ? "#ef4444" : sc.id === "scene_07" ? "#f97316" : "#38ef7d";
    ctx.font = "bold 66px monospace";
    ctx.fillText(`${displayedMw.toLocaleString("id-ID")} MW`, 740, 535);

    if (sc.id === "scene_07") {
      // Visualisasi Akumulasi Gas Racun Xenon-135 (Ungu)
      ctx.fillStyle = "rgba(88, 28, 135, 0.85)";
      drawRoundedRect(ctx, 520, 620, 440, 180, 16);
      ctx.fill();
      ctx.fillStyle = "#e9d5ff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("AKUMULASI RACUN XENON-135", 740, 672);
      ctx.font = "23px sans-serif";
      ctx.fillText("Menyerap Neutron & Mencekik Teras!", 740, 718);
    } else if (sc.id === "scene_09") {
      // Tombol Darurat AZ-5 (SCRAM) Ditekan & Ilustrasi Ujung Grafit
      const isPressed = localT > 2.2;
      ctx.fillStyle = "#1e293b";
      drawRoundedRect(ctx, 520, 620, 440, 190, 16);
      ctx.fill();

      // Tombol Merah AZ-5
      ctx.fillStyle = isPressed ? "#ff0000" : "#7f1d1d";
      ctx.beginPath();
      ctx.arc(610, 715, isPressed ? 44 : 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("AZ-5", 610, 725);

      ctx.fillStyle = "#fca5a5";
      ctx.font = "bold 25px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("UJUNG GRAFIT TURUN:", 680, 690);
      ctx.fillStyle = "#fde047";
      ctx.font = "bold 23px sans-serif";
      ctx.fillText("Memicu Lonjakan 100x!", 680, 735);
    } else {
      // Scene 06: Status Tes Keamanan Turbin RBMK-1000
      ctx.fillStyle = "#0f172a";
      drawRoundedRect(ctx, 520, 620, 440, 180, 16);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("JADWAL UJI COBA TURBIN", 740, 680);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "23px sans-serif";
      ctx.fillText("Tertunda 10 Jam -> Kru Malam Masuk", 740, 728);
    }

    // Dua Karakter Operator Chernobyl (Akimov & Toptunov) + Narator
    drawArticulatedHuman(ctx, {
      x: 260,
      y: 1230,
      scale: 1.15,
      role: "operator",
      emotion: sc.id === "scene_09" ? "panicked" : "shocked",
      isSpeaking: false,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.9,
      prop: "none",
      facing: 1
    });

    drawArticulatedHuman(ctx, {
      x: 790,
      y: 1230,
      scale: 1.2,
      role: "scientist",
      emotion: sc.id === "scene_09" ? "shocked" : "somber",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.65,
      prop: "pointer",
      facing: -1
    });
  } else if (sc.id === "scene_08") {
    // Scene 08: Ilustrasi Teknis Koefisien Rongga Positif (Positive Void Coefficient) & Ujung Grafit
    const boxX = 120;
    const boxY = 370;
    const boxW = 840;
    const boxH = 620;

    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
    ctx.fill();
    ctx.stroke();

    // 3 Saluran Pipa Bahan Bakar RBMK dengan Blok Moderator Grafit di Kiri-Kanan
    for (let c = 0; c < 3; c++) {
      const chX = 260 + c * 280;

      // Blok Moderator Grafit Abu-Abu Gelap
      ctx.fillStyle = "#334155";
      ctx.fillRect(chX - 110, boxY + 70, 55, 480);
      ctx.fillRect(chX + 55, boxY + 70, 55, 480);

      // Saluran Air Mendidih
      ctx.fillStyle = "rgba(14, 165, 233, 0.35)";
      ctx.fillRect(chX - 50, boxY + 70, 100, 480);

      // Gelembung Uap (Void Bubbles) Naik Cepat
      for (let b = 0; b < 9; b++) {
        const by = boxY + 530 - ((globalT * 160 + b * 55 + c * 30) % 450);
        const bx = chX + Math.sin(globalT * 5 + b) * 22;
        ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
        ctx.beginPath();
        ctx.arc(bx, by, 14 + (b % 3) * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Batang Kendali Dicabut ke Atas + Ujung Displacer Grafit di Bawahnya
      const rodTop = boxY + 95;
      ctx.fillStyle = "#10b981"; // Bagian penyerap Boron (di atas luar teras!)
      ctx.fillRect(chX - 16, rodTop, 32, 95);
      ctx.fillStyle = "#f59e0b"; // Ujung Displacer Grafit!
      ctx.fillRect(chX - 16, rodTop + 125, 32, 110);
    }

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GELEMBUNG UAP NAIK -> DAYA NAIK -> MAKIN BANYAK UAP!", cx, boxY + 585);

    drawArticulatedHuman(ctx, {
      x: 240,
      y: 1230,
      scale: 1.2,
      role: "scientist",
      emotion: "shocked",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.8,
      prop: "pointer",
      facing: 1
    });
  } else {
    // Scene 10: PUKUL 01:23:45 — LEDAKAN REAKTOR NOMOR 4 CHERNOBYL & SINAR BIRU IONISASI
    const groundY = 930;

    // Pancaran Sinar Biru Ionisasi Udara (Cherenkov / Ionized Air Glow) Menembus Langit
    const beamGrad = ctx.createLinearGradient(cx - 140, groundY - 260, cx + 140, 120);
    beamGrad.addColorStop(0, "rgba(0, 242, 254, 0.85)");
    beamGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.35)");
    beamGrad.addColorStop(1, "rgba(0, 242, 254, 0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 95, groundY - 220);
    ctx.lineTo(cx - 240, 180);
    ctx.lineTo(cx + 240, 180);
    ctx.lineTo(cx + 95, groundY - 220);
    ctx.closePath();
    ctx.fill();

    // Bola Api & Kepulan Asap Grafit Radioaktif
    for (let f = 0; f < 14; f++) {
      const age = (globalT * 0.8 + f * 0.22) % 2.4;
      const fy = groundY - 210 - age * 210;
      const fx = cx + Math.sin(f * 3.1 + globalT * 2) * (40 + age * 65);
      const fr = 48 + age * 45;
      ctx.fillStyle =
        age < 0.7
          ? `rgba(255, 200, 30, ${(0.85 - age * 0.5).toFixed(3)})`
          : age < 1.4
          ? `rgba(239, 68, 68, ${(0.7 - (age - 0.7) * 0.5).toFixed(3)})`
          : `rgba(30, 41, 59, ${(0.75 - (age - 1.4) * 0.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gedung Reaktor Nomor 4 yang Hancur Terkoyak + Cerobong Vent Stack Ikonik
    ctx.fillStyle = "#334155";
    ctx.fillRect(160, groundY - 240, 760, 240);

    // Reruntuhan Atap & Tutup Biologis "Elena" (2.000 Ton) yang Miring
    ctx.save();
    ctx.translate(cx, groundY - 230);
    ctx.rotate(-0.42);
    ctx.fillStyle = "#64748b";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 4;
    ctx.fillRect(-115, -24, 230, 48);
    ctx.strokeRect(-115, -24, 230, 48);
    ctx.restore();

    // Cerobong Merah-Putih Chernobyl di atas gedung
    const chX = cx + 180;
    for (let seg = 0; seg < 6; seg++) {
      ctx.fillStyle = seg % 2 === 0 ? "#dc2626" : "#f8fafc";
      ctx.fillRect(chX - 18, groundY - 240 - (seg + 1) * 42, 36, 42);
    }

    drawArticulatedHuman(ctx, {
      x: 220,
      y: 1230,
      scale: 1.2,
      role: "operator",
      emotion: "panicked",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.8,
      prop: "none",
      facing: 1
    });
  }
}

// ADEGAN 11-15: DAMPAK CHERNOBYL, PEMADAM, LIKUIDATOR, PRIPYAT, DAN NEW SAFE CONFINEMENT
function drawAftermathAndFutureStage(ctx, sc, localT, globalT, isSpeaking) {
  const cx = WIDTH / 2;

  if (sc.id === "scene_11") {
    // Scene 11: Pemadam Kebakaran Heroik & Untaian Heliks Ganda DNA yang Terputus oleh Sinar Gamma
    const dnaX = 680;
    const dnaTop = 390;
    const dnaH = 520;

    // Gelombang Sinar Gamma Menembus DNA
    for (let g = 0; g < 5; g++) {
      const gy = dnaTop + 70 + g * 95;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let wx = 120; wx < dnaX - 40; wx += 12) {
        const wy = gy + Math.sin(wx * 0.18 - globalT * 16) * 14;
        if (wx === 120) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }

    // Heliks Ganda DNA dengan Ikatan yang Patah Akibat Radiasi Pengion
    for (let i = 0; i < 18; i++) {
      const y = dnaTop + (i / 18) * dnaH;
      const phase = i * 0.48 + globalT * 3.2;
      const x1 = dnaX + Math.sin(phase) * 95;
      const x2 = dnaX - Math.sin(phase) * 95;

      const isBroken = i === 7 || i === 12;
      ctx.strokeStyle = isBroken ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (isBroken) {
        ctx.moveTo(x1, y);
        ctx.lineTo((x1 + x2) / 2 - 22, y - 14);
        ctx.moveTo((x1 + x2) / 2 + 22, y + 14);
        ctx.lineTo(x2, y);
      } else {
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
      }
      ctx.stroke();

      ctx.fillStyle = isBroken ? "#f43f5e" : "#00f2fe";
      ctx.beginPath();
      ctx.arc(x1, y, 10, 0, Math.PI * 2);
      ctx.arc(x2, y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IONISASI SINAR GAMMA MEMUTUS RANTAI DNA SEL", cx, 975);

    drawArticulatedHuman(ctx, {
      x: 260,
      y: 1230,
      scale: 1.22,
      role: "firefighter",
      emotion: "somber",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.5,
      prop: "geiger",
      facing: 1
    });
  } else if (sc.id === "scene_12") {
    // Scene 12: Helikopter Mi-8 Menjatuhkan Boron & Timbal ke Kawah Teras + Likuidator
    const heliX = cx + Math.sin(globalT * 1.4) * 140;
    const heliY = 460 + Math.cos(globalT * 2.8) * 16;

    // Badan Helikopter Mi-8
    ctx.save();
    ctx.translate(heliX, heliY);
    ctx.fillStyle = "#4d7c0f";
    drawRoundedRect(ctx, -110, -36, 190, 72, 28);
    ctx.fill();
    ctx.fillRect(-230, -18, 130, 22);
    // Kaca Kokpit
    ctx.fillStyle = "#38bdf8";
    drawRoundedRect(ctx, 25, -26, 48, 34, 10);
    ctx.fill();
    // Baling-baling Utama Berputar Cepat
    const rotorW = 240 * Math.cos(globalT * 32);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-rotorW, -48);
    ctx.lineTo(rotorW, -48);
    ctx.stroke();
    ctx.restore();

    // Karung Pasir, Timbal & Boron Jatuh ke Kawah Reaktor yang Membara
    for (let d = 0; d < 8; d++) {
      const dropP = ((globalT * 0.9 + d * 0.125) % 1);
      const dx = lerp(heliX, cx + (d - 3.5) * 24, dropP);
      const dy = lerp(heliY + 45, 890, dropP * dropP);
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(dx, dy, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Kawah Reaktor Membara di Bawah
    const craterGrad = ctx.createRadialGradient(cx, 920, 20, cx, 920, 260);
    craterGrad.addColorStop(0, "#fef08a");
    craterGrad.addColorStop(0.4, "#ef4444");
    craterGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = craterGrad;
    ctx.beginPath();
    ctx.arc(cx, 920, 260, Math.PI, Math.PI * 2);
    ctx.fill();

    drawArticulatedHuman(ctx, {
      x: 240,
      y: 1230,
      scale: 1.22,
      role: "liquidator",
      emotion: "somber",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.6,
      prop: "geiger",
      facing: 1
    });
  } else if (sc.id === "scene_13") {
    // Scene 13: Bianglala Ikonik Kota Hantu Pripyat, Hutan Merah (Red Forest), & Konvoi Bus Evakuasi
    const wheelX = 330;
    const wheelY = 580;
    const wheelR = 165;

    // Bianglala Pripyat
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    for (let s = 0; s < 12; s++) {
      const ang = (s * Math.PI) / 6 + globalT * 0.12;
      const gx = wheelX + Math.cos(ang) * wheelR;
      const gy = wheelY + Math.sin(ang) * wheelR;
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wheelX, wheelY);
      ctx.lineTo(gx, gy);
      ctx.stroke();

      // Kabin Kuning Bianglala Pripyat
      ctx.fillStyle = "#eab308";
      drawRoundedRect(ctx, gx - 16, gy, 32, 24, 6);
      ctx.fill();
    }

    // Kaki Penyangga Bianglala
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(wheelX - 95, 840);
    ctx.lineTo(wheelX, wheelY);
    ctx.lineTo(wheelX + 95, 840);
    ctx.stroke();

    // Pohon-Pohon Pinus Hutan Merah (Red Forest) di Kanan
    for (let tIdx = 0; tIdx < 4; tIdx++) {
      const tx = 650 + tIdx * 95;
      const ty = 840;
      ctx.fillStyle = "#451a03";
      ctx.fillRect(tx - 10, ty - 70, 20, 70);
      ctx.fillStyle = "#b91c1c"; // Daun pinus mati berubah merah karat
      ctx.beginPath();
      ctx.moveTo(tx, ty - 220);
      ctx.lineTo(tx - 48, ty - 65);
      ctx.lineTo(tx + 48, ty - 65);
      ctx.closePath();
      ctx.fill();
    }

    // Konvoi Bus Evakuasi Bergerak
    const busX = ((localT * 110) % 1200) - 150;
    ctx.fillStyle = "#f97316";
    drawRoundedRect(ctx, busX, 855, 190, 68, 12);
    ctx.fill();
    ctx.fillStyle = "#fef08a";
    for (let w = 0; w < 5; w++) {
      ctx.fillRect(busX + 18 + w * 34, 868, 24, 22);
    }

    drawArticulatedHuman(ctx, {
      x: 820,
      y: 1230,
      scale: 1.2,
      role: "scientist",
      emotion: "somber",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.5,
      prop: "geiger",
      facing: -1
    });
  } else {
    // Scene 14 & 15: Kubah Baja New Safe Confinement & Masa Depan Energi Bersih
    const archY = 860;
    const slideProgress = sc.id === "scene_14" ? easeInOutCubic(clamp(localT / 8.0, 0, 1)) : 1.0;

    // Sarkofagus Lama di Tengah
    ctx.fillStyle = "#475569";
    ctx.fillRect(cx - 170, archY - 210, 340, 210);

    // Struktur Kubah Lengkung Baja "New Safe Confinement" Bergeser Menutupi Reaktor
    const archX = lerp(cx - 320, cx, slideProgress);
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "rgba(148, 163, 184, 0.88)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(archX, archY, 310, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rangka Baja Kubah (Truss Grid)
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 3;
    for (let a = 1; a < 8; a++) {
      const radAngle = Math.PI + (a * Math.PI) / 8;
      ctx.beginPath();
      ctx.moveTo(archX, archY);
      ctx.lineTo(archX + Math.cos(radAngle) * 310, archY + Math.sin(radAngle) * 310);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#38ef7d";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      sc.id === "scene_14"
        ? "NEW SAFE CONFINEMENT (36.000 TON BAJA PELINDUNG)"
        : "ENERGI NUKLIR MODERN: BERSIH, AMAN & BERKELANJUTAN",
      cx,
      935
    );

    drawArticulatedHuman(ctx, {
      x: cx,
      y: 1230,
      scale: 1.24,
      role: "scientist",
      emotion: "excited",
      isSpeaking,
      speechPhase: globalT,
      time: globalT,
      pointAngle: -0.65,
      prop: sc.id === "scene_15" ? "atom_orb" : "clipboard",
      facing: 1
    });
  }
}

// ============================================================================
// HUD TELEMETRI, HEADER SINEMATIK & SUBTITLE KARAOKE 9:16
// ============================================================================
function drawHudAndSubtitles(ctx, sc, globalT, totalDurationSec) {
  // 1. Header Atas (Babak, Judul Adegan, Timestamp, & Geiger Counter)
  ctx.save();
  ctx.fillStyle = "rgba(9, 13, 22, 0.86)";
  ctx.strokeStyle = sc.themeColor;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 48, 56, WIDTH - 96, 225, 26);
  ctx.fill();
  ctx.stroke();

  // Badge Babak
  ctx.fillStyle = sc.themeColor;
  drawRoundedRect(ctx, 82, 82, 490, 44, 12);
  ctx.fill();
  ctx.fillStyle = "#090d16";
  ctx.font = "bold 23px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(sc.act, 102, 112);

  // Indikator Geiger Counter Live di Kanan Atas
  const liveCpm = Math.max(
    12,
    Math.round(sc.geigerCpm + Math.sin(globalT * 11) * (sc.geigerCpm * 0.08 + 2))
  );
  ctx.fillStyle = sc.geigerCpm > 1000 ? "#ef4444" : "#facc15";
  ctx.font = "bold 25px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`☢ GEIGER: ${liveCpm.toLocaleString("id-ID")} CPM`, WIDTH - 82, 112);

  // Judul Adegan
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 40px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(sc.title, 82, 178);

  // Label Waktu / Lokasi
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 25px monospace";
  ctx.fillText(`📍 ${sc.timeLabel}`, 82, 232);
  ctx.restore();

  // 2. Kotak Subtitle Dinamis (Karaoke Highlight Kata demi Kata) di Bagian Bawah 9:16
  ctx.save();
  const subBoxX = 54;
  const subBoxY = 1445;
  const subBoxW = WIDTH - 108;
  const subBoxH = 365;

  ctx.fillStyle = "rgba(9, 13, 22, 0.9)";
  ctx.strokeStyle = sc.themeColor;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, subBoxX, subBoxY, subBoxW, subBoxH, 28);
  ctx.fill();
  ctx.stroke();

  // Cari indeks kata yang sedang diucapkan saat ini
  const timings = sc.wordTimings || [];
  let activeWordIdx = -1;
  for (let i = 0; i < timings.length; i++) {
    if (globalT >= timings[i].start && globalT <= timings[i].end) {
      activeWordIdx = i;
      break;
    } else if (globalT > timings[i].end) {
      activeWordIdx = i;
    }
  }

  // Tampilkan jendela 14 kata di sekitar kata aktif agar teks besar, jelas, dan mudah dibaca di 9:16
  const chunkSize = 14;
  const chunkIndex = Math.max(0, Math.floor(Math.max(0, activeWordIdx) / chunkSize));
  const sliceStart = chunkIndex * chunkSize;
  const visibleWords = timings.slice(sliceStart, sliceStart + chunkSize);

  ctx.font = "bold 42px sans-serif";
  const maxLineWidth = subBoxW - 90;
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  visibleWords.forEach((wObj, idx) => {
    const absIdx = sliceStart + idx;
    const wordStr = wObj.word + " ";
    const wWidth = ctx.measureText(wordStr).width;
    if (currentWidth + wWidth > maxLineWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    }
    currentLine.push({ ...wObj, absIdx, wordStr, wWidth });
    currentWidth += wWidth;
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const lineHeight = 64;
  const startTextY = subBoxY + (subBoxH - lines.length * lineHeight) / 2 + 42;

  lines.forEach((line, lIdx) => {
    const totalLineW = line.reduce((acc, item) => acc + item.wWidth, 0);
    let cursorX = subBoxX + (subBoxW - totalLineW) / 2;
    const yPos = startTextY + lIdx * lineHeight;

    line.forEach((item) => {
      const isCurrent = item.absIdx === activeWordIdx && globalT >= sc.voiceStartTime && globalT <= sc.voiceEndTime;
      const isSpoken = item.absIdx < activeWordIdx || globalT > sc.voiceEndTime;

      if (isCurrent) {
        ctx.fillStyle = sc.themeColor;
        drawRoundedRect(ctx, cursorX - 6, yPos - 40, item.wWidth + 4, 52, 10);
        ctx.fill();
        ctx.fillStyle = "#090d16";
      } else if (isSpoken) {
        ctx.fillStyle = "#ffffff";
      } else {
        ctx.fillStyle = "#94a3b8";
      }

      ctx.textAlign = "left";
      ctx.fillText(item.wordStr, cursorX, yPos);
      cursorX += item.wWidth;
    });
  });
  ctx.restore();

  // 3. Progress Bar Durasi Video 5 Menit di Paling Bawah
  const overallProgress = clamp(globalT / totalDurationSec, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(54, 1845, WIDTH - 108, 14);
  ctx.fillStyle = sc.themeColor;
  ctx.fillRect(54, 1845, (WIDTH - 108) * overallProgress, 14);
}

// ============================================================================
// RENDER FRAME TUNGGAL (60 FPS)
// ============================================================================
function renderFrame(ctx, sceneIdx, globalT, totalDurationSec) {
  const sc = SCENES[sceneIdx];
  const localT = globalT - sc.startTime;
  const sceneProgress = clamp(localT / sc.duration, 0, 1);
  const isSpeaking = globalT >= sc.voiceStartTime && globalT <= sc.voiceEndTime;

  ctx.save();

  // Latar Belakang Gradien Dinamis
  const bgGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (sceneIdx >= 5 && sceneIdx <= 10) {
    bgGrad.addColorStop(0, "#09040a");
    bgGrad.addColorStop(0.5, "#1f0916");
    bgGrad.addColorStop(1, "#090d16");
  } else {
    bgGrad.addColorStop(0, "#040814");
    bgGrad.addColorStop(0.5, "#0b192c");
    bgGrad.addColorStop(1, "#050b14");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Efek Kamera Zoom & Guncangan (Screen Shake saat Ledakan Chernobyl Scene 9-10)
  const zoom = lerp(1.0, sc.cameraZoom || 1.05, sceneProgress);
  let shakeX = 0;
  let shakeY = 0;
  if (sc.id === "scene_10" && localT >= 1.0 && localT <= 9.5) {
    const intensity = localT < 4.5 ? 18 : 26 * Math.exp(-(localT - 4.0) * 0.45);
    shakeX = Math.sin(globalT * 65) * intensity;
    shakeY = Math.cos(globalT * 78) * intensity;
  } else if (sc.id === "scene_09" && localT > 8.0) {
    shakeX = Math.sin(globalT * 45) * 6;
    shakeY = Math.cos(globalT * 52) * 6;
  }

  ctx.save();
  ctx.translate(WIDTH / 2 + shakeX, HEIGHT / 2 + shakeY);
  ctx.scale(zoom, zoom);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);

  // Lantai Panggung Laboratorium / Ruang Reaktor
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(0, 1340, WIDTH, HEIGHT - 1340);
  ctx.strokeStyle = sc.themeColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1340);
  ctx.lineTo(WIDTH, 1340);
  ctx.stroke();

  // Partikel Atmosferik / Debu Radiasi Melayang
  for (let p = 0; p < 24; p++) {
    const px = ((p * 173 + globalT * 28 * ((p % 3) + 1)) % WIDTH);
    const py = ((p * 293 - globalT * 36 * ((p % 2) + 1)) % HEIGHT + HEIGHT) % HEIGHT;
    ctx.fillStyle =
      sceneIdx >= 9 && sceneIdx <= 12
        ? "rgba(250, 204, 21, 0.35)"
        : "rgba(56, 189, 248, 0.22)";
    ctx.beginPath();
    ctx.arc(px, py, 2.5 + (p % 4), 0, Math.PI * 2);
    ctx.fill();
  }

  // Gambar Panggung Utama Sesuai Babak Cerita
  if (sceneIdx <= 2) {
    drawAtomicPhysicsStage(ctx, sc, localT, globalT, isSpeaking);
  } else if (sceneIdx <= 4) {
    drawNuclearPlantStage(ctx, sc, localT, globalT, isSpeaking);
  } else if (sceneIdx <= 9) {
    drawChernobylDisasterStage(ctx, sc, localT, globalT, isSpeaking);
  } else {
    drawAftermathAndFutureStage(ctx, sc, localT, globalT, isSpeaking);
  }

  ctx.restore(); // Akhir transformasi kamera panggung

  // Gambar HUD & Subtitle Karaoke
  drawHudAndSubtitles(ctx, sc, globalT, totalDurationSec);

  ctx.restore();
}

// ============================================================================
// PIPELINE RENDER UTAMA KE ./output.mp4 (60 FPS, BUFFER RGBA MURNI)
// ============================================================================
async function main() {
  const totalDurationSec = await buildVoiceoverTimeline();
  const sfxWavPath = path.join(TEMP_DIR, "sfx_master.wav");
  const masterAudioPath = path.join(TEMP_DIR, "master_audio.m4a");

  generateProceduralSfxWav(totalDurationSec, sfxWavPath);
  buildMasterAudioTrack(totalDurationSec, sfxWavPath, masterAudioPath);

  console.log("=== [4/4] MERENDER ANIMASI 1080x1920 @ 60 FPS KE ./output.mp4 ===");
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const totalFrames = Math.round(totalDurationSec * FPS);

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
    masterAudioPath,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    OUTPUT_FILE
  ];

  const ffmpegProc = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "ignore", "pipe"]
  });

  ffmpegProc.stderr.on("data", () => {
    // Konsumsi log stderr ffmpeg agar pipe tidak penuh
  });

  let sceneIdx = 0;
  for (let frame = 0; frame < totalFrames; frame++) {
    const globalT = frame / FPS;
    while (sceneIdx < SCENES.length - 1 && globalT >= SCENES[sceneIdx].endTime) {
      sceneIdx++;
    }

    renderFrame(ctx, sceneIdx, globalT, totalDurationSec);

    const rawBuffer =
      typeof canvas.data === "function"
        ? canvas.data()
        : canvas.toBuffer("raw");

    const canContinue = ffmpegProc.stdin.write(rawBuffer);
    if (!canContinue) {
      await new Promise((resolve) => ffmpegProc.stdin.once("drain", resolve));
    }

    if (frame % (FPS * 15) === 0 || frame === totalFrames - 1) {
      const pct = ((frame / totalFrames) * 100).toFixed(1);
      console.log(`  -> Progress Render: Frame ${frame}/${totalFrames} (${pct}%)`);
    }
  }

  ffmpegProc.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpegProc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg keluar dengan kode ${code}`));
    });
    ffmpegProc.on("error", reject);
  });

  console.log(`=== SELESAI! Video berhasil disimpan ke: ${OUTPUT_FILE} ===`);
}

main().catch((err) => {
  console.error("FATAL RENDER ERROR:", err);
  process.exit(1);
});