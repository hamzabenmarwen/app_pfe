import { Response } from 'express';
import * as templateService from '../services/template.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { EventType } from '@prisma/client';

export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const template = await templateService.createTemplate(req.body);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    const eventType = req.query.eventType as EventType | undefined;
    const templates = await templateService.getTemplates(eventType);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getTemplateById(req: AuthenticatedRequest, res: Response) {
  try {
    const template = await templateService.getTemplateById(req.params.id);

    res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function updateTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await templateService.deleteTemplate(req.params.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
