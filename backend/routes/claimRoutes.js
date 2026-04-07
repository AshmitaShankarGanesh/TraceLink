const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { validateObjectIdParam } = require('../middleware/validationMiddleware');
const {
  createClaim,
  getMyClaims,
  getItemClaims,
  updateClaimStatus,
  getAllClaimsAdmin,
  approveClaim,
  rejectClaim,
} = require('../controllers/claimController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createClaim);
router.get('/my', getMyClaims);
router.get('/item/:itemId', validateObjectIdParam('itemId'), getItemClaims);
router.get('/admin', adminMiddleware, getAllClaimsAdmin);
router.put('/:id', validateObjectIdParam('id'), updateClaimStatus);
router.put('/:id/approve', adminMiddleware, validateObjectIdParam('id'), approveClaim);
router.put('/:id/reject', adminMiddleware, validateObjectIdParam('id'), rejectClaim);

module.exports = router;

