#!/bin/bash
# Rebuild the responsive AVIF + WebP images from the PNG masters in assets/.
#
#     tools/optimize_images.sh
#
# Needs macOS (sips) plus cwebp and avifenc: brew install webp libavif
#
# The PNGs in assets/ are the masters and stay untouched (some are also the
# og:image social previews, which should stay PNG). Each entry below writes
# assets/<out>-<width>.<format> for every width and format. Widths are 2x and
# 3x the largest size the image is shown at in CSS, so phones and Retina
# screens get sharp pixels and nothing bigger.
#
# Quality was picked by eye at full size against the lossless PNG: AVIF q65
# and WebP q82 are indistinguishable on UI text and photos, and AVIF q65 also
# avoids the faint banding WebP shows in dark gradients. Small graphics are
# WebP only: under ~10 KB, AVIF's container overhead makes it the larger file.
#
# Adding a screenshot: drop the PNG master in assets/, add a line here, run
# this, then use <app-screenshot name="..." width="900" height="<900w height>">.

set -euo pipefail
cd "$(dirname "$0")/.."

for tool in sips cwebp avifenc; do
    command -v "$tool" >/dev/null || { echo "missing $tool (brew install webp libavif)" >&2; exit 1; }
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# out | master | widths | formats | crop "width height x y" (optional)
#
# The MarkPDF mockups have a transparent 62/64/70/70px margin (left/right/
# top/bottom) around the phone; cropping it makes them the same visual size
# as TopDrawer's, whose frame already reaches the image edges.
MARKPDF_CROP="1293 2656 62 70"
IMAGES=(
    # Screenshots, shown at up to 300px wide (.shot)
    "shots/markpdf/launch|assets/Launch-Screen.png|600 900|avif webp|"
    "shots/markpdf/home|assets/Mark-Home-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/markpdf/scan|assets/Scan-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/markpdf/design|assets/Design-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/markpdf/delete|assets/Delete-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/markpdf/lock|assets/Lock-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/markpdf/summarise|assets/Mark-Summarise-Screen.png|600 900|avif webp|$MARKPDF_CROP"
    "shots/topdrawer/drawer|assets/topdrawer/Drawer-Screen.png|600 900|avif webp|"
    "shots/topdrawer/search|assets/topdrawer/Search-Screen.png|600 900|avif webp|"
    "shots/topdrawer/lock|assets/topdrawer/TD-Lock-Screen.png|600 900|avif webp|"
    # Hero icons, shown at up to 128px (.app-icon)
    "icons/zest|assets/zest.png|256 384|webp|"
    "icons/markpdf|assets/MarkPDF.png|256 384|webp|"
    "icons/topdrawer|assets/TopDrawer.png|256 384|webp|"
    # App Store badge, shown at 168px (.badge-link img)
    "badges/app-store|assets/AppStore-Badge.png|336 504|webp|"
    # Footer social icons, shown at 28px
    "icons/twitter|assets/Twitter.png|56 84|webp|"
    "icons/email|assets/email.png|56 84|webp|"
)

for entry in "${IMAGES[@]}"; do
    IFS='|' read -r out master widths formats crop <<<"$entry"
    mkdir -p "assets/$(dirname "$out")"

    input="$master"
    if [ -n "$crop" ]; then
        read -r cw ch cx cy <<<"$crop"
        sips -c "$ch" "$cw" --cropOffset "$cy" "$cx" "$master" --out "$TMP/crop.png" >/dev/null
        input="$TMP/crop.png"
    fi

    for w in $widths; do
        sips --resampleWidth "$w" "$input" --out "$TMP/resized.png" >/dev/null
        for format in $formats; do
            case "$format" in
                webp) cwebp -quiet -q 82 -m 6 -sharp_yuv -alpha_q 100 "$TMP/resized.png" -o "assets/$out-$w.webp" ;;
                avif) avifenc -q 65 --qalpha 90 -s 5 -y 444 -j 4 "$TMP/resized.png" "assets/$out-$w.avif" >/dev/null ;;
            esac
        done
    done

    h=$(sips -g pixelHeight "$TMP/resized.png" | awk '/pixelHeight/ {print $2}')
    printf "%-28s %s -> %s, %s (largest %sx%s)\n" "$out" "$master" "$widths" "$formats" "$w" "$h"
done
