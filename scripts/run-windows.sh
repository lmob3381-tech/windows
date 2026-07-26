#!/usr/bin/env bash
set -euo pipefail

WIN_VERSION="${WIN_VERSION:-11}"
DISK_SIZE="${DISK_SIZE:-40G}"
RAM_SIZE="${RAM_SIZE:-8G}"
CPU_CORES="${CPU_CORES:-4}"
VNC_PORT="${VNC_PORT:-8006}"
RUN_MINUTES="${RUN_MINUTES:-350}"

echo "=============================================="
echo " Windows-in-Actions | versi: $WIN_VERSION"
echo " RAM: $RAM_SIZE | CPU: $CPU_CORES | Disk: $DISK_SIZE"
echo "=============================================="

if [ ! -e /dev/kvm ]; then
  echo "[WARN] /dev/kvm tidak ditemukan, mencoba install dukungan KVM..."
  sudo apt-get update -y
  sudo apt-get install -y qemu-kvm cpu-checker
  sudo kvm-ok || echo "[WARN] KVM mungkin tidak didukung penuh di runner ini."
fi
sudo chmod 666 /dev/kvm || true

if ! command -v docker &> /dev/null; then
  echo "[INFO] Docker belum ada, menginstall..."
  curl -fsSL https://get.docker.com | sudo sh
fi

echo "[INFO] Menjalankan container Windows (dockur/windows)..."
sudo docker run -d \
  --name windows \
  --privileged \
  -e VERSION="$WIN_VERSION" \
  -e RAM_SIZE="$RAM_SIZE" \
  -e CPU_CORES="$CPU_CORES" \
  -e DISK_SIZE="$DISK_SIZE" \
  -p "$VNC_PORT":8006 \
  --device=/dev/kvm \
  --cap-add NET_ADMIN \
  --stop-timeout 120 \
  dockurr/windows

echo "[INFO] Container dijalankan. Instalasi Windows biasanya makan waktu 30-40 menit."

if ! command -v cloudflared &> /dev/null; then
  echo "[INFO] Menginstall cloudflared..."
  curl -fsSL -o cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared.deb
fi

echo "[INFO] Menunggu noVNC aktif di port $VNC_PORT ..."
for i in $(seq 1 60); do
  if curl -s "http://localhost:$VNC_PORT" > /dev/null; then
    echo "[INFO] noVNC sudah aktif."
    break
  fi
  sleep 5
done

echo "[INFO] Membuka Cloudflare Quick Tunnel ke noVNC..."
cloudflared tunnel --url "http://localhost:$VNC_PORT" --no-autoupdate > cloudflared.log 2>&1 &
CLOUDFLARED_PID=$!

echo "[INFO] Menunggu URL tunnel dibuat..."
URL=""
for i in $(seq 1 30); do
  if grep -qo 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' cloudflared.log; then
    URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' cloudflared.log | head -n1)
    break
  fi
  sleep 2
done

if [ -z "$URL" ]; then
  echo "[ERROR] Gagal mendapatkan URL tunnel. Isi log cloudflared:"
  cat cloudflared.log
  exit 1
fi

echo "=============================================="
echo " ✅ Windows sedang di-setup (butuh ~30-40 menit)"
echo " 🔗 Buka link berikut di browser HP/laptop kamu:"
echo ""
echo "    $URL"
echo ""
echo "=============================================="

echo "[INFO] Sesi akan tetap terbuka selama $RUN_MINUTES menit."
SECONDS_TOTAL=$((RUN_MINUTES * 60))
INTERVAL=60
ELAPSED=0

while [ "$ELAPSED" -lt "$SECONDS_TOTAL" ]; do
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
  MIN_LEFT=$(( (SECONDS_TOTAL - ELAPSED) / 60 ))
  echo "[INFO] Sesi masih berjalan. Sisa waktu: ${MIN_LEFT} menit. URL: $URL"

  if ! sudo docker ps --filter "name=windows" --filter "status=running" | grep -q windows; then
    echo "[ERROR] Container Windows berhenti / crash. Menghentikan sesi."
    break
  fi
done

echo "[INFO] Waktu sesi habis / dihentikan. Membersihkan..."
kill "$CLOUDFLARED_PID" 2>/dev/null || true
sudo docker stop windows 2>/dev/null || true
sudo docker rm windows 2>/dev/null || true

echo "[DONE] Sesi selesai."
