# Events Table Migration

High-performance PostgreSQL migration for AI-powered event discovery and aggregation.

## Quick Start

### 1. Apply Migration

```bash
cd "/Users/richardwhite/Library/Mobile Documents/com~apple~CloudDocs/Hangout 3.0/hangouts-3.0"
npx prisma migrate dev --name create_events_table
npx prisma generate
```

### 2. Use the Service

```typescript
import { EventService } from '@/lib/services/eventService'

const eventService = new EventService({
  userId: 'user-id',
  userRole: 'USER'
})

// Create event
const result = await eventService.createEvent({
  title: 'Tech Conference 2026',
  latitude: 37.7749,
  longitude: -122.4194,
  startTime: new Date('2026-06-15T09:00:00Z'),
  categoryTags: ['technology', 'business'],
  interestScore: 85
})

// Find nearby events
const nearby = await eventService.findNearbyEvents({
  latitude: 37.7749,
  longitude: -122.4194,
  radiusKm: 10
})

// Upsert (prevent duplicates)
const upsert = await eventService.upsertEvent({
  title: 'Summer Festival',
  sourceUrl: 'https://ticketmaster.com/event',
  externalId: 'tm_12345',
  // ... other fields
})
```

## Features

✅ **UUID Primary Keys** - Native PostgreSQL UUIDs  
✅ **Geospatial Queries** - Find events by location with Haversine formula  
✅ **Deduplication** - Unique constraint on `source_url` + `external_id`  
✅ **High Performance** - 6 optimized indexes including composite location+time  
✅ **Category Filtering** - Array field with GIN index  
✅ **Full CRUD** - Complete service with pagination and filtering  
✅ **Audit Logging** - Built-in tracking via BaseService  

## Files Created

- **Migration**: `prisma/migrations/20260104000000_create_events_table/migration.sql`
- **Schema**: Updated `prisma/schema.prisma` with Event model
- **Service**: `src/lib/services/eventService.ts`
- **Examples**: `src/lib/services/eventService.example.ts`

## Service Methods

| Method | Description |
|--------|-------------|
| `createEvent(data)` | Create new event with duplicate check |
| `getEventById(id)` | Get single event by UUID |
| `updateEvent(id, data)` | Update event fields |
| `deleteEvent(id)` | Delete event |
| `listEvents(filters, pagination)` | List with filters and pagination |
| `findNearbyEvents(options, pagination)` | Geospatial search by location |
| `upsertEvent(data)` | Create or update (prevents duplicates) |
| `getEventsByCategory(tags, pagination)` | Filter by category tags |
| `getUpcomingEvents(pagination)` | Events starting after now |
| `searchEvents(term, pagination)` | Full-text search |

## Database Schema

```sql
CREATE TABLE "events" (
    "id" UUID PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10, 8),
    "longitude" DECIMAL(11, 8),
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,
    "source_url" TEXT,
    "external_id" TEXT,
    "category_tags" TEXT[],
    "interest_score" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
```

## Indexes

- `events_location_time_idx` - Composite (lat, lng, start_time)
- `events_start_time_idx` - Temporal filtering
- `events_interest_score_idx` - Ranking (DESC)
- `events_category_tags_idx` - GIN array index
- `events_source_external_unique` - Deduplication
- `events_updated_at_idx` - Recent changes

## Integration

The events table works alongside the existing `content` table:

- AI agents store discovered events in `events` table
- Users can save events to `content` table as `ContentType.EVENT`
- Link via `content.externalEventId` → `events.id`

This separation optimizes event discovery while maintaining compatibility with existing features.
