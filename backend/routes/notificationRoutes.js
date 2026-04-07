const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../middleware/validationMiddleware');
const {
  getNotifications,
  markNotificationRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/:id/read', validateObjectIdParam('id'), markNotificationRead);

module.exports = router;

