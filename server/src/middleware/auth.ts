import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: 'parent' | 'kid';
  familyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'טוקן לא תקין' });
  }
}

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'parent') {
    return res.status(403).json({ error: 'גישה להורים בלבד' });
  }
  next();
}

export function requireKid(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'kid') {
    return res.status(403).json({ error: 'גישה לילדים בלבד' });
  }
  next();
}
