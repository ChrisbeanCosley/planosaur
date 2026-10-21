// Crops an image file to a centred square and shrinks it to size x size, returning a JPEG Blob.
// Used for profile pictures so a large phone photo becomes a small, quick-to-load file.
export async function squareImage(file, size = 400) {
  let source;
  try {
    // Modern browsers apply the photo's rotation (EXIF orientation) here.
    source = await createImageBitmap(file);
  } catch {
    throw new Error('That photo couldn’t be read. Try a JPG or PNG (iPhone HEIC photos may not work in every browser).');
  }

  const side = Math.min(source.width, source.height);
  const sx = (source.width - side) / 2;
  const sy = (source.height - side) / 2;
  const out = Math.min(size, side); // never enlarge a small image

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background in the JPEG
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, side, side, 0, 0, out, out);
  source.close?.();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t process that photo.'))), 'image/jpeg', 0.88),
  );
}
