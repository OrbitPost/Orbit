'use strict';

const { createWriteStream } = require('node:fs');
const { unlink } = require('node:fs/promises');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { randomUUID } = require('node:crypto');
const { join } = require('node:path');

const mediaTypes = {
  'image/png': ['image', '.png'], 'image/jpeg': ['image', '.jpg'],
  'image/webp': ['image', '.webp'], 'image/gif': ['image', '.gif'], 'image/avif': ['image', '.avif'],
  'video/mp4': ['video', '.mp4'], 'video/webm': ['video', '.webm'], 'video/quicktime': ['video', '.mov']
};
const limit = 100 * 1024 * 1024;

function driveFileId(value) {
  const link = new URL(value);
  const id = link.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1]
    || (link.pathname === '/open' ? link.searchParams.get('id') : null);
  if (link.hostname !== 'drive.google.com' || link.protocol !== 'https:' || link.username || link.password
    || !id || !/^[A-Za-z0-9_-]{10,140}$/.test(id)) {
    throw new Error('Enter a Google Drive file link.');
  }
  return id;
}

async function captureDrive(item, { token, folder, fetcher = fetch }) {
  if (!token) throw new Error('Add a Drive access token in Settings or download the file and import it from your PC.');
  const id = driveFileId(item.value);
  const response = await fetcher('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', {
    headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error('Drive returned HTTP ' + response.status + '. Check the token and file access.');
  const type = mediaTypes[response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()];
  if (!type || !response.body) throw new Error('Drive must return a supported image or video file.');
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Use a Drive file under 100 MB.');
  const snapshotId = randomUUID();
  const fileName = snapshotId + type[1];
  const path = join(folder, fileName);
  let bytes = 0;
  const sizeGuard = new Transform({
    transform(chunk, _encoding, done) {
      bytes += chunk.length;
      if (bytes > limit) done(new Error('Use a Drive file under 100 MB.'));
      else done(null, chunk);
    }
  });
  try {
    await pipeline(Readable.fromWeb(response.body), sizeGuard, createWriteStream(path, { flags: 'wx' }));
    if (!bytes) throw new Error('Drive returned an empty file.');
    return { id: snapshotId, originalId: item.id, kind: type[0], label: item.label, fileName, createdAt: new Date().toISOString() };
  } catch (error) {
    await unlink(path).catch(() => {});
    throw error;
  }
}

module.exports = { driveFileId, captureDrive };
