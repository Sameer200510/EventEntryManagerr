const express = require("express");
const router = express.Router();
const campaignController = require("../controllers/campaignController");

router.use((req, res, next) => {
  console.log("Campaign Router hit:", req.method, req.path);
  next();
});

// Templates
router.get("/templates", campaignController.getTemplates);
router.post("/templates", campaignController.createTemplate);
router.put("/templates/:id", campaignController.updateTemplate);
router.delete("/templates/:id", campaignController.deleteTemplate);

// Campaigns
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaign);
router.get("/:id/recent-jobs", campaignController.getRecentJobs);
router.post("/start", campaignController.startCampaign);
router.post("/:id/retry", campaignController.retryFailed);
router.delete("/:id", campaignController.deleteCampaign);

// Public tracking pixel endpoint
router.get("/track/:trackingId", campaignController.trackOpen);

module.exports = router;
