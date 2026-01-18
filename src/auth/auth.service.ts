import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { genRefreshTokenRaw, hashToken, compareToken } from './utils';
import type { Session, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, plainPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    // bcrypt compare
    const matches = await import('bcryptjs').then(b => b.compare(plainPassword, user.password));
    if (!matches) return null;
    // return user without password
    // @ts-ignore
    const { password, ...safeUser } = user;
    return safeUser;
  }

  private signAccessToken(user: { id: number; email: string; roleId?: number; establishmentId?: number | null }) {
    // ensure estId is undefined when null so payload types remain consistent
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      estId: user.establishmentId ?? undefined,
    };
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
    // cast options to any to satisfy JwtService typing differences
    return this.jwtService.sign(payload as any, { expiresIn: (expiresIn as unknown) as any });
  }

  // login: crée une session, applique limite par établissement et révoque la plus ancienne si nécessaire
  async loginWithCredentials(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await import('bcryptjs').then(b => b.compare(password, user.password));
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const establishmentId = user.establishmentId ?? null;
    const limit = Number(process.env.MAX_SESSIONS_PER_ESTABLISHMENT) || 3;
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // fetch active sessions for the establishment
      const activeSessions = await tx.session.findMany({
        where: {
          establishmentId,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (activeSessions.length >= limit) {
        const oldest = activeSessions[0];
        await tx.session.update({
          where: { id: oldest.id },
          data: { revokedAt: new Date() },
        });
      }

      const rawRefresh = genRefreshTokenRaw();
      const hashed = await hashToken(rawRefresh);
      const expiresAt = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000));

      const session = await tx.session.create({
        data: {
          userId: user.id,
          establishmentId,
          refreshToken: hashed,
          ip,
          userAgent,
          expiresAt,
        },
      });

      const access_token = this.signAccessToken(user as any);

      return { access_token, refresh_token: rawRefresh, sessionId: session.id };
    });

    return result;
  }

  // refresh: trouve la session correspondant au refresh token, vérifie, rotate et renvoie un nouvel access token
  async refresh(refreshToken: string) {
    const now = new Date();
    const candidates = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    // strong typing so TS knows sessionFound has id and user
    let sessionFound: (Session & { user: User }) | null = null;
    for (const s of candidates) {
      // compare hashed token
      // eslint-disable-next-line no-await-in-loop
      if (await compareToken(refreshToken, s.refreshToken)) {
        sessionFound = s;
        break;
      }
    }

    if (!sessionFound) throw new UnauthorizedException('Invalid refresh token');

    // rotate refresh token
    const newRaw = genRefreshTokenRaw();
    const newHashed = await hashToken(newRaw);
    const newExpiresAt = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000));

    const updated = await this.prisma.session.update({
      where: { id: sessionFound.id },
      data: { refreshToken: newHashed, expiresAt: newExpiresAt },
      include: { user: true },
    });

    const user = updated.user as User;
    const access_token = this.signAccessToken(user as any);

    return { access_token, refresh_token: newRaw, sessionId: updated.id };
  }

  // logout: revoke session by refresh token or sessionId
  async logout({ refreshToken, sessionId }: { refreshToken?: string; sessionId?: number }) {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }

    if (refreshToken) {
      const now = new Date();
      const candidates = await this.prisma.session.findMany({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
        },
      });

      let sessionFound: Session | null = null;
      for (const s of candidates) {
        // eslint-disable-next-line no-await-in-loop
        if (await compareToken(refreshToken, s.refreshToken)) {
          sessionFound = s as Session;
          break;
        }
      }

      if (!sessionFound) return { ok: false };

      await this.prisma.session.update({
        where: { id: sessionFound.id },
        data: { revokedAt: new Date() },
      });

      return { ok: true };
    }

    return { ok: false };
  }
}