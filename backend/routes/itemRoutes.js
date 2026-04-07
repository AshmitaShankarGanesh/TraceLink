const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { itemOwnerOrAdmin } = require('../middleware/itemOwnerMiddleware');
const { uploadItemImages } = require('../middleware/uploadMiddleware');
const { validateObjectIdParam } = require('../middleware/validationMiddleware');
const {
  createItem,
  getItems,
  getItemMatches,
  getItemById,
  updateItem,
  updateItemStatus,
  deleteItem,
  getItemsAdmin,
} = require('../controllers/itemController');

const router = express.Router();

const runUpload = (req, res, next) => {
  uploadItemImages(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

router.get('/', getItems);
router.get('/admin/all', authMiddleware, adminMiddleware, getItemsAdmin);
router.get('/match/:id', validateObjectIdParam('id'), getItemMatches);
router.post('/', authMiddleware, runUpload, createItem);
router.get('/:id', validateObjectIdParam('id'), getItemById);
router.put('/:id', authMiddleware, validateObjectIdParam('id'), itemOwnerOrAdmin, runUpload, updateItem);
router.patch('/:id/status', authMiddleware, validateObjectIdParam('id'), itemOwnerOrAdmin, updateItemStatus);
router.delete('/:id', authMiddleware, validateObjectIdParam('id'), itemOwnerOrAdmin, deleteItem);

module.exports = router;

