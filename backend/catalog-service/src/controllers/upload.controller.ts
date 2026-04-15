import { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';

export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    const result = await uploadService.uploadImage(
      req.file.buffer,
      'traiteurpro/plats'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
}

export async function uploadMultipleImages(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No image files provided',
      });
      return;
    }

    const buffers = files.map(file => file.buffer);
    const results = await uploadService.uploadMultipleImages(
      buffers,
      'traiteurpro/plats'
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
    });
  }
}

export async function deleteImage(req: Request, res: Response) {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      res.status(400).json({
        success: false,
        error: 'Public ID is required',
      });
      return;
    }

    await uploadService.deleteImage(decodeURIComponent(publicId));

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
    });
  }
}
