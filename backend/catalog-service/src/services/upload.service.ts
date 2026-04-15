import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

let isCloudinaryConfigured = false;

function ensureCloudinaryConfigured(): void {
  if (isCloudinaryConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isCloudinaryConfigured = true;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export async function uploadImage(
  buffer: Buffer,
  folder: string = 'traiteurpro'
): Promise<UploadResult> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
}

export async function uploadMultipleImages(
  buffers: Buffer[],
  folder: string = 'traiteurpro'
): Promise<UploadResult[]> {
  const uploadPromises = buffers.map((buffer) => uploadImage(buffer, folder));
  return Promise.all(uploadPromises);
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId);
}

export async function deleteMultipleImages(publicIds: string[]): Promise<void> {
  ensureCloudinaryConfigured();
  if (publicIds.length === 0) return;
  await cloudinary.api.delete_resources(publicIds);
}

// Generate optimized image URL
export function getOptimizedUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}): string {
  ensureCloudinaryConfigured();
  return cloudinary.url(publicId, {
    width: options?.width || 400,
    height: options?.height || 300,
    crop: options?.crop || 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}

// Generate thumbnail URL
export function getThumbnailUrl(publicId: string): string {
  ensureCloudinaryConfigured();
  return cloudinary.url(publicId, {
    width: 150,
    height: 150,
    crop: 'thumb',
    gravity: 'center',
    quality: 'auto',
    fetch_format: 'auto',
  });
}
