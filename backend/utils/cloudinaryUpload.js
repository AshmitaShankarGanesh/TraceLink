const cloudinary = require('../config/cloudinary');

const MAX_IMAGES_PER_ITEM = 5;

/**
 * Upload a single image buffer to Cloudinary (folder: env or tracelink/items).
 */
const uploadImageBuffer = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('Invalid file');
  }
  const base64 = file.buffer.toString('base64');
  const dataUri = `data:${file.mimetype};base64,${base64}`;

  const folder = process.env.CLOUDINARY_FOLDER || 'tracelink/items';

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

/**
 * Upload multiple buffers; returns { url, publicId }[].
 */
const uploadManyBuffers = async (files) => {
  if (!files || files.length === 0) return [];
  const out = [];
  for (const file of files) {
    out.push(await uploadImageBuffer(file));
  }
  return out;
};

/**
 * Remove an image from Cloudinary by public_id.
 */
const deleteImageByPublicId = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Remove multiple Cloudinary assets.
 */
const deleteManyByPublicIds = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return;
  await Promise.all(publicIds.map((id) => deleteImageByPublicId(id)));
};

module.exports = {
  MAX_IMAGES_PER_ITEM,
  uploadImageBuffer,
  uploadManyBuffers,
  deleteImageByPublicId,
  deleteManyByPublicIds,
};

