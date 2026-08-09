/* Zest Mavericks — main.js
   External so the site can run under a strict Content-Security-Policy
   (no 'unsafe-inline'). Everything is defensive: if an element is
   missing the script exits quietly instead of throwing. */

(function () {
    "use strict";

    /* ---- Footer copyright year ---- */
    var year = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach(function (el) {
        el.textContent = year;
    });

    /* ---- Contact form ---- */
    var form = document.getElementById("contactForm");
    if (!form) return;

    var endpoint = form.getAttribute("data-endpoint");
    var submitBtn = form.querySelector('button[type="submit"]');
    var status = document.getElementById("formStatus");
    var done = document.getElementById("formDone");
    var openedAt = Date.now();

    var LIMITS = { subject: 120, name: 80, email: 254, message: 2000 };
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function field(name) {
        return form.elements[name];
    }

    function setError(name, message) {
        var input = field(name);
        var slot = document.getElementById(name + "Error");
        if (slot) slot.textContent = message || ""; // textContent, never innerHTML
        if (input) {
            if (message) input.setAttribute("aria-invalid", "true");
            else input.removeAttribute("aria-invalid");
        }
    }

    function say(message, state) {
        if (!status) return;
        status.textContent = message || "";
        if (state) status.setAttribute("data-state", state);
        else status.removeAttribute("data-state");
    }

    function validate(values) {
        var ok = true;

        ["subject", "name", "email", "message"].forEach(function (key) {
            setError(key, "");
        });

        if (!values.subject) {
            setError("subject", "Add a subject so we know what this is about.");
            ok = false;
        } else if (values.subject.length > LIMITS.subject) {
            setError("subject", "Keep the subject under " + LIMITS.subject + " characters.");
            ok = false;
        }

        if (!values.name) {
            setError("name", "Tell us your name.");
            ok = false;
        } else if (values.name.length > LIMITS.name) {
            setError("name", "That name is too long for our form.");
            ok = false;
        }

        if (!values.email) {
            setError("email", "We need an email address to reply to.");
            ok = false;
        } else if (!EMAIL_RE.test(values.email) || values.email.length > LIMITS.email) {
            setError("email", "Check the email address — it doesn't look right.");
            ok = false;
        }

        if (!values.message) {
            setError("message", "Write a message before sending.");
            ok = false;
        } else if (values.message.length > LIMITS.message) {
            setError("message", "Messages are limited to " + LIMITS.message + " characters.");
            ok = false;
        }

        return ok;
    }

    function busy(isBusy) {
        if (!submitBtn) return;
        submitBtn.disabled = isBusy;
        submitBtn.textContent = isBusy ? "Sending…" : "Send message";
    }

    function showThanks() {
        form.hidden = true;
        if (done) {
            done.hidden = false;
            done.focus();
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var values = {
            subject: (field("subject").value || "").trim(),
            name: (field("name").value || "").trim(),
            email: (field("email").value || "").trim(),
            message: (field("message").value || "").trim()
        };

        /* Honeypot: real people never fill this in. Pretend it worked so
           the bot doesn't learn anything, but send nothing. */
        var trap = field("company");
        if (trap && trap.value !== "") {
            showThanks();
            return;
        }

        /* Nobody reads and fills this form in under two seconds. */
        if (Date.now() - openedAt < 2000) {
            say("Give it a second and press send again.", "error");
            return;
        }

        if (!validate(values)) {
            say("Fix the highlighted fields and try again.", "error");
            var firstBad = form.querySelector('[aria-invalid="true"]');
            if (firstBad) firstBad.focus();
            return;
        }

        say("", null);

        if (!endpoint) {
            say("The form isn't connected yet. Email us at zestmavericks@gmail.com.", "error");
            return;
        }

        busy(true);

        var body = new URLSearchParams();
        Object.keys(values).forEach(function (key) {
            body.append(key, values[key]);
        });

        var controller = typeof AbortController === "function" ? new AbortController() : null;
        var timer = controller
            ? window.setTimeout(function () {
                  controller.abort();
              }, 10000)
            : null;

        fetch(endpoint, {
            method: "POST",
            body: body,
            mode: "no-cors",
            referrerPolicy: "no-referrer",
            signal: controller ? controller.signal : undefined
        })
            .then(function () {
                /* The response is opaque in no-cors mode, so a resolved
                   promise is the only success signal available here. */
                form.reset();
                showThanks();
            })
            .catch(function () {
                say(
                    "That didn't send. Check your connection, or email us at zestmavericks@gmail.com.",
                    "error"
                );
                busy(false);
            })
            .then(function () {
                if (timer) window.clearTimeout(timer);
            });
    });

    /* Clear an error as soon as the person starts fixing it */
    ["subject", "name", "email", "message"].forEach(function (key) {
        var input = field(key);
        if (!input) return;
        input.addEventListener("input", function () {
            if (input.getAttribute("aria-invalid") === "true") setError(key, "");
        });
    });
})();
