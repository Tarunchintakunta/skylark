#!/bin/bash
# ============================================================
# SKYLARK EXIM — frame pipeline
# usage: encode_frames.sh <video_dir> <out_root>
#   video_dir: assets/video/720 or assets/video/1080
#   out_root:  assets/frames
# Desktop: every 3rd frame @1600x900  → AVIF crf42 + WebP q70 (≤55KB target)
# Mobile:  every 4th frame @1000x563  → AVIF crf44 + WebP q66
# Proxy:   every 8th desktop frame @320x180 WebP q60 (instant scrub strip)
# Keyframes: 1 mid-frame JPG per clip (reduced-motion fallback)
# Emits manifest/frames.json
# ============================================================
set -euo pipefail

VIDEO_DIR="${1:?video dir}"
OUT="${2:?out root}"
cd "$(dirname "$0")/.."

CLIPS=(opening a1 a2 a3 a4 b1 b2 b3 t1 t2 t3 t4)
mkdir -p "$OUT/d" "$OUT/m" assets/keyframes manifest

json_desktop="" ; json_mobile=""

for clip in "${CLIPS[@]}"; do
  src="$VIDEO_DIR/$clip.mp4"
  [ -f "$src" ] || { echo "skip $clip (no $src)"; continue; }
  if [ "${FORCE:-0}" != "1" ] && [ -d "$OUT/d/$clip" ] && [ -n "$(ls -A "$OUT/d/$clip" 2>/dev/null | head -1)" ]; then
    n=$(ls "$OUT/d/$clip"/*.avif 2>/dev/null | wc -l | tr -d ' ')
    m=$(ls "$OUT/m/$clip"/*.avif 2>/dev/null | wc -l | tr -d ' ')
    json_desktop="$json_desktop\"$clip\":$n,"
    json_mobile="$json_mobile\"$clip\":$m,"
    echo "keep $clip (already encoded: $n desktop, $m mobile)"
    continue
  fi

  # ---- desktop: every 3rd frame, 1600x900 ----
  ddir="$OUT/d/$clip" ; pdir="$ddir/p"
  rm -rf "$ddir" ; mkdir -p "$ddir" "$pdir"
  tmp=$(mktemp -d)
  ffmpeg -y -v error -i "$src" -vf "select='not(mod(n\,3))',scale=1600:900:flags=lanczos" -vsync vfr "$tmp/%04d.png"

  n=0
  for f in "$tmp"/*.png; do
    n=$((n+1)) ; base=$(printf "%04d" "$n")
    ffmpeg -y -v error -i "$f" -frames:v 1 -c:v libsvtav1 -crf 42 -preset 8 -pix_fmt yuv420p -svtav1-params tune=0 "$ddir/$base.avif" 2>/dev/null &
    cwebp -quiet -q 70 "$f" -o "$ddir/$base.webp" &
    # proxy every 8th
    if [ $(( (n-1) % 8 )) -eq 0 ]; then
      cwebp -quiet -q 60 -resize 320 180 "$f" -o "$pdir/$base.webp" &
    fi
    # cap parallelism (bash 3.2: chunked waits)
    if [ $(( n % 8 )) -eq 0 ]; then wait; fi
  done
  wait
  json_desktop="$json_desktop\"$clip\":$n,"

  # keyframe (mid) for reduced-motion
  mid=$(printf "%04d" $(( (n+1)/2 )))
  ffmpeg -y -v error -i "$tmp/$mid.png" -qscale:v 4 "assets/keyframes/$clip.jpg"

  # ---- mobile: every 4th frame, 1000x563 ----
  mdir="$OUT/m/$clip" ; mpdir="$mdir/p"
  rm -rf "$mdir" ; mkdir -p "$mdir" "$mpdir"
  tmpm=$(mktemp -d)
  ffmpeg -y -v error -i "$src" -vf "select='not(mod(n\,4))',scale=1000:563:flags=lanczos" -vsync vfr "$tmpm/%04d.png"
  m=0
  for f in "$tmpm"/*.png; do
    m=$((m+1)) ; base=$(printf "%04d" "$m")
    ffmpeg -y -v error -i "$f" -frames:v 1 -c:v libsvtav1 -crf 44 -preset 8 -pix_fmt yuv420p "$mdir/$base.avif" 2>/dev/null &
    cwebp -quiet -q 66 "$f" -o "$mdir/$base.webp" &
    if [ $(( (m-1) % 8 )) -eq 0 ]; then
      cwebp -quiet -q 58 -resize 320 180 "$f" -o "$mpdir/$base.webp" &
    fi
    if [ $(( m % 8 )) -eq 0 ]; then wait; fi
  done
  wait
  json_mobile="$json_mobile\"$clip\":$m,"

  rm -rf "$tmp" "$tmpm"
  echo "done $clip  desktop=$n mobile=$m"
done

cat > manifest/frames.json <<EOF
{
  "proxyEvery": 8,
  "desktop": { "dir": "assets/frames/d", "w": 1600, "h": 900, "clips": { ${json_desktop%,} } },
  "mobile":  { "dir": "assets/frames/m", "w": 1000, "h": 563, "clips": { ${json_mobile%,} } }
}
EOF
echo "manifest/frames.json written"
