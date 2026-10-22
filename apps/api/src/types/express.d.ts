declare global {
  namespace Express {
    interface Request {
      // Narrowed to the shared `User` type by the auth middleware (Task 5).
      user?: unknown
      authTokenHash?: string
    }
  }
}

export {}
