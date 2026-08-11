import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/(admin)/', '/settings'],
    },
    sitemap: `${process.env.APP_URL}/sitemap.xml`,
  };
}
