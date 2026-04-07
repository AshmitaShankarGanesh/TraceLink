const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['lost', 'found'],
      required: [true, 'itemType must be lost or found'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return arr.length <= 40;
        },
        message: 'Maximum 40 tags allowed',
      },
    },
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      area: {
        type: String,
        trim: true,
        default: '',
      },
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator(arr) {
          return arr.length <= 5;
        },
        message: 'Maximum 5 images per item',
      },
    },
    dateEvent: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['lost', 'found', 'claimed', 'closed'],
      default: 'lost',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

itemSchema.index({ itemType: 1, 'location.city': 1, status: 1 });
itemSchema.index({ title: 'text', description: 'text', 'location.city': 'text' });

module.exports = mongoose.model('Item', itemSchema);

