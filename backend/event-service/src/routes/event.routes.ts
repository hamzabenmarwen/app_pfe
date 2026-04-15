import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  eventType: z.enum([
    'WEDDING', 'CORPORATE', 'BIRTHDAY', 'GRADUATION',
    'BABY_SHOWER', 'FUNERAL', 'RELIGIOUS', 'COCKTAIL',
    'CONFERENCE', 'PRIVATE', 'OTHER'
  ]),
  eventDate: z.string().datetime(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: z.object({
    name: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().default('Tunisie'),
  }).optional(),
  guestCount: z.number().int().positive(),
  guestCountMin: z.number().int().positive().optional(),
  guestCountMax: z.number().int().positive().optional(),
  dietaryRequirements: z.object({
    vegetarian: z.number().optional(),
    vegan: z.number().optional(),
    halal: z.number().optional(),
    glutenFree: z.number().optional(),
    other: z.string().optional(),
  }).optional(),
  allergens: z.array(z.string()).optional(),
  serviceType: z.string().optional(),
  description: z.string().optional(),
  specialRequests: z.string().optional(),
  budget: z.number().positive().optional(),
  budgetFlexible: z.boolean().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT', 'PENDING_QUOTE', 'QUOTE_SENT', 'QUOTE_ACCEPTED',
    'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  ]),
});

const addMenuItemSchema = z.object({
  platId: z.string().uuid(),
  platName: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial();

// Require auth for all routes
router.use(authMiddleware);

// Client routes (static paths first)
router.post('/', validateBody(createEventSchema), eventController.createEvent);
router.get('/my-events', eventController.getMyEvents);

// Admin routes (static paths)
router.get('/', adminMiddleware, eventController.getAllEvents);
router.get('/stats/overview', adminMiddleware, eventController.getEventStats);

// Dynamic param routes (MUST be after all static routes)
router.get('/:id', eventController.getEventById);
router.put('/:id', validateBody(updateEventSchema), eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Menu items
router.post('/:id/menu-items', validateBody(addMenuItemSchema), eventController.addMenuItem);
router.delete('/:id/menu-items/:itemId', eventController.removeMenuItem);

// Request quote
router.post('/:id/request-quote', eventController.requestQuote);

// Admin dynamic param routes
router.patch('/:id/status', adminMiddleware, validateBody(updateStatusSchema), eventController.updateEventStatus);

export default router;
