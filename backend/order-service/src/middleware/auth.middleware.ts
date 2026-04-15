/**
 * Auth middleware — delegates to the shared package for consistency
 * across all microservices.
 */
export {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  type AuthenticatedRequest,
  type TokenPayload,
} from '@traiteurpro/shared';

