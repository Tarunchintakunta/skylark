#!/bin/bash
# Assemble the final 1080p clips into deliverable films.
#   full  : opening → ocean (A1–A4) ⟶dip⟶ pond (B1–B3) → T1 → T2S ⟶dip⟶ T2 → T3 → T4
#   ocean : opening → A1–A4 → T1 → T2 → T3 → T4      (the site's ocean path)
#   pond  : opening → B1–B3 → T1 → T2S → T3 → T4     (the site's pond path)
# Chained junctions are frame-matched; only the two scene changes dip to black.
set -euo pipefail
cd "$(dirname "$0")/.."
V=assets/video/1080
mkdir -p exports
ENC=(-c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r 24 -movflags +faststart -an)

# --- full cut with dips at the two hard cuts ---
ffmpeg -y -v error -stats \
  -i $V/opening.mp4 -i $V/a1.mp4 -i $V/a2.mp4 -i $V/a3.mp4 -i $V/a4.mp4 \
  -i $V/b1.mp4 -i $V/b2.mp4 -i $V/b3.mp4 -i $V/t1.mp4 -i $V/t2s.mp4 \
  -i $V/t2.mp4 -i $V/t3.mp4 -i $V/t4.mp4 \
  -filter_complex "
    [4:v]fade=t=out:st=11.5:d=0.5[a4f];
    [5:v]fade=t=in:st=0:d=0.5[b1f];
    [9:v]fade=t=out:st=11.5:d=0.5[t2sf];
    [10:v]fade=t=in:st=0:d=0.5[t2f];
    [12:v]fade=t=out:st=11.2:d=0.8[t4f];
    [0:v][1:v][2:v][3:v][a4f][b1f][6:v][7:v][8:v][t2sf][t2f][11:v][t4f]concat=n=13:v=1:a=0[out]
  " -map "[out]" "${ENC[@]}" exports/skylark-exim-full-cut.mp4

# --- ocean path ---
ffmpeg -y -v error -stats \
  -i $V/opening.mp4 -i $V/a1.mp4 -i $V/a2.mp4 -i $V/a3.mp4 -i $V/a4.mp4 \
  -i $V/t1.mp4 -i $V/t2.mp4 -i $V/t3.mp4 -i $V/t4.mp4 \
  -filter_complex "[8:v]fade=t=out:st=11.2:d=0.8[t4f];[0:v][1:v][2:v][3:v][4:v][5:v][6:v][7:v][t4f]concat=n=9:v=1:a=0[out]" \
  -map "[out]" "${ENC[@]}" exports/skylark-exim-ocean-path.mp4

# --- pond path ---
ffmpeg -y -v error -stats \
  -i $V/opening.mp4 -i $V/b1.mp4 -i $V/b2.mp4 -i $V/b3.mp4 \
  -i $V/t1.mp4 -i $V/t2s.mp4 -i $V/t3.mp4 -i $V/t4.mp4 \
  -filter_complex "[7:v]fade=t=out:st=11.2:d=0.8[t4f];[0:v][1:v][2:v][3:v][4:v][5:v][6:v][t4f]concat=n=8:v=1:a=0[out]" \
  -map "[out]" "${ENC[@]}" exports/skylark-exim-pond-path.mp4

ls -la exports/
