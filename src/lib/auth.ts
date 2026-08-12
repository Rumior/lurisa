import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from './db';
import { redis, storeSession } from './redis';
import { logAudit } from './audit';
import { loginSchema } from './validation';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      memoryPaused?: boolean;
    };
    accessToken: string;
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    memoryPaused?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    memoryPaused?: boolean;
    accessToken: string;
  }
}

export const authOptions: NextAuthOptions = { // v4 compatible
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        deviceFingerprint: { label: 'Device Fingerprint', type: 'text' },
        deviceName: { label: 'Device Name', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
          deviceFingerprint: credentials.deviceFingerprint,
          deviceName: credentials.deviceName,
        });

        if (!result.success) {
          return null;
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { devices: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await logAudit({
            userId: user.id,
            action: 'auth.login.failed',
            ipAddress: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
            userAgent: req?.headers?.['user-agent'] as string,
          });
          return null;
        }

        if (credentials.deviceFingerprint) {
          const existingDevice = user.devices.find(
            (d) => d.fingerprint === credentials.deviceFingerprint
          );

          if (!existingDevice) {
            await prisma.devices.create({
              data: {
                userId: user.id,
                fingerprint: credentials.deviceFingerprint,
                name: credentials.deviceName || 'Unknown Device',
                trusted: false,
                lastIpAddress: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
                userAgent: req?.headers?.['user-agent'] as string,
              },
            });

            await logAudit({
              userId: user.id,
              action: 'auth.device.new',
              details: `New device detected: ${credentials.deviceName || 'Unknown'}`,
              ipAddress: req?.headers?.['x-forwarded-for'] as string,
              userAgent: req?.headers?.['user-agent'] as string,
            });
          } else {
            await prisma.devices.update({
              where: { id: existingDevice.id },
              data: {
                lastSeenAt: new Date(),
                lastIpAddress: req?.headers?.['x-forwarded-for'] as string || req?.headers?.['x-real-ip'] as string,
              },
            });
          }
        }

        await logAudit({
          userId: user.id,
          action: 'auth.login.success',
          ipAddress: req?.headers?.['x-forwarded-for'] as string,
          userAgent: req?.headers?.['user-agent'] as string,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memoryPaused: user.memoryPaused,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.memoryPaused = user.memoryPaused;
        token.accessToken = randomUUID();

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        try {
          await storeSession(token.accessToken, user.id, expiresAt);
        } catch (redisErr) {
          console.warn('[AUTH] Redis session store failed (non-blocking):', redisErr);
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.memoryPaused = token.memoryPaused;
      session.accessToken = token.accessToken;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/login',
    newUser: '/onboarding',
  },

  events: {
    async signOut({ token }) {
      if (token?.accessToken) {
        const { revokeSession } = await import('./redis');
        await revokeSession(token.accessToken);
      }
    },
  },
};

export async function getCurrentUser(token: JWT): Promise<{ id: string; email: string; name?: string | null } | null> {
  if (!token?.id) return null;

  const user = await prisma.users.findUnique({
    where: { id: token.id },
    select: { id: true, email: true, name: true, memoryPaused: true },
  });

  return user;
}
