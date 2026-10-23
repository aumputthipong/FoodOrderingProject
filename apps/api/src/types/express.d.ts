import type { User } from '@canteen/shared'

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth.
      user?: User
      authTokenHash?: string
    }
  }
}
