const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");

// Templates
router.get("/templates", campaignController.getTemplates);
router.post("/templates", campaignController.createTemplate);
router.put("/templates/:id", campaignController.updateTemplate);
router.delete("/templates/:id", campaignController.deleteTemplate);

// Campaigns
router.get("/", campaignController.getCampaigns);
router.post("/start", campaignController.startCampaign);
router.post("/:id/retry", campaignController.retryFailed);

// Public tracking pixel endpoint
router.get("/track/:trackingId", campaignController.trackOpen);

module.exports = router;
