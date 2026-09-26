/* Zest Mavericks - redirect.js
 *
 * Used only by the stub pages left at old .html URLs (about.html,
 * terms.html, ...). GitHub Pages can't send real redirects, so each stub
 * carries a <meta http-equiv="refresh"> to its new address.
 *
 * A meta refresh drops the #fragment, which would break old links such as
 * terms.html#privacy-policy. This sends the visitor to the canonical URL
 * with the fragment kept, before the refresh fires. Without JavaScript the
 * refresh still works, just without the fragment.
 */

(function () {
    "use strict";

    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return;

    /* Same origin only: take the path from the canonical URL, so this also
       works on localhost and can never send anyone off site. */
    var target = new URL(canonical.href, window.location.href);
    window.location.replace(target.pathname + window.location.hash);
})();
