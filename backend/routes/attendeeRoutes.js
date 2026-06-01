const express = require('express');
const multer = require('multer');
const attendeeController = require('../controllers/attendeeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Routes - Protected by role
router.post('/parse-excel', protect, authorize('ADMIN'), upload.single('file'), attendeeController.parseExcel);
router.post('/validate-excel', protect, authorize('ADMIN'), upload.single('file'), attendeeController.validateExcel);
router.post('/upload-excel', protect, authorize('ADMIN'), upload.single('file'), attendeeController.uploadExcel);

router.get('/datasets', protect, authorize('ADMIN'), attendeeController.getDatasets);
router.post('/datasets/:id/restore', protect, authorize('ADMIN'), attendeeController.restoreDataset);
router.delete('/datasets/:id', protect, authorize('ADMIN'), attendeeController.deleteDataset);
router.delete('/clear', protect, authorize('ADMIN'), attendeeController.clearAttendees);

router.post('/scan', protect, authorize('ADMIN', 'ENTRY_VOLUNTEER', 'FOOD_VOLUNTEER'), attendeeController.scanAttendee);
router.get('/', protect, authorize('ADMIN'), attendeeController.getAllAttendees);
router.post('/send-email/:id', protect, authorize('ADMIN'), attendeeController.sendManualEmail);

router.post('/campaigns/start', protect, authorize('ADMIN'), attendeeController.startCampaign);
router.get('/campaigns/active', protect, authorize('ADMIN'), attendeeController.getActiveCampaign);
router.post('/campaigns/:id/pause', protect, authorize('ADMIN'), attendeeController.pauseCampaign);
router.post('/campaigns/:id/resume', protect, authorize('ADMIN'), attendeeController.resumeCampaign);
router.post('/campaigns/:id/cancel', protect, authorize('ADMIN'), attendeeController.cancelCampaign);
router.get('/campaigns/:id/report', protect, authorize('ADMIN'), attendeeController.getCampaignReport);
module.exports = router;
