#!/usr/bin/env bash
# Turns recorded frames into social-media-ready MP4s (H.264, yuv420p, +faststart).
#   tools/record/assemble.sh landscape        -> recordings/landscape/*.mp4 + trailer
#   tools/record/assemble.sh vertical
# Per-segment clips get a short fade in/out; the trailer joins intro, m1, m2, m3, outro.
set -euo pipefail
FORMAT="${1:-landscape}"
ROOT="${2:-recordings}"
DIR="$ROOT/$FORMAT"
FPS="${FPS:-30}"
SEGMENTS=(intro m1 m2 m3 outro)
LIST="$DIR/concat.txt"
: > "$LIST"
for seg in "${SEGMENTS[@]}"; do
  frames="$DIR/$seg"
  [ -d "$frames" ] || { echo "skip $seg (no frames)"; continue; }
  count=$(ls "$frames" | wc -l)
  dur=$(awk "BEGIN { print $count / $FPS }")
  fade_out=$(awk "BEGIN { d = $dur - 0.35; print (d > 0 ? d : 0) }")
  out="$DIR/$seg.mp4"
  ffmpeg -loglevel error -y -framerate "$FPS" -i "$frames/f%05d.jpg" \
    -vf "fade=t=in:st=0:d=0.25,fade=t=out:st=$fade_out:d=0.35,format=yuv420p" \
    -c:v libx264 -preset slow -crf 18 -movflags +faststart "$out"
  echo "file '$(basename "$out")'" >> "$LIST"
  echo "$out  ($dur s)"
done
ffmpeg -loglevel error -y -f concat -safe 0 -i "$LIST" -c copy -movflags +faststart "$DIR/dungeons-and-deadlines-trailer-$FORMAT.mp4"
echo "trailer: $DIR/dungeons-and-deadlines-trailer-$FORMAT.mp4"
