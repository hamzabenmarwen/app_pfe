/**
 * Auth middleware — delegates to the shared package for consistency
 * across all microservices.
 */
import type { TokenPayload } from '@traiteurpro/shared';

export {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  type AuthenticatedRequest,
  type TokenPayload,
} from '@traiteurpro/shared';

// Backward-compatible alias used in existing event-service routes
export type JwtPayload = TokenPayload;

