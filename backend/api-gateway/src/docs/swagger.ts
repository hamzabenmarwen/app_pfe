/**
 * OpenAPI/Swagger Documentation Configuration
 * 
 * This module provides Swagger/OpenAPI documentation for the API Gateway
 * and aggregates documentation from all microservices.
 */

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Assiette Gala API',
      version: '1.0.0',
      description: 'TraiteurPro - Catering Management Platform API',
      contact: {
        name: 'Support',
        email: 'support@assiettegala.tn',
      },
      license: {
        name: 'Private',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', format: 'password', example: '********' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
          },
        },
        Plat: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            categoryId: { type: 'string' },
            ingredients: { type: 'array', items: { type: 'string' } },
            allergens: { type: 'array', items: { type: 'string' } },
            imageUrl: { type: 'string' },
            isAvailable: { type: 'boolean' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platId: { type: 'string' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' },
                },
              },
            },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] },
            deliveryAddress: { type: 'string' },
            deliveryDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            eventType: { type: 'string', enum: ['MARIAGE', 'ANNIVERSAIRE', 'COCKTAIL', 'CONFERENCE', 'RECEPTION', 'AUTRE'] },
            eventDate: { type: 'string', format: 'date-time' },
            guestCount: { type: 'integer' },
            venue: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
            notes: { type: 'string' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'assistant'] },
            content: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', example: 'Quels plats recommandez-vous pour un mariage?' },
            sessionId: { type: 'string' },
          },
        },
        ChatResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                response: { type: 'string' },
                sessionId: { type: 'string' },
                intent: { type: 'string' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 10 },
          },
        },
        PaginatedPlats: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Plat' },
            },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and management' },
      { name: 'Users', description: 'User profile operations' },
      { name: 'Catalog', description: 'Plats and categories management' },
      { name: 'Orders', description: 'Order processing and management' },
      { name: 'Events', description: 'Event and quote management' },
      { name: 'AI', description: 'AI chatbot and recommendations' },
      { name: 'Health', description: 'Health check endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup Swagger documentation middleware
 */
export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Assiette Gala API Documentation',
  }));

  // Raw Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

export default swaggerSpec;
