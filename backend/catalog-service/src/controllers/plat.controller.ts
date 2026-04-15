import { Request, Response } from 'express';
import * as platService from '../services/plat.service';
import * as emailService from '../services/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getAllPlats(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      page = '1',
      limit = '10',
      sortBy,
      sortOrder,
      categoryId,
      isVegetarian,
      isVegan,
      isHalal,
      isGlutenFree,
      maxSpiceLevel,
      minPrice,
      maxPrice,
      search,
    } = req.query;

    const filters: platService.PlatFilters = {
      isAvailable: req.user?.role !== 'ADMIN' ? true : undefined,
    };

    if (categoryId) filters.categoryId = categoryId as string;
    if (isVegetarian === 'true') filters.isVegetarian = true;
    if (isVegan === 'true') filters.isVegan = true;
    if (isHalal === 'true') filters.isHalal = true;
    if (isGlutenFree === 'true') filters.isGlutenFree = true;
    if (maxSpiceLevel) filters.maxSpiceLevel = parseInt(maxSpiceLevel as string);
    if (minPrice) filters.minPrice = parseFloat(minPrice as string);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
    if (search) filters.search = search as string;

    const pagination: platService.PaginationOptions = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await platService.getAllPlats(filters, pagination);
    res.json({
      success: true,
      data: result.plats,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getPlatById(req: Request, res: Response) {
  try {
    const plat = await platService.getPlatById(req.params.id);
    res.json({
      success: true,
      data: plat,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function createPlat(req: Request, res: Response) {
  try {
    // Convert 'image' (string) to 'images' (array) and remove invalid fields
    const { 
      image, 
      minServings, 
      maxServings, 
      servingSize,
      ...restBody 
    } = req.body;
    
    const platData = {
      ...restBody,
      images: image ? [image] : (restBody.images || []),
    };
    
    const plat = await platService.createPlat(platData);
    res.status(201).json({
      success: true,
      data: plat,
      message: 'Plat created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updatePlat(req: Request, res: Response) {
  try {
    // Convert 'image' (string) to 'images' (array) and remove invalid fields
    const { 
      image, 
      minServings, 
      maxServings, 
      servingSize,
      ...restBody 
    } = req.body;
    
    const platData = {
      ...restBody,
    };
    
    // Only update images if image field is provided
    if (image !== undefined) {
      platData.images = image ? [image] : [];
    }
    
    const plat = await platService.updatePlat(req.params.id, platData);
    res.json({
      success: true,
      data: plat,
      message: 'Plat updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deletePlat(req: Request, res: Response) {
  try {
    await platService.deletePlat(req.params.id);
    res.json({
      success: true,
      message: 'Plat deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function togglePlatAvailability(req: Request, res: Response) {
  try {
    const plat = await platService.togglePlatAvailability(req.params.id);
    res.json({
      success: true,
      data: plat,
      message: `Plat ${plat.isAvailable ? 'available' : 'unavailable'}`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getPopularPlats(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const plats = await platService.getPopularPlats(limit);
    res.json({
      success: true,
      data: plats,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllPlatsStock(req: Request, res: Response) {
  try {
    const plats = await platService.getAllPlatsStock();
    res.json({
      success: true,
      data: plats,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateStock(req: Request, res: Response) {
  try {
    const { stock, lowStockThreshold } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, error: 'Stock must be a non-negative number' });
    }
    const plat = await platService.updateStock(req.params.id, stock, lowStockThreshold);
    res.json({
      success: true,
      data: plat,
      message: 'Stock updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getLowStockItems(req: Request, res: Response) {
  try {
    const items = await platService.getLowStockItems();
    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function notifyLowStock(req: Request, res: Response) {
  try {
    const items = await platService.getLowStockItems();
    if (items.length > 0) {
      const result = await emailService.sendLowStockAlert(items);
      res.json({
        success: true,
        message: 'Notification envoyée',
        data: result
      });
    } else {
      res.json({
        success: true,
        message: 'Aucun article en rupture de stock'
      });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

