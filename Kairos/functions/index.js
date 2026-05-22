const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const jwt = require("jsonwebtoken");

initializeApp();
const db = getFirestore();

// ─── App Store Connect JWT ───────────────────────────────────
function generateASCToken() {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = process.env.ASC_PRIVATE_KEY.replace(/\\n/g, "\n");

  return jwt.sign(
    {
      iss: process.env.ASC_ISSUER_ID,
      iat: now,
      exp: now + 20 * 60,
      aud: "appstoreconnect-v1",
    },
    privateKey,
    { algorithm: "ES256", keyid: process.env.ASC_KEY_ID },
  );
}

// ─── Add tester to TestFlight ────────────────────────────────
async function addToTestFlight(email, firstName, lastName) {
  const token = generateASCToken();

  const res = await fetch(
    "https://api.appstoreconnect.apple.com/v1/betaTesters",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "betaTesters",
          attributes: {
            email,
            firstName,
            lastName: lastName || "",
          },
          relationships: {
            betaGroups: {
              data: [
                {
                  type: "betaGroups",
                  id: process.env.ASC_BETA_GROUP_ID,
                },
              ],
            },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    console.error("TestFlight API error:", JSON.stringify(error));
    throw new Error(`TestFlight invite failed: ${res.status}`);
  }

  return res.json();
}

// ─── Email validation ────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255;
}

// ─── Main: Join Waitlist ─────────────────────────────────────
exports.joinWaitlist = onCall(
  {
    enforceAppCheck: true,
    cors: true,
  },
  async (request) => {
    const { email, firstName, honeypot } = request.data;

    // 1. Honeypot — bots fill hidden fields
    if (honeypot) {
      // Silently reject — don't reveal it's a honeypot
      return { success: true, position: 0 };
    }

    // 2. Validate inputs
    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Please enter a valid email.");
    }
    if (
      !firstName ||
      typeof firstName !== "string" ||
      firstName.trim().length === 0 ||
      firstName.length > 100
    ) {
      throw new HttpsError("invalid-argument", "Please enter your name.");
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = firstName.trim().substring(0, 100);

    // 3. Check duplicate
    const existing = await db
      .collection("waitlist")
      .where("email", "==", sanitizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new HttpsError("already-exists", "You're already on the waitlist!");
    }

    // 4. Save to Firestore
    const docRef = await db.collection("waitlist").add({
      email: sanitizedEmail,
      firstName: sanitizedName,
      createdAt: FieldValue.serverTimestamp(),
      testflightInvited: false,
      source: request.rawRequest?.headers?.referer || "direct",
    });

    // 5. Try TestFlight invite (don't block signup on failure)
    try {
      await addToTestFlight(sanitizedEmail, sanitizedName, "");
      await docRef.update({ testflightInvited: true });
    } catch (err) {
      console.error(`TestFlight invite failed for ${sanitizedEmail}:`, err);
      // Will be retried by scheduled function
    }

    // 6. Get position
    const countSnapshot = await db.collection("waitlist").count().get();
    const position = countSnapshot.data().count;

    return {
      success: true,
      position,
    };
  },
);

// ─── Get waitlist count (for display) ────────────────────────
exports.getWaitlistCount = onCall(
  {
    enforceAppCheck: true,
    cors: true,
  },
  async () => {
    const snapshot = await db.collection("waitlist").count().get();
    return { count: snapshot.data().count };
  },
);

// ─── Retry failed TestFlight invites every 6 hours ──────────
exports.retryFailedInvites = onSchedule("every 6 hours", async () => {
  const failed = await db
    .collection("waitlist")
    .where("testflightInvited", "==", false)
    .limit(50)
    .get();

  let successCount = 0;

  for (const doc of failed.docs) {
    const data = doc.data();
    try {
      await addToTestFlight(data.email, data.firstName, "");
      await doc.ref.update({ testflightInvited: true });
      successCount++;
    } catch (err) {
      console.error(`Retry failed for ${doc.id}:`, err.message);
    }
  }

  console.log(`Retried ${failed.size} invites, ${successCount} succeeded.`);
});
