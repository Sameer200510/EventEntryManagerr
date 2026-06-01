require("dotenv").config();
const express = require("express");
const dns = require("node:dns");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// Force IPv4 first (helps on Render / cloud envs)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const app = express();
const PORT = process.env.PORT || 5000;

/* 
   CORS FIX
 */
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://localhost:5175"];

const corsOptions = {
  origin(origin, callback) {
    // allow server-to-server / postman / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* 
   BODY PARSERS
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* 
   RATE LIMITERS
 */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many scan requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many OTP requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* 
   ROUTES
 */
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/attendees/scan", scanLimiter);
app.use("/api/attendees", require("./routes/attendeeRoutes"));

app.use("/api/otp/send", otpLimiter);
app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));

/* 
   HEALTH CHECK
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend running",
    time: new Date().toISOString(),
  });
});

/* 
   PUBLIC QR VERIFY PAGE
 */
app.get("/verify/:token", async (req, res) => {
  try {
    const prisma = require("./prismaClient");
    const token = req.params.token;

    const attendee = await prisma.attendee.findUnique({
      where: { token },
    });

    if (!attendee) {
      return res.status(404).send(`
        <div style="font-family:sans-serif;text-align:center;margin-top:50px;">
          <h1 style="color:#ef4444;">❌ Invalid QR Code</h1>
          <p>This token does not exist in our system.</p>
        </div>
      `);
    }

    const isAlreadyUsed = attendee.entryStatus;

    return res.send(`
      <div style="font-family:sans-serif;text-align:center;margin-top:50px;background:white;max-width:500px;margin-left:auto;margin-right:auto;padding:40px;border-radius:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 10px 10px -5px rgba(0,0,0,.04);border:1px solid #e5e7eb;">
        <div style="margin-bottom:24px;">
          <div style="width:80px;height:80px;background:#fff7ed;border-radius:40px;display:flex;align-items:center;justify-content:center;margin:0 auto;border:2px solid #fbbf24;">
            <span style="font-size:40px;">⚠️</span>
          </div>
        </div>

        <h1 style="color:#1f2937;margin-bottom:12px;font-size:24px;font-weight:800;">
          Official Scanner Required
        </h1>

        <p style="color:#4b5563;font-size:16px;line-height:1.5;margin-bottom:24px;">
          This QR code must be scanned through the <strong>Official Entry Platform</strong> by an authorized volunteer.
        </p>

        <div style="background:#f9fafb;padding:20px;border-radius:16px;text-align:left;margin-bottom:24px;border:1px solid #f3f4f6;">
          <p style="margin:0;color:#9ca3af;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">
            Attendee Details
          </p>
          <p style="margin:4px 0 0;color:#111827;font-size:18px;font-weight:700;">
            ${attendee.name}
          </p>
          <p style="margin:2px 0 0;color:#6b7280;font-size:14px;">
            Roll No: ${attendee.roll}
          </p>
          ${
            isAlreadyUsed
              ? '<p style="margin:8px 0 0;color:#f97316;font-size:13px;font-weight:600;">⚠️ Status: Already Checked In</p>'
              : '<p style="margin:8px 0 0;color:#10b981;font-size:13px;font-weight:600;">✅ Status: Valid Ticket</p>'
          }
        </div>

        <p style="color:#9ca3af;font-size:13px;">
          External scanners cannot process entry counts.
        </p>
      </div>

      <style>
        body {
          background-color:#f3f4f6;
          padding:20px;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
        }
      </style>
    `);
  } catch (err) {
    console.error("Public verify error:", err);
    return res.status(500).send("<h2>Server error during verification.</h2>");
  }
});

/* 
   GLOBAL ERROR HANDLER
 */
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

/* 
   START SERVER
 */
const { startWorker } = require("./workers/emailWorker");

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startWorker();
});
