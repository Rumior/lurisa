// Global Updates Cache Layer
import { cache } from '@/lib/cache';

const FEED_TTL = 180; // 3 minutes for live feed
const DASHBOARD_TTL = 120; // 2 minutes for dashboard card
const EVENT_TTL = 600; // 10 minutes for individual events

export const globalUpdatesCache = {
  async getFeed(userId: string, tab: string, page: number) {
    return cache.get<any[]>(`gu:feed:${userId}:${tab}:${page}`);
  },

  async setFeed(userId: string, tab: string, page: number, data: any[]) {
    await cache.set(`gu:feed:${userId}:${tab}:${page}`, data, { ttl: FEED_TTL, tags: [`user:${userId}`, 'global-updates'] });
  },

  async getDashboard(userId: string) {
    return cache.get<any[]>(`gu:dashboard:${userId}`);
  },

  async setDashboard(userId: string, data: any[]) {
    await cache.set(`gu:dashboard:${userId}`, data, { ttl: DASHBOARD_TTL, tags: [`user:${userId}`, 'global-updates'] });
  },

  async getEvent(eventId: string) {
    return cache.get<any>(`gu:event:${eventId}`);
  },

  async setEvent(eventId: string, data: any) {
    await cache.set(`gu:event:${eventId}`, data, { ttl: EVENT_TTL, tags: ['global-updates'] });
  },

  async invalidateUser(userId: string) {
    await cache.invalidateTag(`user:${userId}`);
  },
};
