/* Zest Mavericks - theme.js
 *
 * Light and dark mode. Loaded in <head> WITHOUT defer on purpose: it has
 * to set data-theme on <html> before the first paint, otherwise a dark
 * mode visitor gets a white flash on every page load.
 *
 * Order of preference:
 *   1. the choice the visitor made here before, kept in localStorage
 *   2. the operating system setting, followed live until they choose
 *
 * No inline styles anywhere, so the site keeps working under a strict
 * Content-Security-Policy with no 'unsafe-inline'.
 */

(function () {
    "use strict";

    var KEY = "zm-theme";
    var root = document.documentElement;

    var darkQuery = window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
    var stillQuery = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    /* localStorage throws in private mode and over file:// in some
       browsers, so every touch of it is guarded. */
    function saved() {
        try {
            var value = window.localStorage.getItem(KEY);
            return value === "dark" || value === "light" ? value : null;
        } catch (error) {
            return null;
        }
    }

    function remember(theme) {
        try {
            window.localStorage.setItem(KEY, theme);
        } catch (error) {
            /* A visitor who can't store the choice still gets the toggle,
               it just doesn't survive the next page load. */
        }
    }

    function fromSystem() {
        return darkQuery && darkQuery.matches ? "dark" : "light";
    }

    var current = saved() || fromSystem();
    root.setAttribute("data-theme", current);

    var button = null;

    function describe() {
        return current === "dark" ? "Switch to light mode" : "Switch to dark mode";
    }

    function sync() {
        if (!button) return;
        button.setAttribute("aria-pressed", current === "dark" ? "true" : "false");
        button.setAttribute("aria-label", describe());
        button.setAttribute("title", describe());
    }

    function apply(theme, persist) {
        current = theme;
        root.setAttribute("data-theme", theme);
        if (persist) remember(theme);
        sync();
    }

    /* Track the operating system until the visitor picks a side */
    if (darkQuery && darkQuery.addEventListener) {
        darkQuery.addEventListener("change", function () {
            if (saved()) return;
            apply(fromSystem(), false);
        });
    }

    /* Fallback sweep for browsers without view transitions: an overlay in
       the incoming background colour grows out of the top right corner,
       and the theme flips underneath it while the screen is covered. */
    function sweep(theme) {
        var cover = document.createElement("div");
        cover.className = "theme-wave";
        cover.setAttribute("data-to", theme);
        cover.setAttribute("aria-hidden", "true");
        document.body.appendChild(cover);

        window.setTimeout(function () {
            apply(theme, true);
        }, 300);

        window.setTimeout(function () {
            if (cover.parentNode) cover.parentNode.removeChild(cover);
        }, 900);
    }

    function clearWave() {
        root.removeAttribute("data-wave");
    }

    function toggle() {
        var next = current === "dark" ? "light" : "dark";

        if (stillQuery && stillQuery.matches) {
            apply(next, true);
            return;
        }

        if (typeof document.startViewTransition === "function") {
            root.setAttribute("data-wave", "on");
            var transition = document.startViewTransition(function () {
                apply(next, true);
            });
            transition.finished.then(clearWave, clearWave);
            return;
        }

        sweep(next);
    }

    function ready() {
        button = document.getElementById("themeToggle");
        if (!button) return;

        /* The button ships hidden so it never sits there dead when
           JavaScript is off. Nothing else can switch the theme. */
        button.hidden = false;
        sync();
        button.addEventListener("click", toggle);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ready);
    } else {
        ready();
    }
})();
