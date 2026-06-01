const express = require("express");
const { getProviders, saveProvider, testConnection, getAuditLogs } = require("../controllers/settingsController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("ADMIN"));

router.get("/email-providers", getProviders);
router.post("/email-providers", saveProvider);
router.post("/test-email", testConnection);
router.get("/audit-logs", getAuditLogs);

module.exports = router;
