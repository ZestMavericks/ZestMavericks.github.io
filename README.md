# ZestMavericks.github.io
Proud to be Open Source our website

# Zest Mavericks — site notes

Still plain HTML, CSS and JS. No build step, no dependencies, no framework.

Every page is a folder with an `index.html`, so URLs have no `.html` on the end:

```
/                     index.html
/markpdf/             markpdf/index.html
/markpdf/terms/       markpdf/terms/index.html
/topdrawer/           topdrawer/index.html
/topdrawer/terms/     topdrawer/terms/index.html
/topdrawer/privacy/   topdrawer/privacy/index.html
/about/               about/index.html
/contact/             contact/index.html
404.html              served by GitHub Pages for any missing path
```

The old `.html` addresses (`about.html`, `terms.html`, `topdrawer/privacy.html`, ...)
are small redirect stubs that forward to the new URL, so App Store listings and
old links keep working. Don't delete them.

All links and resources are root-relative (`/css/style.css`, `/about/`), so the
site has to be served from a domain root. To preview locally:

```
python3 -m http.server 8000     # then open http://localhost:8000/
```

Opening a file straight from Finder (`file://`) won't load CSS or images.

## Shared pieces

Anything that repeats across pages (header, footer, pricing, screenshots, the
structured data in each `<head>`, and `sitemap.xml`) is written into the HTML by
`tools/render_site.py`. Pages mark where each piece goes, and everything between
the markers is regenerated on every run:

```html
<!-- render:header --> ... <!-- /render:header -->
<!-- render:footer product="topdrawer" --> ... <!-- /render:footer -->
<!-- render:pricing product="markpdf" --> ... <!-- /render:pricing -->
<!-- render:screenshot name="markpdf/scan" alt="..." card --> ... <!-- /render:screenshot -->
<!-- render:meta --> ... <!-- /render:meta -->   (JSON-LD, preview card, Smart App Banner)
<!-- render:guides app="markpdf" --> ...             (list of how-to guides)
<!-- render:hero-cta app="topdrawer" --> / <!-- render:guide-cta app="markpdf" -->   (App Store buttons)
<!-- render:factsheet app="markpdf" --> / <!-- render:downloads -->   (press kit)
```

The script also writes `sitemap.xml` and `llms.txt` (a plain-text brief for AI
agents, from the same data).

Edit the data and templates in the script, never the generated HTML, then run:

```
python3 tools/render_site.py           # rewrite pages and sitemap.xml
python3 tools/render_site.py --check   # fails if a page is out of date
```

Why not JavaScript components: AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
never run JavaScript, so anything drawn in the browser, prices included, was
invisible to them. Now the committed HTML is complete, and there's still nothing
to build at deploy. Prices and app facts live once in the script and feed the
visible page, the structured data and the sitemap alike.

## Launching an app

Each app in `APPS` (in `tools/render_site.py`) has a `launch` state: `coming`,
`preorder` or `live`, plus its `app_store_id` once the listing exists. Change
those two values and run the script: the hero buttons and status line, the
guide and pricing buttons, the Smart App Banner, the structured data offer,
the press-kit fact sheet and `llms.txt` all follow together. By hand you still
update the TopDrawer FAQ's "When can I get it?" answer and the "Coming soon"
badge on its preview card (`tools/og-cards/cards.html`, then
`tools/make_og_cards.sh`).

## Guides

How-to guides live in `<app>/how-to/<slug>/index.html` (`markpdf` or
`topdrawer`) and are found automatically: the hub page, the list on the app's
page, the sitemap and `llms.txt` all pick a new one up on the next render. Copy an existing guide
and keep its three parts: a `p.guide-answer` that answers the question on its
own in two sentences, an `ol.guide-steps`, and a screenshot. The `HowTo`
structured data is read from those visible steps, so it can't drift from them.
Only describe steps you've checked in the app.

A `<dl class="faq">` on any page becomes `FAQPage` structured data the same way:
the questions and answers are read from the visible list.

## Link previews and search pings

- `tools/make_og_cards.sh` renders the 1200×630 cards in `assets/og/` from
  `tools/og-cards/cards.html` in a headless browser (Helium or Chrome).
- `tools/indexnow.py`, run after a push has deployed, tells Bing (which feeds
  Copilot and ChatGPT search) and other IndexNow engines what changed. The key
  file at the site root must stay.

## Images

The PNGs in `assets/` are masters and aren't shown directly any more (except as
`og:image` social previews, which stay PNG for link-preview compatibility).
`tools/optimize_images.sh` builds what the pages actually load:

- `assets/shots/`: screenshots as AVIF + WebP at 600 and 900px wide, since they're
  shown at up to 300px (2x and 3x screens). The MarkPDF mockups are cropped to
  the phone, dropping their transparent margin.
- `assets/icons/`, `assets/badges/`: hero icons, App Store badge and footer icons
  as WebP at 2x and 3x (AVIF is bigger than WebP at these sizes).

To add a screenshot: put the PNG in `assets/`, add a line to the script, run it
(needs `brew install webp libavif`), then add a `render:screenshot` marker and run
`tools/render_site.py`; it reads the width and height from the WebP itself.

## Fonts

Poppins is self-hosted in `fonts/poppins/`: the Latin subset files Google Fonts
serves (v24), under the SIL Open Font License (`fonts/poppins/OFL.txt`). No
request goes to Google, so the CSP allows fonts and styles from `'self'` only.

`@font-face` rules are at the top of `css/style.css`, followed by a
"Poppins Fallback" face: Arial resized with `size-adjust` and ascent/descent
overrides so it takes the same space as Poppins, and the page doesn't jump when
the web font arrives. Pages preload the 400 and 700 weights. To add a weight,
download its Latin `.woff2` from the Google Fonts CSS and add an `@font-face`.

## Deploying

GitHub Pages publishes `main` at https://zestmavericks.com (see `CNAME`), with HTTPS
enforced. Before pushing:

1. `python3 tools/render_site.py --check` and `python3 tools/check_links.py` must pass.
2. Preview with `python3 -m http.server 8000`.

`_config.yml` keeps `Kairos/`, `tools/` and this README off the published site;
Jekyll also skips anything starting with `.` or `_`.

## Bugs that were fixed

| Where | Problem |
| --- | --- |
| `style.css` | `--navbar-width` / `--navbar-height` / `--button-font-size` were only declared inside a `max-width: 768px` media query, so on desktop the navbar had no width or height at all |
| `style.css` | `margin;: 0` — invalid declaration in `.banner p` |
| `style.css` | bare `svg { position: absolute }` positioned *every* SVG on the page, not just the footer wave |
| `style.css` | `.big-spacer { height: 700px }` and `.about-div { height: 900px }` forced fixed heights on flex sections, clipping content on phones |
| `index.html` | two `submit` listeners on the same form: the first showed a success message, the second then ran and looked up `getElementById("success-message")` — the real id is `successMessage`, so it returned `null` and threw a TypeError on every send |
| `index.html` | the `.catch()` branch referenced the same null elements, so failures crashed instead of showing an error |
| `terms.html` | `<a href="">here</a>` (dead privacy link) and `<a href="zestmavericks@gmail.com">` (missing `mailto:`, resolved to a relative file path) |
| `terms.html` | no navigation — a dead end once you landed on it |
| `contact.html` | wasn't linked from anywhere, and duplicated the home page hero |

## Security

**What's enforced today.** GitHub Pages can't send custom response headers, so each
page's `<meta http-equiv="Content-Security-Policy">` is the policy that actually runs:

- scripts, styles, fonts and images from this site only (`'self'`); no
  `'unsafe-inline'` or `'unsafe-eval'` anywhere, because every script is an external
  file and there are no `style="..."` attributes;
- **Trusted Types** (`require-trusted-types-for 'script'; trusted-types 'none'`): no
  script on the site writes HTML from strings, so the browser refuses every
  `innerHTML`-style write and no script can create a policy to get around it. Build
  DOM with `createElement` and `textContent`;
- `upgrade-insecure-requests`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`;
- `connect-src` allows the contact form's Google Apps Script endpoint and nothing else.

Also:

- **HTTPS**: GitHub Pages redirects `http://` to `https://` (Enforce HTTPS is on).
- **No third-party requests**: fonts are self-hosted, so the only external call is the
  contact form.
- **`rel="noopener noreferrer"`** on every link that opens a new tab.
- **Form input is length-capped** (subject 120, name 80, email 254, message 2000) on
  both the client and in the markup, and errors are written with `textContent`,
  never `innerHTML`.
- **Spam:** a honeypot field (`company`) plus a two-second minimum time-on-page.
  A bot that fills the trap gets a fake success and nothing is sent.
- **`/.well-known/security.txt`** tells researchers where to report issues. Its
  `Expires` date must be renewed yearly.

**Not possible on GitHub Pages alone:** `frame-ancestors` / `X-Frame-Options`
(clickjacking), HSTS, `X-Content-Type-Options` and `Permissions-Policy` only work as
real headers. `_headers` holds the full set, ready for when a CDN (Cloudflare,
Netlify) sits in front of the site.

### One thing you can't fix in the browser

The Apps Script URL is in the page source, so anyone can POST to it directly. That's
true of any client-side form endpoint. Worth adding inside the Apps Script itself:

- reject requests whose `subject`/`message` exceed your limits,
- cap submissions per day with `PropertiesService`,
- ignore posts where the `company` field is non-empty.

Because the request is `mode: "no-cors"`, the browser can never read the response —
a resolved promise is the only success signal available, which is why the code treats
it that way rather than pretending to check a status code.

## Mobile

- Every font size, gap and section padding is a `clamp()` — nothing is a fixed pixel
  height any more, so sections grow with their content instead of clipping it.
- Showcase rows are a CSS grid that collapses to one column below 880px, with the
  screenshot always moving above the copy.
- Form inputs are set to `16px`, which stops iOS Safari zooming in on focus.
- Every tap target is at least 44×44px, including the nav pills.
- `viewport-fit=cover` plus `env(safe-area-inset-top)` keeps the floating nav clear of
  the notch.

## Accessibility

Skip link, one `<h1>` per page, headings in order (the old pages used `<h2>` for
taglines and `<h4>`/`<h5>` for footer text), `aria-current="page"` on the active nav
item, real `alt` text on every image, decorative wave marked `aria-hidden`, visible
focus rings, form errors tied to inputs with `aria-describedby` and announced through
`aria-live`, and `prefers-reduced-motion` honoured throughout.

## Optional next steps

- Put a CDN in front of the site to turn on the headers in `_headers`.
