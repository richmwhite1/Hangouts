import { db } from './db';
import { hashQuery, normalizeQuery, extractTimeWindow } from './agent-utils';
import { logger } from './logger';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedSearch(
  query: string, 
  location?: string
): Promise<any[] | null> {
  try {
    const normalized = normalizeQuery(query, location);
    const queryHash = hashQuery(normalized);
    
    const cached = await db.agentSearchCache.findFirst({
      where: { 
        queryHash,
        expiresAt: { gte: new Date() }
      }
    });
    
    if (cached) {
      // Update access stats
      await db.agentSearchCache.update({
        where: { id: cached.id },
        data: { 
          searchCount: { increment: 1 },
          lastAccessedAt: new Date()
        }
      });
      
      logger.info('Cache hit for query', { query, location, queryHash });
      return cached.results as any[];
    }
    
    logger.info('Cache miss for query', { query, location, queryHash });
    return null;
  } catch (error) {
    logger.error('Error getting cached search', error);
    return null;
  }
}

export async function cacheSearchResults(
  query: string,
  location: string | undefined,
  results: any[]
): Promise<void> {
  try {
    const normalized = normalizeQuery(query, location);
    const queryHash = hashQuery(normalized);
    const timeWindow = extractTimeWindow(query);
    
    await db.agentSearchCache.upsert({
      where: { queryHash },
      create: {
        queryHash,
        originalQuery: query,
        location,
        timeWindow,
        results: results as any,
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS)
      },
      update: {
        results: results as any,
        searchCount: { increment: 1 },
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_DURATION_MS)
      }
    });
    
    logger.info('Cached search results', { query, location, resultCount: results.length });
    
    // Track trending
    await trackTrendingSearch(query, location);
  } catch (error) {
    logger.error('Error caching search results', error);
  }
}

async function trackTrendingSearch(query: string, location?: string): Promise<void> {
  try {
    await db.trendingSearch.upsert({
      where: { 
        query_location: { query, location: location || '' }
      },
      create: { 
        query, 
        location: location || null, 
        searchCount: 1 
      },
      update: { 
        searchCount: { increment: 1 },
        lastSearchedAt: new Date()
      }
    });
    
    logger.debug('Updated trending search', { query, location });
  } catch (error) {
    logger.error('Error tracking trending search', error);
  }
}

export async function getTrendingSearches(
  location?: string,
  limit: number = 5
): Promise<string[]> {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const trending = await db.trendingSearch.findMany({
      where: {
        ...(location && { location }),
        lastSearchedAt: { gte: oneWeekAgo }
      },
      orderBy: { searchCount: 'desc' },
      take: limit
    });
    
    return trending.map(t => t.query);
  } catch (error) {
    logger.error('Error getting trending searches', error);
    return [];
  }
}

export async function cleanupExpiredCache(): Promise<void> {
  try {
    const result = await db.agentSearchCache.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    
    logger.info('Cleaned up expired cache entries', { count: result.count });
  } catch (error) {
    logger.error('Error cleaning up expired cache', error);
  }
}




