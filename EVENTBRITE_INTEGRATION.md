# Eventbrite Event Importer

## Overview
This system provides a complete Eventbrite API integration for bulk importing events from Salt Lake City into the Hangouts app. The system includes both a real Eventbrite API service and a mock service for development and testing.

## Features
- ✅ **Bulk Event Import**: Import multiple events from Eventbrite in one operation
- ✅ **Data Transformation**: Convert Eventbrite data to our app's schema
- ✅ **Duplicate Prevention**: Skip events that already exist in the database
- ✅ **Category Mapping**: Automatically map Eventbrite categories to our categories
- ✅ **Location Data**: Include venue details, addresses, and coordinates
- ✅ **Pricing Information**: Import ticket prices and availability
- ✅ **Image Support**: Import event images and logos
- ✅ **Admin Interface**: User-friendly web interface for importing events
- ✅ **Mock Service**: Development-ready mock data for testing

## Files Created

### 1. Eventbrite Service (`src/services/eventbriteService.js`)
- Real Eventbrite API integration
- Fetches events from Salt Lake City area (25-mile radius)
- Handles pagination and rate limiting
- Transforms Eventbrite data to our schema

### 2. Mock Service (`src/services/mockEventbriteService.js`)
- Mock Eventbrite service for development
- 8 sample Salt Lake City events
- Same interface as real service
- Perfect for testing without API calls

### 3. Import API (`src/app/api/admin/import-events/route.ts`)
- POST endpoint for importing events
- Authentication required
- Handles duplicate detection
- Returns detailed import results

### 4. Admin Page (`src/app/admin/import-events/page.tsx`)
- User-friendly import interface
- Real-time import progress
- Detailed results display
- Error handling and reporting

## Usage

### 1. Access the Admin Page
Navigate to `/admin/import-events` in your browser (requires authentication).

### 2. Import Events
Click the "Import Events" button to start the import process.

### 3. View Results
The system will display:
- Total events found
- Number of events imported
- Number of events updated (duplicates)
- Any errors encountered

## Event Data Structure

Each imported event includes:

```javascript
{
  title: "Event Name",
  description: "Event description",
  venue: "Venue Name",
  address: "Full address",
  city: "Salt Lake City",
  state: "UT",
  zipCode: "84101",
  latitude: 40.7608,
  longitude: -111.8910,
  startTime: "2025-01-15T10:00:00",
  endTime: "2025-01-15T18:00:00",
  timezone: "America/Denver",
  priceMin: 15.00,
  priceMax: 25.00,
  currency: "USD",
  ticketUrl: "https://example.com/tickets",
  image: "https://example.com/image.jpg",
  category: "FOOD",
  externalEventId: "eventbrite_123",
  source: "eventbrite",
  privacyLevel: "PUBLIC",
  status: "PUBLISHED"
}
```

## Category Mapping

Eventbrite categories are automatically mapped to our categories:

| Eventbrite Category | Our Category |
|-------------------|--------------|
| Music, Concert, Festival | MUSIC |
| Sports, Sports & Fitness | SPORTS |
| Food, Food & Drink | FOOD |
| Nightlife, Party | NIGHTLIFE |
| Arts, Performing Arts, Visual Arts, Film | ARTS |
| Technology | TECHNOLOGY |
| Business | BUSINESS |
| Education | EDUCATION |
| Health | HEALTH |
| Family | FAMILY |
| Other | OTHER |

## Mock Events Included

The mock service includes 8 sample events:

1. **Salt Lake City Food Festival** - Liberty Park
2. **Utah Jazz vs Lakers** - Vivint Arena
3. **Free Yoga in the Park** - Memory Grove Park
4. **Tech Startup Meetup** - The Gateway
5. **Art Gallery Opening** - Utah Museum of Contemporary Art
6. **Live Music at Red Butte Garden** - Red Butte Garden
7. **Family Fun Day at Hogle Zoo** - Hogle Zoo
8. **Business Networking Breakfast** - Grand America Hotel

## Switching to Real Eventbrite API

To use the real Eventbrite API:

1. **Get Eventbrite API Token**:
   - Visit [Eventbrite API Keys](https://www.eventbrite.com/platform/api-keys/)
   - Generate a new API key
   - Update the token in `src/services/eventbriteService.js`

2. **Update Import API**:
   - Change import in `src/app/api/admin/import-events/route.ts`
   - From: `import { ... } from '@/services/mockEventbriteService'`
   - To: `import { ... } from '@/services/eventbriteService'`

3. **Test API Connection**:
   - The real API will fetch live events from Salt Lake City
   - Events are filtered to 25-mile radius from Salt Lake City
   - Only future events are imported

## API Endpoints

### POST `/api/admin/import-events`
Imports events from Eventbrite.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Import completed",
    "results": {
      "total": 8,
      "imported": 6,
      "skipped": 2,
      "errors": []
    }
  }
}
```

## Error Handling

The system handles various error scenarios:

- **API Connection Errors**: Network issues, invalid tokens
- **Data Validation Errors**: Missing required fields
- **Database Errors**: Duplicate detection, constraint violations
- **Rate Limiting**: Automatic delays between API calls

## Development Notes

- Mock service is perfect for development and testing
- Real API requires valid Eventbrite credentials
- All events are imported as public events
- Duplicate detection based on `externalEventId`
- Rate limiting: 1 second delay between API calls
- Maximum 5 pages of results (configurable)

## Future Enhancements

- [ ] Scheduled automatic imports
- [ ] Event updates (modify existing events)
- [ ] Event deletion (remove cancelled events)
- [ ] Multiple city support
- [ ] Custom category mapping
- [ ] Event image optimization
- [ ] Import history and logs
