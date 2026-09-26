#!/usr/bin/env python3
"""Check every internal link and resource on the site.

Serves the repo on a local port, the way GitHub Pages would, then:

  * fetches every page, redirect stub and sitemap URL
  * follows every href/src in the HTML, url() in the CSS, and root-relative
    path in the JS, and fails on anything that doesn't come back 200
  * checks that #fragments point at an id that exists on the target page
  * fails on relative paths ("css/style.css", "terms.html"): they break as
    soon as a page lives in a subfolder, so the site uses "/css/..." only
  * checks canonical, og:url, og:image and sitemap URLs map to a real file

Usage:  python3 tools/check_links.py          (exit code 1 if anything fails)
"""

import functools
import http.server
import re
import sys
import threading
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "zestmavericks.com"
SKIP_DIRS = {".git", "Kairos", "tools", "node_modules"}
SKIP_SCHEMES = ("mailto:", "tel:", "data:", "javascript:")


class Page(HTMLParser):
    """Collects every URL-bearing attribute and every id on a page."""

    def __init__(self):
        super().__init__()
        self.refs = []  # (what, value)
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for name in ("href", "src", "xlink:href"):
            if attrs.get(name):
                self.refs.append((f"<{tag} {name}>", attrs[name]))
        if attrs.get("srcset"):
            for part in attrs["srcset"].split(","):
                self.refs.append((f"<{tag} srcset>", part.split()[0]))
        if tag == "meta":
            prop = attrs.get("property") or attrs.get("name") or ""
            if prop in ("og:url", "og:image", "twitter:image") and attrs.get("content"):
                self.refs.append((f"<meta {prop}>", attrs["content"]))
            if (attrs.get("http-equiv") or "").lower() == "refresh":
                match = re.search(r"url=(.+)", attrs.get("content", ""), re.I)
                if match:
                    self.refs.append(("<meta refresh>", match.group(1).strip()))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def fetch(url):
    """Returns (status, final_url, body). Follows redirects like a browser."""
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.status, response.geturl(), response.read()
    except urllib.error.HTTPError as error:
        return error.code, url, b""


def site_files(*suffixes):
    for path in sorted(ROOT.rglob("*")):
        rel = path.relative_to(ROOT)
        if path.is_file() and path.suffix in suffixes and not SKIP_DIRS & set(rel.parts):
            yield rel


def page_url(rel):
    """The URL a file is served at: folders for index.html, else the file."""
    text = rel.as_posix()
    if text == "index.html":
        return "/"
    if text.endswith("/index.html"):
        return "/" + text[: -len("index.html")]
    return "/" + text


def main():
    server, base = serve()
    problems = []
    checked = {}  # path -> (status, final path, ids)

    def get(path):
        if path not in checked:
            status, final, body = fetch(base + path)
            ids = set()
            if status == 200 and body.lstrip()[:15].lower().startswith(b"<!doctype html"):
                parser = Page()
                parser.feed(body.decode("utf-8", "replace"))
                ids = parser.ids
            checked[path] = (status, urlsplit(final).path, ids)
        return checked[path]

    def check(source, what, value):
        if not value or value.startswith(SKIP_SCHEMES):
            return
        parts = urlsplit(value)

        if parts.scheme in ("http", "https"):
            if parts.netloc != DOMAIN:
                return  # external, not ours to check
            value = parts.path or "/"
            if parts.query:
                value += "?" + parts.query
            if parts.fragment:
                value += "#" + parts.fragment
        elif not value.startswith(("/", "#")):
            problems.append(f"{source}: {what} '{value}' is relative, use a root path")
            return

        target = urljoin(source, value)
        path = urlsplit(target).path
        fragment = urlsplit(target).fragment

        status, final, ids = get(path)
        if status != 200:
            problems.append(f"{source}: {what} '{value}' -> HTTP {status}")
            return
        if fragment and fragment not in ids:
            problems.append(f"{source}: {what} '{value}' -> no id='{fragment}' on {final}")

    # 1. Every HTML file on disk, as the URL it is served at
    pages = [page_url(rel) for rel in site_files(".html")]
    for url in pages:
        status, final, _ = get(url)
        if status != 200:
            problems.append(f"{url}: page itself returns HTTP {status}")
            continue
        _, _, body = fetch(base + url)
        parser = Page()
        parser.feed(body.decode("utf-8", "replace"))
        for what, value in parser.refs:
            check(url, what, value)

    # 2. Paths built in JavaScript (the footer component)
    for rel in site_files(".js"):
        text = (ROOT / rel).read_text()
        for value in re.findall(r"""["'](/[A-Za-z0-9_./-]*)["']""", text):
            check("/" + rel.as_posix(), "path in JS", value)

    # 3. url() in stylesheets
    for rel in site_files(".css"):
        text = (ROOT / rel).read_text()
        for value in re.findall(r"""url\(\s*['"]?([^'")]+)""", text):
            if not value.startswith(SKIP_SCHEMES):
                check("/" + rel.as_posix(), "url() in CSS", value)

    # 4. Sitemap and robots
    sitemap = (ROOT / "sitemap.xml").read_text()
    for value in re.findall(r"<loc>([^<]+)</loc>", sitemap):
        check("/sitemap.xml", "<loc>", value)
    if get("/robots.txt")[0] != 200:
        problems.append("/robots.txt: missing")

    # 5. Folders must resolve without the trailing slash too
    for url in pages:
        if url.endswith("/") and url != "/":
            status, final, _ = get(url.rstrip("/"))
            if status != 200 or final != url:
                problems.append(f"{url.rstrip('/')}: expected to land on {url}, got {status} {final}")

    server.shutdown()

    print(f"Checked {len(pages)} pages and {len(checked)} unique URLs.")
    problems = sorted(set(problems))
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for problem in problems:
            print("  " + problem)
        return 1
    print("No broken links or resources.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
