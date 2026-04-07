const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * Returns notifications for the logged-in user, newest first.
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
    });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Marks a notification as read for the current user.
 */
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating notification',
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
};

