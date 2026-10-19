const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const privateRoot = path.resolve(
  process.env.PRIVATE_UPLOADS_DIR || path.join(__dirname, '../../private-uploads')
);

const allowedTypes = {
  image: {
    jpg: { mime: 'image/jpeg', signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    png: { mime: 'image/png', signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    gif: { mime: 'image/gif', signature: (b) => b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a' },
    webp: { mime: 'image/webp', signature: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  },
  document: {
    jpg: { mime: 'image/jpeg', signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    png: { mime: 'image/png', signature: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    gif: { mime: 'image/gif', signature: (b) => b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a' },
    pdf: { mime: 'application/pdf', signature: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
  },
};

const identifyFile = (buffer, category) => {
  const candidates = allowedTypes[category] || {};
  for (const [extension, type] of Object.entries(candidates)) {
    if (type.signature(buffer)) return { extension, mimeType: type.mime };
  }
  return null;
};

const storePrivateFile = async (buffer, category, originalName) => {
  const fileType = identifyFile(buffer, category);
  if (!fileType) throw new Error(`Unsupported or invalid ${category} file content`);
  const directory = path.join(privateRoot, category);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const privateKey = `${crypto.randomUUID()}.${fileType.extension}`;
  await fs.writeFile(path.join(directory, privateKey), buffer, { flag: 'wx', mode: 0o600 });
  return {
    privateKey,
    directory,
    mimeType: fileType.mimeType,
    originalName: path.basename(String(originalName || 'upload').replace(/\\/g, '/')).slice(0, 255),
    size: buffer.length,
  };
};

const getPrivateFilePath = (category, privateKey) => {
  if (!['image', 'document'].includes(category) || path.basename(privateKey) !== privateKey) return null;
  return path.join(privateRoot, category, privateKey);
};

module.exports = { identifyFile, storePrivateFile, getPrivateFilePath, privateRoot };
