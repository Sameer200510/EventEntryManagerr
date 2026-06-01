const express = require("express");
const router = express.Router();
const checkpointController = require("../controllers/checkpointController");
const { protect, authorize } = require("../middleware/auth");

router.get("/event/:eventId", protect, checkpointController.getEventCheckpoints);
router.post("/event/:eventId", protect, authorize("ADMIN"), checkpointController.createCheckpoint);
router.post("/event/:eventId/batch", protect, authorize("ADMIN"), checkpointController.batchUpdateCheckpoints);
router.put("/:id", protect, authorize("ADMIN"), checkpointController.updateCheckpoint);
router.delete("/:id", protect, authorize("ADMIN"), checkpointController.deleteCheckpoint);

module.exports = router;
