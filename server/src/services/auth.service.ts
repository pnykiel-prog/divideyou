import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { UserType, BlockedStatus } from '../lib/constants.js';
import { unauthorized } from '../lib/http.js';

const SECRET = process.env.JWT_SECRET || 'divideyou-dev-secret';
const ISSUER = 'divideyou';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export interface AuthPayload {
  user_id: string;
  seq_no: number;
  user_type: number;
  type: 'auth';
}

export function generateAuthToken(user: { id: string; authTokenSeq: number; type: number }) {
  const payload: AuthPayload = {
    user_id: user.id,
    seq_no: user.authTokenSeq,
    user_type: user.type,
    type: 'auth',
  };
  // No exp claim — tokens are invalidated by bumping authTokenSeq (login/logout).
  return jwt.sign(payload, SECRET, { issuer: ISSUER });
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, SECRET, { issuer: ISSUER }) as AuthPayload;
  } catch {
    throw unauthorized('Invalid token');
  }
}

// Compute dynamic roles for a user, mirroring User::getRoles().
export function computeRoles(user: any): string[] {
  if (user.type === UserType.ADMIN) {
    const roles = ['ROLE_ADMIN'];
    if (user.admin?.superAdmin) roles.push('ROLE_SUPER_ADMIN');
    return roles;
  }
  if (!user.emailConfirmed) return ['ROLE_UNCONFIRMED'];
  if (user.onlyPay) return ['ROLE_ONLY_PAY'];
  if (user.blockedStatus === BlockedStatus.BY_ADMIN) return ['ROLE_BLOCKED'];

  const roles = ['ROLE_CLIENT'];
  const c = user.client;
  if (c?.accessFeePaid) roles.push('ROLE_CLIENT_PAID');
  if (c?.demoExpired && !c?.accessFeePaid) roles.push('ROLE_CLIENT_DEMO_EXPIRED');
  if (c?.partnershipTermAccepted) roles.push('ROLE_CLIENT_PARTNER');
  if (c?.detailDataConfirmed) roles.push('ROLE_CLIENT_DETAILS_FILLED');
  if (c?.anyProgramBought) roles.push('ROLE_CLIENT_PURCHASES');
  return roles;
}

export async function bumpAuthSeq(userId: string) {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { authTokenSeq: { increment: 1 } },
  });
  return u.authTokenSeq;
}
