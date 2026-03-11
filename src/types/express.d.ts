import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface RequestAuth {
      sessionId: string;
      userId: string;
    }

    interface Request {
      auth?: RequestAuth;
      user?: User;
    }
  }
}
