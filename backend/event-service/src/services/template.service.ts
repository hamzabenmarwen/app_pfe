import prisma from '../config/database';
import { EventType, Prisma } from '@prisma/client';

export interface CreateTemplateData {
  name: string;
  eventType: EventType;
  description?: string;
  defaultGuestCount?: number;
  defaultServiceType?: string;
  suggestedBudgetMin?: number;
  suggestedBudgetMax?: number;
  suggestedItems?: Array<{
    platId: string;
    quantity: number;
    category?: string;
  }>;
}

export async function createTemplate(data: CreateTemplateData) {
  const template = await prisma.eventTemplate.create({
    data: {
      name: data.name,
      eventType: data.eventType,
      description: data.description,
      defaultGuestCount: data.defaultGuestCount,
      defaultServiceType: data.defaultServiceType,
      suggestedBudgetMin: data.suggestedBudgetMin
        ? new Prisma.Decimal(data.suggestedBudgetMin)
        : null,
      suggestedBudgetMax: data.suggestedBudgetMax
        ? new Prisma.Decimal(data.suggestedBudgetMax)
        : null,
      suggestedItems: data.suggestedItems as any,
    },
  });

  return transformTemplate(template);
}

export async function getTemplates(eventType?: EventType) {
  const where: Prisma.EventTemplateWhereInput = { isActive: true };
  if (eventType) {
    where.eventType = eventType;
  }

  const templates = await prisma.eventTemplate.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return templates.map(transformTemplate);
}

export async function getTemplateById(templateId: string) {
  const template = await prisma.eventTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  return transformTemplate(template);
}

export async function updateTemplate(templateId: string, data: Partial<CreateTemplateData>) {
  const updateData: Prisma.EventTemplateUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.defaultGuestCount !== undefined) updateData.defaultGuestCount = data.defaultGuestCount;
  if (data.defaultServiceType !== undefined) updateData.defaultServiceType = data.defaultServiceType;
  if (data.suggestedBudgetMin !== undefined) {
    updateData.suggestedBudgetMin = new Prisma.Decimal(data.suggestedBudgetMin);
  }
  if (data.suggestedBudgetMax !== undefined) {
    updateData.suggestedBudgetMax = new Prisma.Decimal(data.suggestedBudgetMax);
  }
  if (data.suggestedItems !== undefined) {
    updateData.suggestedItems = data.suggestedItems as any;
  }

  const template = await prisma.eventTemplate.update({
    where: { id: templateId },
    data: updateData,
  });

  return transformTemplate(template);
}

export async function deleteTemplate(templateId: string) {
  // Soft delete by setting isActive to false
  await prisma.eventTemplate.update({
    where: { id: templateId },
    data: { isActive: false },
  });

  return { message: 'Template deleted successfully' };
}

function transformTemplate(template: any) {
  return {
    ...template,
    suggestedBudgetMin: template.suggestedBudgetMin
      ? Number(template.suggestedBudgetMin)
      : null,
    suggestedBudgetMax: template.suggestedBudgetMax
      ? Number(template.suggestedBudgetMax)
      : null,
  };
}
