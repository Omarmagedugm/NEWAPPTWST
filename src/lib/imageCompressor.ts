export interface CompressOptions {
  quality?: number; // 0.1 to 1.0 (default 0.88 - ultra high detail)
  maxDimension?: number | 'original'; // max width or height, or 'original' to keep exact resolution
  format?: 'auto' | 'webp' | 'png' | 'jpeg';
  preserveTransparency?: boolean; // ensure alpha channel is never lost
}

export interface CompressedResult {
  id: string;
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  hasAlpha: boolean;
  outputFormat: 'image/webp' | 'image/png' | 'image/jpeg';
  name: string;
  originalFile: File;
  previewUrl: string;
  originalPreviewUrl: string;
}

/**
 * Checks if the image contains any transparent or semi-transparent pixels (alpha < 250).
 * Uses high-priority corner checks + fast adaptive strided sampling for instant detection.
 */
export function checkHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // 1. Instant corner check (catches >98% of circular/shaped logos & crests immediately)
    const corners = [
      0, // top-left
      (width - 1) * 4, // top-right
      (height - 1) * width * 4, // bottom-left
      ((height - 1) * width + (width - 1)) * 4 // bottom-right
    ];
    for (const c of corners) {
      if (c >= 0 && c + 3 < len && data[c + 3] < 250) {
        return true;
      }
    }

    // 2. Adaptive stride across all pixels (alpha is byte i+3)
    const step = Math.max(16, Math.floor(len / 40000) * 4);
    for (let i = 3; i < len; i += step) {
      if (data[i] < 250) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not read image data for transparency detection', err);
  }
  return false;
}

/**
 * High-fidelity, transparency-preserving image compressor.
 * Guarantees that logos and transparent PNGs remain 100% transparent without black/white artifacts,
 * while maximizing compression and retaining crisp fine details.
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressedResult> {
  const {
    quality = 0.88,
    maxDimension = 'original',
    format = 'auto',
    preserveTransparency = true
  } = options;

  const fileName = (file instanceof File ? file.name : 'image.jpg') || 'image.jpg';
  const fileType = file.type || 'image/jpeg';
  const fileObj = file instanceof File ? file : new File([file], fileName, { type: fileType });

  return new Promise((resolve, reject) => {
    const originalPreviewUrl = URL.createObjectURL(fileObj);
    const img = new Image();

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (maxDimension !== 'original' && typeof maxDimension === 'number' && maxDimension > 0) {
          if (origWidth > maxDimension || origHeight > maxDimension) {
            if (origWidth >= origHeight) {
              targetHeight = Math.round((origHeight * maxDimension) / origWidth);
              targetWidth = maxDimension;
            } else {
              targetWidth = Math.round((origWidth * maxDimension) / origHeight);
              targetHeight = maxDimension;
            }
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(originalPreviewUrl);
          reject(new Error('فشل إنشاء بيئة المعالجة للصور (Canvas Context)'));
          return;
        }

        // Set maximum interpolation and smoothing quality to preserve crisp details
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clear canvas completely to ensure 100% transparent background
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Detect if the image has transparency
        const isPngOrGif = fileType === 'image/png' || fileType === 'image/gif' || fileName.toLowerCase().endsWith('.png') || fileName.toLowerCase().endsWith('.gif');
        const isLikelyLogo = /(logo|crest|badge|icon|shield|emblem|شعار|لوجو|لوقو)/i.test(fileName);
        const detectedAlpha = checkHasTransparency(ctx, targetWidth, targetHeight) || isPngOrGif;
        const hasAlpha = preserveTransparency ? (detectedAlpha || isPngOrGif || isLikelyLogo) : detectedAlpha;

        // Determine output MIME format
        let outputMime: 'image/webp' | 'image/png' | 'image/jpeg';
        let extension = 'webp';

        if (format === 'auto') {
          if (hasAlpha) {
            // WebP supports full 8-bit alpha channel transparency with 70-90% smaller footprint than PNG!
            outputMime = 'image/webp';
            extension = 'webp';
          } else {
            // Photos without transparency
            outputMime = 'image/webp';
            extension = 'webp';
          }
        } else if (format === 'png') {
          outputMime = 'image/png';
          extension = 'png';
        } else if (format === 'jpeg') {
          if (hasAlpha) {
            // If user asked for JPEG but image has transparency, keep WebP so logos aren't ruined with black box
            outputMime = 'image/webp';
            extension = 'webp';
          } else {
            outputMime = 'image/jpeg';
            extension = 'jpg';
          }
        } else {
          outputMime = 'image/webp';
          extension = 'webp';
        }

        // Generate output filename
        const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const outputFilename = `${baseName}_compressed.${extension}`;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              URL.revokeObjectURL(originalPreviewUrl);
              reject(new Error('فشل استخراج ملف الصورة المضغوط'));
              return;
            }

            const compressedFile = new File([blob], outputFilename, { type: outputMime });
            const previewUrl = URL.createObjectURL(blob);
            const savingsPercent = Math.max(0, Math.round(((fileObj.size - blob.size) / fileObj.size) * 100));

            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result as string;

              resolve({
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                file: compressedFile,
                blob,
                dataUrl,
                originalSize: fileObj.size,
                compressedSize: blob.size,
                savingsPercent,
                originalWidth: origWidth,
                originalHeight: origHeight,
                width: targetWidth,
                height: targetHeight,
                hasAlpha,
                outputFormat: outputMime,
                name: outputFilename,
                originalFile: fileObj,
                previewUrl,
                originalPreviewUrl
              });
            };
            reader.readAsDataURL(blob);
          },
          outputMime,
          outputMime === 'image/png' ? undefined : quality
        );
      } catch (err: any) {
        URL.revokeObjectURL(originalPreviewUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(originalPreviewUrl);
      reject(new Error(`فشل تحميل وقراءة ملف الصورة: ${fileName}`));
    };

    img.src = originalPreviewUrl;
  });
}

/**
 * Automatically compresses an image file before upload.
 * - Detects transparent logos and preserves 100% transparency.
 * - Compresses high-res photos to high-efficiency WebP/JPEG.
 * - Skips already-compressed small images (< 75KB).
 * - Returns an optimized File or original if compression isn't beneficial.
 */
export async function autoCompressImageForUpload(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<{
  file: File;
  wasCompressed: boolean;
  hasAlpha: boolean;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
}> {
  const fileName = (file instanceof File ? file.name : 'image.jpg') || 'image.jpg';
  const fileType = file.type || 'image/jpeg';
  const fileSize = file.size || 0;

  // If file is SVG, don't compress (SVGs are vector code and already transparent)
  if (fileType === 'image/svg+xml' || fileName.toLowerCase().endsWith('.svg')) {
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: 'image/svg+xml' });
    return {
      file: fileObj,
      wasCompressed: false,
      hasAlpha: true,
      originalSize: fileSize,
      compressedSize: fileSize,
      savingsPercent: 0
    };
  }

  // If already very small (< 75KB) and not a huge uncompressed PNG, keep as is
  if (fileSize > 0 && fileSize < 75 * 1024 && !fileName.toLowerCase().endsWith('.png')) {
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: fileType });
    return {
      file: fileObj,
      wasCompressed: false,
      hasAlpha: fileType === 'image/png' || fileType === 'image/webp',
      originalSize: fileSize,
      compressedSize: fileSize,
      savingsPercent: 0
    };
  }

  try {
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: fileType });
    const isLogo = /(logo|crest|badge|icon|shield|emblem|شعار|لوجو|لوقو)/i.test(fileName);
    
    // For logos, maintain maximum detail and 100% transparency
    const result = await compressImage(fileObj, {
      quality: isLogo ? 0.95 : 0.88,
      maxDimension: isLogo ? 'original' : (options.maxDimension || 1920),
      format: options.format || 'auto',
      preserveTransparency: true,
      ...options
    });

    // If compression yielded actual savings or converted a bloated PNG to transparent WebP:
    if (result.compressedSize < fileSize || (result.hasAlpha && result.outputFormat === 'image/webp')) {
      return {
        file: result.file,
        wasCompressed: true,
        hasAlpha: result.hasAlpha,
        originalSize: fileSize,
        compressedSize: result.compressedSize,
        savingsPercent: result.savingsPercent
      };
    }

    return {
      file: fileObj,
      wasCompressed: false,
      hasAlpha: result.hasAlpha,
      originalSize: fileSize,
      compressedSize: fileSize,
      savingsPercent: 0
    };
  } catch (err) {
    console.warn('Auto compression encountered issue, falling back to original file:', err);
    const fileObj = file instanceof File ? file : new File([file], fileName, { type: fileType });
    return {
      file: fileObj,
      wasCompressed: false,
      hasAlpha: false,
      originalSize: fileSize,
      compressedSize: fileSize,
      savingsPercent: 0
    };
  }
}

/**
 * Format bytes to readable Arabic string (e.g., 2.4 ميجابايت, 450 كيلوبايت)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
