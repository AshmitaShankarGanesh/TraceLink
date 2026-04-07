const Claim = require('../models/Claim');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

/**
 * POST /api/claims
 * Body: { itemId, message }
 */
const createClaim = async (req, res) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'itemId is required',
      });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid itemId',
      });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    if (String(item.reportedBy) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot claim your own item',
      });
    }

    if (item.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This item is already resolved',
      });
    }

    try {
      const claim = await Claim.create({
        itemId: item._id,
        claimantId: req.user._id,
        message: message ? String(message).trim() : undefined,
      });

      // Notify item owner about new claim
      await Notification.create({
        userId: item.reportedBy,
        type: 'CLAIM_UPDATE',
        message: `You have a new claim for "${item.title}".`,
        relatedItemId: item._id,
      });

      return res.status(201).json({
        success: true,
        message: 'Claim submitted successfully',
        data: { claim },
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted a claim for this item',
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('createClaim error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating claim',
    });
  }
};

/**
 * GET /api/claims/my
 * Returns claims made by current user.
 */
const getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimantId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('itemId', 'title itemType location status');

    return res.status(200).json({
      success: true,
      data: { claims },
    });
  } catch (error) {
    console.error('getMyClaims error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching claims',
    });
  }
};

/**
 * GET /api/claims/item/:itemId
 * Owner/admin only: get all claims for an item.
 */
const getItemClaims = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const isOwner = String(item.reportedBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view claims for this item',
      });
    }

    if (status === 'approved' && !isAdmin && item.itemType !== 'lost') {
      return res.status(403).json({
        success: false,
        message: 'Only owners of lost items can approve claims',
      });
    }

    const claims = await Claim.find({ itemId: item._id })
      .sort({ createdAt: -1 })
      .populate('claimantId', 'name email');

    return res.status(200).json({
      success: true,
      data: { claims },
    });
  } catch (error) {
    console.error('getItemClaims error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching item claims',
    });
  }
};

const applyClaimStatusChange = async ({ claimId, status, actingUser, requireAdminOnly }) => {
  if (!['approved', 'rejected'].includes(status)) {
    const err = new Error('Status must be "approved" or "rejected"');
    err.status = 400;
    throw err;
  }

  const claim = await Claim.findById(claimId);
  if (!claim) {
    const err = new Error('Claim not found');
    err.status = 404;
    throw err;
  }

  const item = await Item.findById(claim.itemId);
  if (!item) {
    const err = new Error('Associated item not found');
    err.status = 404;
    throw err;
  }

  const isOwner = String(item.reportedBy) === String(actingUser._id);
  const isAdmin = actingUser.role === 'admin';

  if (requireAdminOnly ? !isAdmin : !isOwner && !isAdmin) {
    const err = new Error('Not authorized to update claims for this item');
    err.status = 403;
    throw err;
  }

  if (claim.status === 'approved' && status === 'approved') {
    const err = new Error('Claim is already approved');
    err.status = 400;
    throw err;
  }

  claim.status = status;
  await claim.save();

  if (status === 'approved') {
    item.status = 'claimed';
    await item.save();

    await Claim.updateMany(
      {
        itemId: item._id,
        _id: { $ne: claim._id },
        status: 'pending',
      },
      { $set: { status: 'rejected' } }
    );
  }

  const message =
    status === 'approved'
      ? `Your claim for "${item.title}" has been approved.`
      : `Your claim for "${item.title}" has been rejected.`;

  await Notification.create({
    userId: claim.claimantId,
    type: 'CLAIM_UPDATE',
    message,
    relatedItemId: item._id,
  });

  return { claim, item };
};

/**
 * PUT /api/claims/:id
 * Body: { status } where status is "approved" or "rejected".
 * Owner or admin can update (backwards-compatible endpoint).
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const { claim } = await applyClaimStatusChange({
      claimId: req.params.id,
      status,
      actingUser: req.user,
      requireAdminOnly: false,
    });

    return res.status(200).json({
      success: true,
      message: `Claim ${status}`,
      data: { claim },
    });
  } catch (error) {
    console.error('updateClaimStatus error:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error while updating claim',
    });
  }
};

/**
 * GET /api/claims/admin
 * Admin-only: view all claims.
 */
const getAllClaimsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('itemId', 'title itemType status')
        .populate('claimantId', 'name email')
        .lean(),
      Claim.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        claims,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('getAllClaimsAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching claims',
    });
  }
};

/**
 * PUT /api/claims/:id/approve
 * Admin only: approve a claim.
 */
const approveClaim = async (req, res) => {
  try {
    const { claim } = await applyClaimStatusChange({
      claimId: req.params.id,
      status: 'approved',
      actingUser: req.user,
      requireAdminOnly: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Claim approved',
      data: { claim },
    });
  } catch (error) {
    console.error('approveClaim error:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error while approving claim',
    });
  }
};

/**
 * PUT /api/claims/:id/reject
 * Admin only: reject a claim.
 */
const rejectClaim = async (req, res) => {
  try {
    const { claim } = await applyClaimStatusChange({
      claimId: req.params.id,
      status: 'rejected',
      actingUser: req.user,
      requireAdminOnly: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Claim rejected',
      data: { claim },
    });
  } catch (error) {
    console.error('rejectClaim error:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Server error while rejecting claim',
    });
  }
};

module.exports = {
  createClaim,
  getMyClaims,
  getItemClaims,
  updateClaimStatus,
  getAllClaimsAdmin,
  approveClaim,
  rejectClaim,
};

