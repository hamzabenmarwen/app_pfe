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

// Backward-compatible alias used in existing routes
export { optionalAuthMiddleware as optionalAuth } from '@traiteurpro/shared';

