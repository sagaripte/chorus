/**
 * Crawler — fetches property data from Google Maps Street View.
 *
 * STUB: Returns hardcoded property data from properties.js.
 * In production: replace with Google Maps API + Street View image fetching.
 */
import { PROPERTIES } from '../properties.js';

export function createCrawler(tl) {
  return {
    async crawl(address) {
      const property = PROPERTIES.find(p => p.address === address);
      if (!property) return null;
      console.log(`    📍 Crawler: fetched Street View for ${address}`);
      tl.emit('crawl', { address, status: 'ok' });
      return property;
    }
  };
}
