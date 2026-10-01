#!/usr/bin/env python3
"""Tell IndexNow search engines (Bing, Yandex, Seznam, Naver) that pages changed.

    python3 tools/indexnow.py            # submit every URL in sitemap.xml
    python3 tools/indexnow.py /press/    # submit just these paths

Run it after a push has deployed. Bing then recrawls within hours instead of
days, and Bing's index feeds Copilot and is one of the sources ChatGPT
searches. The key file at the site root proves we own the domain; keep its
name and contents in sync with KEY below.
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "zestmavericks.com"
KEY = "9e180aed5ca3a78ad0bce9c8a4e88e6e"


def main():
    if sys.argv[1:]:
        urls = [f"https://{HOST}{path}" for path in sys.argv[1:]]
    else:
        urls = re.findall(r"<loc>([^<]+)</loc>", (ROOT / "sitemap.xml").read_text())
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    request = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                     headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            print(f"IndexNow accepted {len(urls)} URLs (HTTP {response.status})")
    except urllib.error.HTTPError as error:
        # 403: key file not live yet (push first); 422: URL not on this host
        print(f"IndexNow refused: HTTP {error.code} {error.reason}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
