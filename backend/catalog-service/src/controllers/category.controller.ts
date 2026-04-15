import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getAllCategories(req: AuthenticatedRequest, res: Response) {
  try {
    const includeInactive = req.user?.role === 'ADMIN' && req.query.includeInactive === 'true';
    const categories = await categoryService.getAllCategories(includeInactive);
    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json({
      success: true,
      data: category,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function toggleCategoryStatus(req: Request, res: Response) {
  try {
    const category = await categoryService.toggleCategoryStatus(req.params.id);
    res.json({
      success: true,
      data: category,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
