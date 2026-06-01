const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, eventController.getAllEvents);
router.get('/:id', protect, eventController.getEventById);
router.post('/', protect, authorize("ADMIN"), eventController.createEvent);
router.put('/:id', protect, authorize("ADMIN"), eventController.updateEvent);
router.delete('/:id', protect, authorize("ADMIN"), eventController.deleteEvent);
router.post('/:id/activate', protect, authorize("ADMIN"), eventController.activateEvent);

module.exports = router;
