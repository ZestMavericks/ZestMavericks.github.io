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

Anything that repeats across pages is a small custom element in `js/components/`,
so it's edited in one place. No build step: each file renders plain markup that
`css/style.css` styles as usual.

| Tag | What it is | Load it with |
| --- | --- | --- |
| `<site-header>` | nav pill and theme toggle; highlights the current page by itself | `<script src="/js/components/site-header.js">` in `<head>`, **not** deferred, right after `theme.js` |
| `<site-footer>` | footer; `data-product="topdrawer"` swaps in TopDrawer's legal links | `site-footer.js`, `defer` |
| `<site-pricing id="pricing" data-product="markpdf">` | the plans section; every product's prices live in `PRODUCTS` in the script | `site-pricing.js`, `defer` |
| `<app-screenshot src alt width height>` | one app screenshot; width/height are the PNG's pixel size (`sips -g pixelWidth -g pixelHeight file.png`); add `card` for opaque artwork | `app-screenshot.js` in `<head>`, **not** deferred, after `site-header.js` |

Run `python3 tools/check_links.py` after changing any of them: it checks the
paths inside the scripts as well as the pages.

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

1. `python3 tools/check_links.py` must pass.
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
- **Trusted Types** (`require-trusted-types-for 'script'`): the browser refuses any
  string written to `innerHTML` and similar sinks unless it comes from one of the named
  policies `zm-header`, `zm-footer` or `zm-pricing`. A new component that writes HTML
  needs its own policy, and its name added to the CSP on every page and in `_headers`;
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

- Serve the screenshots as WebP/AVIF through `<app-screenshot>`, crop the transparent
  margin off the MarkPDF mockups, and shrink the App Store badge (2560px wide, shown at
  168px).
- Put a CDN in front of the site to turn on the headers in `_headers`.
