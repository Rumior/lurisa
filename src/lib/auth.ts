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

function getClientIp(req: any): string {
  try {
    const h = req?.headers;
    if (typeof h?.get === 'function') {
      return h.get('x-forwarded-for') || h.get('x-real-ip') || 'unknown';
    }
    return h?.['x-forwarded-for'] || h?.['x-real-ip'] || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getUserAgent(req: any): string {
  try {
    const h = req?.headers;
    if (typeof h?.get === 'function') {
      return h.get('user-agent') || 'unknown';
    }
    return h?.['user-agent'] || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const authOptions: NextAuthOptions = {
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
        console.log('[AUTH] authorize() called for:', credentials?.email);
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing email or password');
            return null;
          }

          const result = loginSchema.safeParse({
            email: credentials.email,
            password: credentials.password,
            deviceFingerprint: credentials.deviceFingerprint,
            deviceName: credentials.deviceName,
          });

          if (!result.success) {
            console.log('[AUTH] Validation failed:', result.error.flatten());
            return null;
          }

          const user = await prisma.users.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { devices: true },
          });

          if (!user || !user.passwordHash) {
            console.log('[AUTH] User not found or no password hash');
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) {
            console.log('[AUTH] Password mismatch for user:', user.id);
            try {
              await logAudit({
                userId: user.id,
                action: 'auth.login.failed',
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
              });
            } catch (auditErr) {
              console.warn('[AUTH] Audit log failed (non-blocking):', auditErr);
            }
            return null;
          }

          if (credentials.deviceFingerprint) {
            try {
              const existingDevice = user.devices.find(
                (d) => d.fingerprint === credentials.deviceFingerprint
              );

              if (!existingDevice) {
                try {
                  await prisma.devices.create({
                    data: {
                      userId: user.id,
                      fingerprint: credentials.deviceFingerprint,
                      name: credentials.deviceName || 'Unknown Device',
                      trusted: false,
                      lastIpAddress: getClientIp(req),
                      userAgent: getUserAgent(req),
                    },
                  });

                  await logAudit({
                    userId: user.id,
                    action: 'auth.device.new',
                    details: 'New device detected: ' + (credentials.deviceName || 'Unknown'),
                    ipAddress: getClientIp(req),
                    userAgent: getUserAgent(req),
                  });
                } catch (createErr: any) {
                  if (createErr.code === 'P2002') {
                    console.warn('[AUTH] Device fingerprint already exists, skipping creation');
                  } else {
                    console.warn('[AUTH] Device create failed (non-blocking):', createErr);
                  }
                }
              } else {
                await prisma.devices.update({
                  where: { id: existingDevice.id },
                  data: {
                    lastSeenAt: new Date(),
                    lastIpAddress: getClientIp(req),
                  },
                });
              }
            } catch (deviceErr) {
              console.warn('[AUTH] Device tracking failed (non-blocking):', deviceErr);
            }
          }

          try {
            await logAudit({
              userId: user.id,
              action: 'auth.login.success',
              ipAddress: getClientIp(req),
              userAgent: getUserAgent(req),
            });
          } catch (auditErr) {
            console.warn('[AUTH] Success audit log failed (non-blocking):', auditErr);
          }

          console.log('[AUTH] Login successful for user:', user.id);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            memoryPaused: user.memoryPaused,
          };
        } catch (err) {
          console.error('[AUTH] Unexpected error in authorize():', err);
          return null;
        }
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
    async redirect({ url, baseUrl }) {
      // After login, always go to dashboard
      if (url === baseUrl + '/login' || url === baseUrl + '/register' || url === '/login' || url === '/register') {
        return baseUrl + '/';
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async jwt({ token, user }) {
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
    error: '/login',
  },

  events: {
    async signOut({ token }) {
      if (token?.accessToken) {
        try {
          const { revokeSession } = await import('./redis');
          await revokeSession(token.accessToken);
        } catch (err) {
          console.warn('[AUTH] Session revocation failed:', err);
        }
      }
    },
  },
};

export async function getCurrentUser(token: JWT) {
  if (!token?.id) return null;
  const user = await prisma.users.findUnique({
    where: { id: token.id },
    select: { id: true, email: true, name: true, memoryPaused: true },
  });
  return user;
}
