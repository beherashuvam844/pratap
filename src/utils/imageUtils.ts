/**
 * Resizes and compresses an image data URL to ensure it stays within Firestore document limits (1MB) and localStorage quotas.
 */
export async function compressImage(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }
  
  // If string is already very small (< 15KB), return as is
  if (dataUrl.length < 15000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      width = Math.max(1, width);
      height = Math.max(1, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (compressedDataUrl && compressedDataUrl.length < dataUrl.length) {
          resolve(compressedDataUrl);
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        console.warn('Image compression canvas export error:', e);
        resolve(dataUrl);
      }
    };

    img.onerror = (err) => {
      console.warn('Image compression load error:', err);
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Creates a cropped image from a source image and crop coordinates, returning a compressed JPEG data URL.
 */
export async function getCroppedImg(
  imageSrc: string, 
  pixelCrop: { x: number; y: number; width: number; height: number },
  maxDim = 800
): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx || !pixelCrop) return '';

  // Calculate scaled target dimensions
  let targetW = pixelCrop.width;
  let targetH = pixelCrop.height;

  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  canvas.width = Math.max(1, targetW);
  canvas.height = Math.max(1, targetH);

  // Draw cropped and scaled portion onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL('image/jpeg', 0.65);
}
