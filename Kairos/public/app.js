import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-functions.js";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app-check.js";

// ─── Firebase Config ─────────────────────────────────────────
// These keys are safe to expose — Firestore rules are the
// security layer, NOT these credentials.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kairos-app.firebaseapp.com",
  projectId: "kairos-app",
  storageBucket: "kairos-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);

// ─── App Check (blocks Postman / script abuse) ───────────────

initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY",
  ),
  isTokenAutoRefreshEnabled: true,
});

const functions = getFunctions(app);
const joinWaitlist = httpsCallable(functions, "joinWaitlist");
const getWaitlistCount = httpsCallable(functions, "getWaitlistCount");

// ─── DOM Elements ────────────────────────────────────────────

const form = document.getElementById("waitlistForm");
const formWrapper = document.getElementById("formWrapper");
const successMessage = document.getElementById("successMessage");
const positionBadge = document.getElementById("positionBadge");
const submitBtn = document.getElementById("submitBtn");
const waitlistCountEl = document.getElementById("waitlistCount");
const toastEl = document.getElementById("toast");

// ─── Rate Limiting (client-side layer) ───────────────────────

const RATE_LIMIT_KEY = "kairos_wl_last";
const RATE_LIMIT_MS = 10000; // 10 seconds

function isRateLimited() {
  const last = localStorage.getItem(RATE_LIMIT_KEY);
  if (!last) return false;
  return Date.now() - parseInt(last, 10) < RATE_LIMIT_MS;
}

function markSubmission() {
  localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
}

// ─── Toast Notifications ─────────────────────────────────────

let toastTimer = null;

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.className = isError ? "toast error visible" : "toast visible";
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
  }, 4000);
}

// ─── Load Waitlist Count ─────────────────────────────────────

async function loadCount() {
  try {
    const result = await getWaitlistCount();
    const count = result.data.count;
    if (count > 0) {
      waitlistCountEl.innerHTML = `<strong>${count.toLocaleString()}</strong> ${
        count === 1 ? "person has" : "people have"
      } joined the waitlist`;
    }
  } catch {
    // Silently fail — not critical
  }
}

loadCount();

// ─── Form Submission ─────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (isRateLimited()) {
    showToast("Easy there — please wait a few seconds.", true);
    return;
  }

  const firstName = document.getElementById("firstName").value.trim();
  const email = document.getElementById("email").value.trim();
  const honeypot = document.getElementById("website").value;

  // Client-side validation
  if (!firstName) {
    showToast("Please enter your name.", true);
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email.", true);
    return;
  }

  // Disable button
  submitBtn.disabled = true;
  submitBtn.textContent = "Joining…";

  try {
    markSubmission();

    const result = await joinWaitlist({
      email,
      firstName,
      honeypot,
    });

    if (result.data.success) {
      const position = result.data.position;
      positionBadge.textContent = `#${position.toLocaleString()} on the waitlist`;

      formWrapper.style.display = "none";
      successMessage.classList.add("visible");

      loadCount();
    }
  } catch (err) {
    const message =
      err?.message?.includes("already-exists") ||
      err?.details === "Already on the waitlist"
        ? "You're already on the waitlist! 🎉"
        : "Something went wrong. Please try again.";

    showToast(message, !message.includes("already"));

    // Re-parse Firebase callable error
    if (err?.code === "functions/already-exists") {
      showToast("You're already on the waitlist! 🎉", false);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Join the Waitlist";
  }
});

// ─── Scroll-triggered Float Animations ───────────────────────

function initScrollAnimations() {
  const cards = document.querySelectorAll(".float-up");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger: each card appears slightly after the previous
          setTimeout(() => {
            entry.target.classList.add("visible");
            // Start gentle float after reveal
            setTimeout(() => {
              entry.target.classList.add("float-gentle");
            }, 800);
          }, i * 150);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    },
  );

  cards.forEach((card) => observer.observe(card));
}

initScrollAnimations();

// ─── Prevent Double Submission via Enter Key ─────────────────

let formSubmitting = false;

form.addEventListener("submit", (e) => {
  if (formSubmitting) {
    e.preventDefault();
    return;
  }
  formSubmitting = true;
  setTimeout(() => {
    formSubmitting = false;
  }, 3000);
});
