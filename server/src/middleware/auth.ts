import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyToken, computeRoles } from '../services/auth.service.js';
import { UserType, BlockedStatus, PermissionLevel } from '../lib/constants.js';
import { unauthorized, forbidden } from '../lib/http.js';

export interface AuthUser {
  id: string;
  email: string;
  type: number;
  roles: string[];
  client?: any;
  admin?: any;
  raw: any;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export async function loadUser(req: Request): Promise<AuthUser | null> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice(7));
  const user = await prisma.user.findUnique({
    where: { id: payload.user_id },
    include: { client: true, admin: true },
  });
  if (!user || user.type === UserType.DELETED) throw unauthorized('User not found');
  if (payload.seq_no < user.authTokenSeq) throw unauthorized('Session expired');
  return {
    id: user.id,
    email: user.email,
    type: user.type,
    roles: computeRoles(user),
    client: user.client,
    admin: user.admin,
    raw: user,
  };
}

// Require a valid client (or only-pay) session.
export function requireClient(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const u = await loadUser(req);
      if (!u) throw unauthorized();
      if (u.type !== UserType.CLIENT) throw forbidden('Client account required');
      if (u.raw.blockedStatus === BlockedStatus.BY_ADMIN) throw forbidden('Account blocked');
      if (allowedRoles.length && !allowedRoles.some((r) => u.roles.includes(r))) {
        throw forbidden('Insufficient role');
      }
      req.auth = u;
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Require any authenticated user.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  loadUser(req)
    .then((u) => {
      if (!u) throw unauthorized();
      req.auth = u;
      next();
    })
    .catch(next);
}

// Require an admin session, optionally with a permission key at a level.
export function requireAdmin(permissionKey?: string, level: number = PermissionLevel.PREVIEW) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const u = await loadUser(req);
      if (!u) throw unauthorized();
      if (u.type !== UserType.ADMIN) throw forbidden('Admin account required');
      if (permissionKey && !u.admin?.superAdmin) {
        const perms = JSON.parse(u.admin?.permissions || '{}');
        const has = perms[permissionKey] ?? 0;
        if (has < level) throw forbidden('Insufficient permission: ' + permissionKey);
      }
      req.auth = u;
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Require a super admin.
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  loadUser(req)
    .then((u) => {
      if (!u) throw unauthorized();
      if (u.type !== UserType.ADMIN || !u.admin?.superAdmin) throw forbidden('Super admin required');
      req.auth = u;
      next();
    })
    .catch(next);
}
