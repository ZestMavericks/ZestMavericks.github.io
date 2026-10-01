#!/usr/bin/env python3
"""Write the shared pieces of the site into every page.

    python3 tools/render_site.py           # update pages and sitemap.xml
    python3 tools/render_site.py --check   # exit 1 if anything is out of date

The header, footer, pricing, screenshots and structured data are written into
the HTML here, at commit time, instead of being drawn by JavaScript in the
browser. Search engines, AI crawlers (which never run JavaScript) and people
with JavaScript off all get the same complete page, and the site still has
nothing to build at deploy: what's committed is what's served.

Each page marks where a piece goes:

    <!-- render:header -->              ... <!-- /render:header -->
    <!-- render:footer product="topdrawer" --> ... <!-- /render:footer -->
    <!-- render:pricing product="markpdf" -->  ... <!-- /render:pricing -->
    <!-- render:screenshot name="markpdf/scan" alt="..." card --> ...
    <!-- render:meta -->                ... <!-- /render:meta -->

Everything between a pair of markers is replaced on every run, so edit the
data and templates below, never the generated HTML. Prices, app facts and
links live here once and feed the visible page, the structured data and the
sitemap alike, so they can't disagree.
"""

import datetime
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://zestmavericks.com"
ORG_ID = SITE + "/#organization"
EMAIL = "zestmavericks@gmail.com"
X_URL = "https://x.com/zestmavericks"

# file -> URL path. Order is the sitemap order.
PAGES = {
    "index.html": "/",
    "markpdf/index.html": "/markpdf/",
    "topdrawer/index.html": "/topdrawer/",
    "about/index.html": "/about/",
    "contact/index.html": "/contact/",
    "markpdf/terms/index.html": "/markpdf/terms/",
    "topdrawer/terms/index.html": "/topdrawer/terms/",
    "topdrawer/privacy/index.html": "/topdrawer/privacy/",
    "404.html": None,  # rendered, but never in the sitemap
}

NAV = [
    ("/", "Home"),
    ("/markpdf/", "MarkPDF"),
    ("/topdrawer/", "TopDrawer"),
    ("/about/", "About"),
    ("/contact/", "Contact"),
]

LEGAL = {
    "markpdf": [("/markpdf/terms/", "Terms and privacy")],
    "topdrawer": [("/topdrawer/terms/", "Terms"), ("/topdrawer/privacy/", "Privacy")],
}

ORGANIZATION = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "Zest Mavericks",
    "alternateName": "ZestMavericks",
    "url": SITE + "/",
    "logo": SITE + "/assets/zest.png",
    "description": "A two-person studio in India building absurdly intuitive apps for iPhone: MarkPDF and TopDrawer.",
    "email": EMAIL,
    "address": {
        "@type": "PostalAddress",
        "addressLocality": "Bangalore",
        "addressRegion": "Karnataka",
        "addressCountry": "IN",
    },
    "contactPoint": {"@type": "ContactPoint", "contactType": "customer support", "email": EMAIL, "url": SITE + "/contact/"},
    "sameAs": [
        "https://apps.apple.com/us/developer/zest-mavericks/id1774540761",
        X_URL,
        "https://github.com/ZestMavericks",
    ],
}

# Facts about each app. "app_store_id" is None until the listing is live.
APPS = {
    "markpdf": {
        "name": "MarkPDF",
        # The App Store lists it as "Mark PDF"; saying so ties both spellings to one app
        "alternate_names": ["Mark PDF", "Mark PDF: PDF Editor & Scanner"],
        "url": "/markpdf/",
        "app_store_id": "6737065841",
        "category": "BusinessApplication",
        "os": "iOS 16.0 or later",
        "description": (
            "MarkPDF (Mark PDF on the App Store) is a PDF editor and scanner for iPhone. "
            "Scan documents, sign, merge, split and lock PDFs, delete pages, and summarise long PDFs with AI."
        ),
        "icon": "/assets/MarkPDF.png",
        "screenshots": ["markpdf/home", "markpdf/scan", "markpdf/design", "markpdf/lock", "markpdf/summarise"],
        "languages": ["en", "ar", "fr", "hi", "ja", "pt", "zh-Hans", "es"],
    },
    "topdrawer": {
        "name": "TopDrawer",
        "alternate_names": ["TopDrawer for iPhone"],
        "url": "/topdrawer/",
        "app_store_id": None,
        "category": "UtilitiesApplication",
        "os": "iOS 26 or later",
        "description": (
            "TopDrawer is a private vault for iPhone. Save text, links, screenshots, PDFs and files from anywhere, "
            "and find any of them with one search, including the words inside your screenshots. Nothing leaves the device."
        ),
        "icon": "/assets/TopDrawer.png",
        "screenshots": ["topdrawer/drawer", "topdrawer/search", "topdrawer/lock"],
        "languages": ["en"],
    },
}


def app_store_url(app_id):
    # No country in the path: Apple sends each visitor to their own storefront
    return f"https://apps.apple.com/app/id{app_id}"


PRICING = {
    "markpdf": {
        "eyebrow": "Subscriptions",
        "title": "MarkPDF PRO",
        "lede": "There's room to reset how we look at documents. This is our attempt at it.",
        "plans": [
            {"name": "Weekly", "price": "$7.99", "per": "week", "note": "Billed weekly",
             "features": ["Every Pro feature", "Good for a one off job", "No free trial on this plan"]},
            {"name": "Monthly", "price": "$12.99", "per": "month", "note": "7 day free trial",
             "features": ["Every Pro feature", "AI summaries and web page to PDF", "Cancel any time"]},
            {"name": "Yearly", "price": "$39.99", "per": "year", "note": "7 day free trial, about $3.33 a month",
             "badge": "Best value",
             "features": ["Every Pro feature", "Save 74% compared with monthly", "Cancel any time"]},
        ],
        "fineprint": (
            "Prices shown in US dollars. Your local price and billing period appear in the App before you "
            "confirm. The 7 day free trial is a one time offer on the Monthly and Yearly plans. Subscriptions "
            "renew automatically until cancelled in your Apple Account settings."
        ),
        "app": "markpdf",
        "badge_alt": "Download MarkPDF on the App Store",
        "links": [("/markpdf/terms/", "Terms and privacy")],
    },
    "topdrawer": {
        "eyebrow": "Ultra",
        "title": "Free to use. Ultra when you outgrow it.",
        "lede": "The free drawer holds 30 items, and every feature above works in it. Ultra removes the limit.",
        "plans": [
            {"name": "Monthly", "price": "$4.99", "per": "month", "note": "Billed monthly",
             "features": ["Unlimited items", "Everything in the free drawer", "Cancel any time"]},
            {"name": "Yearly", "price": "$24.99", "per": "year", "note": "Works out around $2.08 a month",
             "badge": "Best value",
             "features": ["Unlimited items", "Everything in the free drawer", "Cancel any time"]},
            {"name": "Lifetime", "price": "$59.99", "per": "once", "note": "One payment, no renewal",
             "features": ["Unlimited items, for good", "Not a subscription", "Yours on every device you sign in on"]},
        ],
        "fineprint": (
            "Prices shown in US dollars. Your local price and billing period appear in the App before you "
            "confirm. Subscriptions renew automatically until cancelled in your Apple Account settings. "
            "Lifetime is a one off purchase and does not renew."
        ),
        "app": "topdrawer",
        "badge_alt": "Download TopDrawer on the App Store",
        "links": [("/topdrawer/terms/", "Terms of Use"), ("/topdrawer/privacy/", "Privacy Policy")],
    },
}

SCREENSHOT_WIDTHS = (600, 900)
SCREENSHOT_SIZES = "300px"  # .shot is never shown wider than 300px

SUN = (
    '<svg class="icon icon--sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    '<circle cx="12" cy="12" r="4"></circle>'
    '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>'
    "</svg>"
)
MOON = (
    '<svg class="icon icon--moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    '<path d="M20 14.6A8.5 8.5 0 1 1 9.4 4a6.8 6.8 0 0 0 10.6 10.6z"></path>'
    "</svg>"
)
WAVE = "M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"


def esc(text):
    return html.escape(str(text), quote=True)


def webp_size(path):
    """(width, height) from a WebP header, so screenshots never need hand-typed sizes."""
    head = path.read_bytes()[:30]
    if head[:4] != b"RIFF" or head[8:12] != b"WEBP":
        raise ValueError(f"{path} is not a WebP file")
    chunk = head[12:16]
    if chunk == b"VP8X":
        return int.from_bytes(head[24:27], "little") + 1, int.from_bytes(head[27:30], "little") + 1
    if chunk == b"VP8L":
        bits = int.from_bytes(head[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 ":
        return int.from_bytes(head[26:28], "little") & 0x3FFF, int.from_bytes(head[28:30], "little") & 0x3FFF
    raise ValueError(f"{path}: unknown WebP chunk {chunk!r}")


# ---------------------------------------------------------------- pieces


def header(url):
    links = []
    for href, label in NAV:
        current = ' aria-current="page"' if href == url else ""
        links.append(f'    <a href="{href}"{current}>{label}</a>')
    return [
        '<header class="site-header">',
        '<nav class="site-nav" aria-label="Primary">',
        *links,
        "</nav>",
        "<!-- Ships hidden; js/theme.js reveals it, so it never sits there dead without JavaScript -->",
        '<button class="theme-toggle" id="themeToggle" type="button" aria-pressed="false"'
        ' aria-label="Switch to dark mode" title="Switch to dark mode" hidden>',
        "    " + SUN,
        "    " + MOON,
        "</button>",
        "</header>",
    ]


def footer(product="markpdf"):
    legal = LEGAL.get(product, LEGAL["markpdf"])
    links = [f'    <a href="{href}">{esc(label)}</a>' for href, label in NAV + legal]

    def icon(slug, alt):
        return (
            f'<img src="/assets/icons/{slug}-84.webp" srcset="/assets/icons/{slug}-56.webp 56w, '
            f'/assets/icons/{slug}-84.webp 84w" sizes="28px" alt="{esc(alt)}" width="28" height="28" />'
        )

    waves = [
        f'        <use href="#gentle-wave" x="50" y="{i * 3}" fill="#03ffff" fill-opacity="{o}"></use>'
        for i, o in enumerate((0.2, 0.5, 0.9))
    ]
    year = datetime.date.today().year
    return [
        '<footer class="site-footer">',
        '<div class="social-row">',
        f'    <a href="{X_URL}" target="_blank" rel="noopener noreferrer">{icon("twitter", "Zest Mavericks on X")}</a>',
        f'    <a href="mailto:{EMAIL}">{icon("email", "Email Zest Mavericks")}</a>',
        "</div>",
        '<nav class="footer-links" aria-label="Footer">',
        *links,
        "</nav>",
        '<p class="footer-note">{ } &amp; designed with &#x1F90D; in India</p>',
        f'<p class="footer-fine">&copy; {year} Zest Mavericks Pvt. Ltd. All rights reserved.</p>',
        '<svg class="waves" viewBox="0 24 150 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">',
        f'    <defs><path id="gentle-wave" d="{WAVE}"></path></defs>',
        "    <g>",
        *waves,
        "    </g>",
        "</svg>",
        "</footer>",
    ]


def app_store_badge(app_key, alt):
    app = APPS[app_key]
    if not app["app_store_id"]:
        return []
    return [
        f'<a class="badge-link" href="{app_store_url(app["app_store_id"])}" target="_blank" rel="noopener noreferrer">',
        '    <img src="/assets/badges/app-store-504.webp"'
        ' srcset="/assets/badges/app-store-336.webp 336w, /assets/badges/app-store-504.webp 504w"'
        f' sizes="168px" alt="{esc(alt)}" width="168" height="50" loading="lazy" />',
        "</a>",
    ]


def pricing(product):
    p = PRICING[product]
    out = [
        '<section class="section bg-zest" id="pricing">',
        '    <div class="container">',
        '        <div class="center">',
        f'            <p class="eyebrow">{esc(p["eyebrow"])}</p>',
        f'            <h2>{esc(p["title"])}</h2>',
        f'            <p class="lede">{esc(p["lede"])}</p>',
        "        </div>",
        "",
        '        <div class="pricing-grid">',
    ]
    for plan in p["plans"]:
        featured = " plan--featured" if plan.get("badge") else ""
        out.append(f'            <div class="plan{featured}">')
        if plan.get("badge"):
            out.append(f'                <p class="plan__badge">{esc(plan["badge"])}</p>')
        out += [
            f'                <p class="plan__name">{esc(plan["name"])}</p>',
            f'                <p class="plan__price">{esc(plan["price"])}<span>/{esc(plan["per"])}</span></p>',
            f'                <p class="plan__note">{esc(plan["note"])}</p>',
            '                <ul class="feature-list">',
            *[f"                    <li>{esc(f)}</li>" for f in plan["features"]],
            "                </ul>",
            "            </div>",
        ]
    out += [
        "        </div>",
        "",
        f'        <p class="lede center plan-fineprint">{esc(p["fineprint"])}</p>',
        "",
        '        <div class="center">',
        '            <div class="btn-row">',
        *["                " + line for line in app_store_badge(p["app"], p["badge_alt"])],
        *[f'                <a class="btn btn--ghost" href="{href}">{esc(label)}</a>' for href, label in p["links"]],
        "            </div>",
        "        </div>",
        "    </div>",
        "</section>",
    ]
    return out


def screenshot(name, alt, card=False):
    base = f"/assets/shots/{name}"
    width, height = webp_size(ROOT / f"assets/shots/{name}-{SCREENSHOT_WIDTHS[-1]}.webp")

    def srcset(fmt):
        return ", ".join(f"{base}-{w}.{fmt} {w}w" for w in SCREENSHOT_WIDTHS)

    css = "shot shot--card" if card else "shot"
    return [
        '<picture class="shot-picture">',
        f'    <source type="image/avif" srcset="{srcset("avif")}" sizes="{SCREENSHOT_SIZES}" />',
        f'    <img class="{css}" src="{base}-{SCREENSHOT_WIDTHS[-1]}.webp" srcset="{srcset("webp")}"'
        f' sizes="{SCREENSHOT_SIZES}" alt="{esc(alt)}" width="{width}" height="{height}"'
        ' loading="lazy" decoding="async" />',
        "</picture>",
    ]


# ---------------------------------------------------------------- structured data


def org_ref():
    return {"@type": "Organization", "@id": ORG_ID, "name": ORGANIZATION["name"], "url": ORGANIZATION["url"]}


def breadcrumbs(*trail):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": SITE + path}
            for i, (name, path) in enumerate(trail)
        ],
    }


def mobile_app(key):
    app = APPS[key]
    node = {
        "@type": "MobileApplication",
        "@id": SITE + app["url"] + "#app",
        "name": app["name"],
        "alternateName": app["alternate_names"],
        "url": SITE + app["url"],
        "description": app["description"],
        "applicationCategory": app["category"],
        "operatingSystem": app["os"],
        "image": SITE + app["icon"],
        "screenshot": [SITE + f"/assets/shots/{s}-900.webp" for s in app["screenshots"]],
        "inLanguage": app["languages"],
        "publisher": org_ref(),
        "author": org_ref(),
    }
    if app["app_store_id"]:
        store = app_store_url(app["app_store_id"])
        node["installUrl"] = store
        node["downloadUrl"] = store
        node["sameAs"] = [store]
        # Free to download; the subscriptions are in-app purchases
        node["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "USD", "url": store}
    return node


def structured_data(url):
    org = org_ref()
    home = ("Home", "/")
    graphs = {
        "/": [
            ORGANIZATION,
            {"@type": "WebSite", "@id": SITE + "/#website", "name": "Zest Mavericks", "alternateName": "ZestMavericks",
             "url": SITE + "/", "publisher": org},
        ],
        "/markpdf/": [mobile_app("markpdf"), breadcrumbs(home, ("MarkPDF", "/markpdf/"))],
        "/topdrawer/": [mobile_app("topdrawer"), breadcrumbs(home, ("TopDrawer", "/topdrawer/"))],
        "/about/": [
            {"@type": "AboutPage", "url": SITE + "/about/", "about": org},
            breadcrumbs(home, ("About", "/about/")),
        ],
        "/contact/": [
            {"@type": "ContactPage", "url": SITE + "/contact/", "about": org},
            breadcrumbs(home, ("Contact", "/contact/")),
        ],
        "/markpdf/terms/": [breadcrumbs(home, ("MarkPDF", "/markpdf/"), ("Terms and privacy", "/markpdf/terms/"))],
        "/topdrawer/terms/": [breadcrumbs(home, ("TopDrawer", "/topdrawer/"), ("Terms of Use", "/topdrawer/terms/"))],
        "/topdrawer/privacy/": [breadcrumbs(home, ("TopDrawer", "/topdrawer/"), ("Privacy Policy", "/topdrawer/privacy/"))],
    }
    return {"@context": "https://schema.org", "@graph": graphs[url]}


def meta(url):
    out = []
    # Safari on iPhone shows a native "Get" bar for the app this page is about
    banner_app = {"/": "markpdf", "/markpdf/": "markpdf"}.get(url)
    if banner_app and APPS[banner_app]["app_store_id"]:
        out.append(f'<meta name="apple-itunes-app" content="app-id={APPS[banner_app]["app_store_id"]}" />')
    data = json.dumps(structured_data(url), indent=2, ensure_ascii=False).replace("</", "<\\/")
    out.append('<script type="application/ld+json">')
    out += data.splitlines()
    out.append("</script>")
    return out


# ---------------------------------------------------------------- rendering

BLOCK = re.compile(
    r"^(?P<indent>[ \t]*)<!-- render:(?P<kind>[a-z]+)(?P<args>[^>]*?) -->\n"
    r"(?:.*?\n)??"
    r"(?P=indent)<!-- /render:(?P=kind) -->$",
    re.M | re.S,
)
ARG = re.compile(r'([a-z]+)(?:="([^"]*)")?')


def render_block(kind, args, url):
    if kind == "header":
        return header(url)
    if kind == "footer":
        return footer(args.get("product", "markpdf"))
    if kind == "pricing":
        return pricing(args["product"])
    if kind == "screenshot":
        return screenshot(args["name"], args["alt"], card="card" in args)
    if kind == "meta":
        return meta(url)
    raise ValueError(f"unknown render block: {kind}")


def render_page(text, url):
    def replace(match):
        indent, kind = match["indent"], match["kind"]
        args = {k: v for k, v in ARG.findall(match["args"])}
        body = [indent + line if line else "" for line in render_block(kind, args, url)]
        return "\n".join([f"{indent}<!-- render:{kind}{match['args']} -->", *body, f"{indent}<!-- /render:{kind} -->"])

    return BLOCK.sub(replace, text)


def last_modified(rel):
    """Date the page last changed: today if it has uncommitted edits, else its last commit."""
    dirty = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", rel], cwd=ROOT).returncode != 0
    if not dirty:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel], cwd=ROOT, capture_output=True, text=True)
        if out.stdout.strip():
            return out.stdout.strip()
    return datetime.date.today().isoformat()


def sitemap(pages):
    rows = [
        f"  <url><loc>{SITE}{url}</loc><lastmod>{last_modified(rel)}</lastmod></url>"
        for rel, url in pages.items()
        if url
    ]
    return "\n".join(['<?xml version="1.0" encoding="UTF-8"?>',
                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', *rows, "</urlset>", ""])


def main():
    check = "--check" in sys.argv
    stale = []
    for rel, url in PAGES.items():
        path = ROOT / rel
        old = path.read_text()
        new = render_page(old, url)
        if new != old:
            stale.append(rel)
            if not check:
                path.write_text(new)
    # The sitemap goes last, so its dates see the pages just written
    old_map = (ROOT / "sitemap.xml").read_text()
    new_map = sitemap(PAGES)
    if new_map != old_map:
        stale.append("sitemap.xml")
        if not check:
            (ROOT / "sitemap.xml").write_text(new_map)

    if check:
        if stale:
            print("Out of date (run python3 tools/render_site.py):\n  " + "\n  ".join(stale))
            return 1
        print("All pages up to date.")
        return 0
    print(("Updated:\n  " + "\n  ".join(stale)) if stale else "Nothing to update.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
