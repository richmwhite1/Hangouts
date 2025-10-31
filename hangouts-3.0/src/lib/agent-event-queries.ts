import { db } from './db';
import { getTimeWindowDates } from './agent-utils';
import { logger } from './logger';

export async function querySystemEvents(
  location: string,
  timeWindow?: string,
  eventType?: string
): Promise<any[]> {
  try {
    const whereClause: any = {
      type: 'EVENT',
      status: 'PUBLISHED',
      privacyLevel: 'PUBLIC'
    };
    
    // Location filter (fuzzy match across multiple fields)
    if (location) {
      whereClause.OR = [
        { location: { contains: location, mode: 'insensitive' } },
        { city: { contains: location, mode: 'insensitive' } },
        { venue: { contains: location, mode: 'insensitive' } }
      ];
    }
    
    // Time window filter
    if (timeWindow) {
      const { start, end } = getTimeWindowDates(timeWindow);
      whereClause.startTime = {
        gte: start,
        lte: end
      };
    }
    
    // Event type filter (if provided)
    if (eventType) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { title: { contains: eventType, mode: 'insensitive' } },
            { description: { contains: eventType, mode: 'insensitive' } }
          ]
        }
      ];
    }
    
    const events = await db.content.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 20
    });
    
    logger.info('Queried system events', { 
      location, 
      timeWindow, 
      eventType, 
      resultCount: events.length 
    });
    
    return events.map(formatEventForAgent);
  } catch (error) {
    logger.error('Error querying system events', error);
    return [];
  }
}

function formatEventForAgent(event: any) {
  const startTime = event.startTime ? new Date(event.startTime) : null;
  
  return {
    id: event.id,
    title: event.title,
    venue: event.venue || event.location || 'TBD',
    date: startTime?.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }) || 'TBD',
    time: startTime?.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }) || 'TBD',
    description: event.description || '',
    price: event.priceMin 
      ? `$${event.priceMin}${event.priceMax && event.priceMax !== event.priceMin ? `-$${event.priceMax}` : ''}` 
      : 'Free',
    url: `/events/${event.id}`,
    image: event.image || null,
    creator: event.users,
    isSystemEvent: true
  };
}




