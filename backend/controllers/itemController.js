const Item = require('../models/Item');
const {
  MAX_IMAGES_PER_ITEM,
  uploadManyBuffers,
  deleteManyByPublicIds,
} = require('../utils/cloudinaryUpload');
const { getMatchScore, getMatchCategory } = require('../utils/matching');
const Notification = require('../models/Notification');

const TOP_MATCHES_ON_CREATE = 5;
const DEFAULT_MATCH_PAGE_LIMIT = 10;
const MAX_MATCH_PAGE_LIMIT = 25;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parses tags from multipart JSON array string or comma-separated list.
 */
const parseTags = (raw) => {
  if (raw === undefined || raw === null || raw === '') return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 40);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean).slice(0, 40);
      }
    } catch {
      /* fall through */
    }
    return raw
      .split(/[,|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  return [];
};

/**
 * Loads opposite-type open items (same city first), scores them, returns top N.
 */
const findTopMatchesForItem = async (sourceItem, { limit = DEFAULT_MATCH_PAGE_LIMIT } = {}) => {
  const opposite = sourceItem.itemType === 'lost' ? 'found' : 'lost';
  const sourceId = sourceItem._id;

  const city = (sourceItem.location && sourceItem.location.city) || '';
  const escaped = escapeRegex(city.trim());
  const cityRegex = escaped ? new RegExp(`^${escaped}$`, 'i') : null;

  const baseFilter = {
    itemType: opposite,
    status: { $in: ['lost', 'found'] },
    _id: { $ne: sourceId },
  };

  let candidates = await Item.find(
    cityRegex ? { ...baseFilter, 'location.city': cityRegex } : baseFilter
  )
    .populate('reportedBy', 'name email')
    .limit(500)
    .lean();

  if (candidates.length === 0 && cityRegex) {
    candidates = await Item.find(baseFilter)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
  }

  const scored = candidates.map((c) => {
    const { score, breakdown } = getMatchScore(sourceItem, c);
    return {
      item: c,
      score,
      breakdown,
      matchCategory: getMatchCategory(score),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((row) => ({
    item: toItemResponse(row.item),
    score: row.score,
    breakdown: row.breakdown,
    matchCategory: row.matchCategory,
  }));
};

const ensureCloudinaryConfig = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const err = new Error(
      'Image upload requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
    );
    err.status = 503;
    throw err;
  }
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
};

const parseRemovePublicIds = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const toItemResponse = (item) => {
  const doc = item.toObject ? item.toObject() : item;
  return {
    id: doc._id,
    itemType: doc.itemType,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    tags: doc.tags || [],
    location: doc.location,
    images: doc.images,
    dateEvent: doc.dateEvent,
    status: doc.status,
    reportedBy: doc.reportedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * POST /api/items (multipart: fields + optional images)
 */
const createItem = async (req, res) => {
  try {
    const {
      itemType,
      title,
      description,
      category,
      city,
      area,
      dateEvent,
      tags: tagsRaw,
    } = req.body;

    if (!itemType || !['lost', 'found'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'itemType must be "lost" or "found"',
      });
    }
    if (!title || !description || !city) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and city',
      });
    }

    const files = req.files || [];
    if (files.length > MAX_IMAGES_PER_ITEM) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_IMAGES_PER_ITEM} images allowed`,
      });
    }

    let images = [];
    if (files.length > 0) {
      ensureCloudinaryConfig();
      images = await uploadManyBuffers(files);
    }

    const tags = parseTags(tagsRaw);

    const item = await Item.create({
      itemType,
      title: title.trim(),
      description: description.trim(),
      category: (category || '').trim(),
      tags,
      location: {
        city: city.trim(),
        area: (area || '').trim(),
      },
      images,
      dateEvent: parseDate(dateEvent) || new Date(),
      status: itemType === 'lost' ? 'lost' : 'found',
      reportedBy: req.user._id,
    });

    await item.populate('reportedBy', 'name email');

    const topMatches = await findTopMatchesForItem(item, {
      limit: TOP_MATCHES_ON_CREATE,
    });

    const HIGH_MATCH_THRESHOLD = 70;
    const relevantMatches = topMatches.filter((m) => m.score >= HIGH_MATCH_THRESHOLD);

    if (relevantMatches.length) {
      const notifications = relevantMatches.map((match) => {
        const title = match.item.title || 'an item';
        const newTitle = item.title || 'your item';
        const ownerId =
          match.item.reportedBy?.id || match.item.reportedBy?._id || match.item.reportedBy;
        return {
          userId: ownerId,
          type: 'MATCH_FOUND',
          message: `We found a strong match for "${title}" with "${newTitle}".`,
          relatedItemId: item._id,
        };
      });
      await Notification.insertMany(notifications);
    }

    return res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: {
        item: toItemResponse(item),
        topMatches,
      },
    });
  } catch (error) {
    console.error('createItem error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error while creating item',
    });
  }
};

/**
 * GET /api/items
 */
const getItems = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.itemType && ['lost', 'found'].includes(req.query.itemType)) {
      filter.itemType = req.query.itemType;
    }
    if (req.query.category) {
      filter.category = new RegExp(req.query.category.trim(), 'i');
    }
    if (req.query.city) {
      filter['location.city'] = new RegExp(req.query.city.trim(), 'i');
    }
    if (req.query.status) {
      const status = String(req.query.status).toLowerCase();
      const allowed = ['lost', 'found', 'claimed', 'closed'];

      if (allowed.includes(status)) {
        filter.status = status;
      } else if (status === 'open') {
        // Backwards compatibility: "open" means active (lost/found)
        filter.status = { $in: ['lost', 'found'] };
      } else if (status === 'matched') {
        // Backwards compatibility: "matched" roughly maps to "claimed"
        filter.status = 'claimed';
      }
    }

    const q = (req.query.q || '').trim();

    const findFilter = q ? { ...filter, $text: { $search: q } } : filter;
    const sort = q
      ? { score: { $meta: 'textScore' } }
      : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Item.find(findFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email')
        .lean(),
      Item.countDocuments(findFilter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((i) => ({
          ...i,
          id: i._id,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('getItems error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching items',
    });
  }
};

/**
 * GET /api/items/match/:id
 * Returns ranked opposite-type matches with scores and categories.
 */
const getItemMatches = async (req, res) => {
  try {
    const limit = Math.min(
      MAX_MATCH_PAGE_LIMIT,
      Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_MATCH_PAGE_LIMIT)
    );

    const item = await Item.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const matches = await findTopMatchesForItem(item, { limit });

    return res.status(200).json({
      success: true,
      data: {
        item: toItemResponse(item),
        matches,
      },
    });
  } catch (error) {
    console.error('getItemMatches error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while computing matches',
    });
  }
};

/**
 * GET /api/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate(
      'reportedBy',
      'name email'
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { item: toItemResponse(item) },
    });
  } catch (error) {
    console.error('getItemById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching item',
    });
  }
};

/**
 * PUT /api/items/:id (multipart; owner or admin)
 */
const updateItem = async (req, res) => {
  try {
    const item = req.item;
    const {
      itemType,
      title,
      description,
      category,
      city,
      area,
      dateEvent,
      status,
      removePublicIds,
      tags: tagsRaw,
    } = req.body;

    const toRemove = parseRemovePublicIds(removePublicIds);
    const existingIds = new Set(item.images.map((img) => img.publicId));
    const idsToDelete = toRemove.filter((id) => existingIds.has(id));

    if (idsToDelete.length > 0) {
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        await deleteManyByPublicIds(idsToDelete);
      }
      item.images = item.images.filter((img) => !idsToDelete.includes(img.publicId));
    }

    const files = req.files || [];
    const remainingSlots = MAX_IMAGES_PER_ITEM - item.images.length;

    if (files.length > remainingSlots) {
      return res.status(400).json({
        success: false,
        message: `You can only have ${MAX_IMAGES_PER_ITEM} images total. Remove some first.`,
      });
    }

    if (files.length > 0) {
      ensureCloudinaryConfig();
      const uploaded = await uploadManyBuffers(files);
      item.images.push(...uploaded);
    }

    if (itemType !== undefined) {
      if (!['lost', 'found'].includes(itemType)) {
        return res.status(400).json({
          success: false,
          message: 'itemType must be "lost" or "found"',
        });
      }
      item.itemType = itemType;
    }
    if (title !== undefined) item.title = title.trim();
    if (description !== undefined) item.description = description.trim();
    if (category !== undefined) item.category = category.trim();
    if (city !== undefined) item.location.city = city.trim();
    if (area !== undefined) item.location.area = area.trim();
    if (dateEvent !== undefined) {
      const d = parseDate(dateEvent);
      if (d) item.dateEvent = d;
    }

    if (status !== undefined) {
      const allowed = ['lost', 'found', 'claimed', 'closed'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status',
        });
      }
      item.status = status;
    }

    if (tagsRaw !== undefined) {
      item.tags = parseTags(tagsRaw);
    }

    await item.save();
    await item.populate('reportedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: { item: toItemResponse(item) },
    });
  } catch (error) {
    console.error('updateItem error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error while updating item',
    });
  }
};

/**
 * PATCH /api/items/:id/status
 * Owner/admin only – update lifecycle status: lost, found, claimed, closed.
 */
const updateItemStatus = async (req, res) => {
  try {
    const item = req.item;
    const { status } = req.body;

    const allowed = ['lost', 'found', 'claimed', 'closed'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of lost, found, claimed, or closed',
      });
    }

    // Enforce basic transition rules: claimed/closed only from active states
    if (['claimed', 'closed'].includes(status) && !['lost', 'found', 'claimed'].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${item.status} to ${status}`,
      });
    }

    item.status = status;
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Item status updated successfully',
      data: { item: toItemResponse(item) },
    });
  } catch (error) {
    console.error('updateItemStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating status',
    });
  }
};

/**
 * DELETE /api/items/:id
 * Soft delete – mark item as closed (owner/admin only).
 */
const deleteItem = async (req, res) => {
  try {
    const item = req.item;

    item.status = 'closed';
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Item closed successfully',
    });
  } catch (error) {
    console.error('deleteItem error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while closing item',
    });
  }
};

/**
 * GET /api/items/admin/all
 * Admin-only: view all items with filters.
 */
const getItemsAdmin = async (req, res) => {
  try {
    // Reuse getItems logic by calling it directly is tricky; replicate minimal filters.
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.itemType && ['lost', 'found'].includes(req.query.itemType)) {
      filter.itemType = req.query.itemType;
    }

    if (req.query.status) {
      const status = String(req.query.status).toLowerCase();
      const allowed = ['lost', 'found', 'claimed', 'closed'];
      if (allowed.includes(status)) {
        filter.status = status;
      }
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reportedBy', 'name email')
        .lean(),
      Item.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((i) => ({
          ...i,
          id: i._id,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('getItemsAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching admin items',
    });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemMatches,
  getItemById,
  updateItem,
  updateItemStatus,
  deleteItem,
  getItemsAdmin,
};

