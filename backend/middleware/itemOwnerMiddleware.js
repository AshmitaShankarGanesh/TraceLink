const Item = require('../models/Item');

/**
 * Loads item by :id and allows only owner or admin. Sets req.item.
 */
const itemOwnerOrAdmin = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const userId = req.user._id.toString();
    const isOwner = item.reportedBy.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this item',
      });
    }

    req.item = item;
    next();
  } catch (error) {
    console.error('itemOwnerOrAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { itemOwnerOrAdmin };
