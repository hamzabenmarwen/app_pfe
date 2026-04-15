import { Request, Response } from 'express';
import * as allergenService from '../services/allergen.service';

export async function getAllAllergens(req: Request, res: Response) {
  try {
    const allergens = await allergenService.getAllAllergens();
    res.json({
      success: true,
      data: allergens,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getAllergenById(req: Request, res: Response) {
  try {
    const allergen = await allergenService.getAllergenById(req.params.id);
    res.json({
      success: true,
      data: allergen,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function createAllergen(req: Request, res: Response) {
  try {
    const { name, icon } = req.body;
    const allergen = await allergenService.createAllergen(name, icon);
    res.status(201).json({
      success: true,
      data: allergen,
      message: 'Allergen created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateAllergen(req: Request, res: Response) {
  try {
    const { name, icon } = req.body;
    const allergen = await allergenService.updateAllergen(req.params.id, name, icon);
    res.json({
      success: true,
      data: allergen,
      message: 'Allergen updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteAllergen(req: Request, res: Response) {
  try {
    await allergenService.deleteAllergen(req.params.id);
    res.json({
      success: true,
      message: 'Allergen deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
