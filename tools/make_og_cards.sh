#!/bin/bash
# Rebuild the 1200x630 link-preview cards in assets/og/ from tools/og-cards/cards.html.
#
#     tools/make_og_cards.sh
#
# Serves the repo on a local port, screenshots each card in a headless
# Chromium browser, and saves it as a JPEG (what X, iMessage, Slack, LinkedIn
# and Facebook all accept). Needs macOS (sips) and Helium or Google Chrome;
# set BROWSER to use another Chromium build.
#
# Run it again after changing the template, an app icon or a screenshot,
# then run tools/render_site.py (it points every page at these cards).

set -euo pipefail
cd "$(dirname "$0")/.."

BROWSER=${BROWSER:-/Applications/Helium.app/Contents/MacOS/Helium}
[ -x "$BROWSER" ] || BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$BROWSER" ] || { echo "No Chromium browser found; set BROWSER" >&2; exit 1; }

TMP=$(mktemp -d)
PORT=$((8700 + RANDOM % 200))
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
for _ in $(seq 1 50); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.2; done

mkdir -p assets/og
for card in studio markpdf topdrawer; do
    # In --screenshot mode the browser writes the file but may not exit, so
    # run it in the background, wait for the file, then stop it.
    "$BROWSER" --headless=new --no-first-run --hide-scrollbars --force-device-scale-factor=1 \
        --user-data-dir="$TMP/profile-$card" --window-size=1200,630 --virtual-time-budget=5000 \
        --screenshot="$TMP/$card.png" "http://127.0.0.1:$PORT/tools/og-cards/cards.html#$card" >/dev/null 2>&1 &
    BROWSER_PID=$!
    for _ in $(seq 1 60); do [ -s "$TMP/$card.png" ] && break; sleep 0.5; done
    sleep 0.5
    kill "$BROWSER_PID" 2>/dev/null || true
    pkill -f "user-data-dir=$TMP/profile-$card" 2>/dev/null || true
    [ -s "$TMP/$card.png" ] || { echo "No screenshot for $card" >&2; exit 1; }
    sips -s format jpeg -s formatOptions 85 "$TMP/$card.png" --out "assets/og/$card.jpg" >/dev/null
    printf "assets/og/%-14s %s bytes\n" "$card.jpg" "$(stat -f%z "assets/og/$card.jpg")"
done
