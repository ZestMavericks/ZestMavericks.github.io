# ZestMavericks.github.io
Proud to be Open Source our website

# Zest Mavericks — site notes

Still plain HTML, CSS and JS. No build step, no dependencies, no framework.
Drop these files next to your existing `assets/` folder and it runs.

```
index.html  markpdf.html  about.html  contact.html  terms.html
style.css   main.js
_headers    robots.txt    sitemap.xml
assets/     (unchanged — every filename is referenced exactly as before)
```

## Before you deploy

1. Replace `zestmavericks.com` with your real domain in the `<link rel="canonical">`
   and `og:` tags of each page, plus `robots.txt` and `sitemap.xml`.
2. Delete the old `style.css` — this one replaces it entirely.
3. If your host isn't Netlify or Cloudflare Pages, port `_headers` (see below).

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

- **Content-Security-Policy.** All JavaScript moved out of the HTML into `main.js`,
  and every `style="..."` attribute became a class, so the policy needs neither
  `'unsafe-inline'` nor `'unsafe-eval'`. It's in a `<meta>` tag as a fallback and in
  `_headers` for real (`frame-ancestors` only works as a real header).
- **`rel="noopener noreferrer"`** on every external link, so the destination can't
  reach back into your tab via `window.opener`.
- **HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`**
  in `_headers`.
- **Form input is length-capped** (subject 120, name 80, email 254, message 2000) on
  both the client and in the markup, and errors are written with `textContent`,
  never `innerHTML`.
- **Spam:** a honeypot field (`company`) plus a two-second minimum time-on-page.
  A bot that fills the trap gets a fake success and nothing is sent.

### One thing you can't fix in the browser

The Apps Script URL is in the page source, so anyone can POST to it directly. That's
true of any client-side form endpoint. Worth adding inside the Apps Script itself:

- reject requests whose `subject`/`message` exceed your limits,
- cap submissions per day with `PropertiesService`,
- ignore posts where the `company` field is non-empty.

Because the request is `mode: "no-cors"`, the browser can never read the response —
a resolved promise is the only success signal available, which is why the code treats
it that way rather than pretending to check a status code.

### Apache (`.htaccess`)

```apache
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://script.google.com https://script.googleusercontent.com; upgrade-insecure-requests"
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=()"
</IfModule>
```

### Nginx

```nginx
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://script.google.com https://script.googleusercontent.com; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

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

- Self-host the Poppins `.woff2` files to drop the two Google Fonts round-trips (and
  then remove `fonts.googleapis.com` from the CSP).
- Export the screenshots as WebP with `<picture>` fallbacks.
- Add `width` and `height` attributes to the screenshot `<img>` tags once you know
  their pixel dimensions — that removes the last bit of layout shift.
