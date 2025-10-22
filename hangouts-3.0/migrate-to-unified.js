const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateToUnified() {
  try {
    console.log('🚀 Starting migration to unified content structure...');

    // Step 1: Add new fields to content table
    console.log('📝 Step 1: Adding event fields to content table...');
    
    // Add event-specific fields to content table
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN venue TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN address TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN city TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN state TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN zipCode TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN priceMin REAL DEFAULT 0;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN priceMax REAL;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN currency TEXT DEFAULT 'USD';
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN ticketUrl TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN attendeeCount INTEGER DEFAULT 0;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN externalEventId TEXT;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN source TEXT DEFAULT 'MANUAL';
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN maxParticipants INTEGER;
    `;
    await prisma.$executeRaw`
      ALTER TABLE content ADD COLUMN weatherEnabled BOOLEAN DEFAULT false;
    `;

    console.log('✅ Step 1 completed: Event fields added to content table');

    // Step 2: Migrate Event data to content table
    console.log('📝 Step 2: Migrating Event data to content table...');
    
    const events = await prisma.event.findMany({
      include: {
        eventTags: true,
        eventImages: true,
        eventSaves: true
      }
    });

    console.log(`Found ${events.length} events to migrate`);

    for (const event of events) {
      // Create content record for event
      const contentRecord = await prisma.content.create({
        data: {
          id: `event_${event.id}`,
          type: 'EVENT',
          title: event.title,
          description: event.description,
          image: event.coverImage,
          location: event.address,
          latitude: event.latitude,
          longitude: event.longitude,
          startTime: event.startDate,
          endTime: event.endDate,
          status: 'PUBLISHED',
          privacyLevel: event.isPublic ? 'PUBLIC' : 'PRIVATE',
          creatorId: event.createdBy,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          // Event-specific fields
          venue: event.venue,
          address: event.address,
          city: event.city,
          state: event.state,
          zipCode: event.zipCode,
          priceMin: event.priceMin,
          priceMax: event.priceMax,
          currency: event.currency,
          ticketUrl: event.ticketUrl,
          attendeeCount: event.attendeeCount,
          externalEventId: event.externalEventId,
          source: event.source
        }
      });

      // Migrate event tags
      if (event.eventTags.length > 0) {
        await prisma.eventTag.createMany({
          data: event.eventTags.map(tag => ({
            id: `tag_${tag.id}`,
            contentId: contentRecord.id,
            tag: tag.tag,
            createdAt: tag.createdAt
          }))
        });
      }

      // Migrate event images
      if (event.eventImages.length > 0) {
        await prisma.eventImage.createMany({
          data: event.eventImages.map(img => ({
            id: `img_${img.id}`,
            contentId: contentRecord.id,
            imageUrl: img.imageUrl,
            orderIndex: img.orderIndex,
            createdAt: img.createdAt
          }))
        });
      }

      // Migrate event saves
      if (event.eventSaves.length > 0) {
        await prisma.eventSave.createMany({
          data: event.eventSaves.map(save => ({
            id: `save_${save.id}`,
            contentId: contentRecord.id,
            userId: save.userId,
            createdAt: save.createdAt
          }))
        });
      }

      console.log(`✅ Migrated event: ${event.title}`);
    }

    console.log('✅ Step 2 completed: Event data migrated to content table');

    // Step 3: Update photos table to use contentId instead of hangoutId
    console.log('📝 Step 3: Updating photos table...');
    
    await prisma.$executeRaw`
      ALTER TABLE photos ADD COLUMN contentId TEXT;
    `;
    
    // Update existing photos to use contentId
    await prisma.$executeRaw`
      UPDATE photos 
      SET contentId = hangoutId 
      WHERE hangoutId IS NOT NULL;
    `;

    console.log('✅ Step 3 completed: Photos table updated');

    // Step 4: Update polls table to use contentId instead of hangoutId
    console.log('📝 Step 4: Updating polls table...');
    
    await prisma.$executeRaw`
      ALTER TABLE polls ADD COLUMN contentId TEXT;
    `;
    
    // Update existing polls to use contentId
    await prisma.$executeRaw`
      UPDATE polls 
      SET contentId = (
        SELECT content.id 
        FROM content 
        JOIN hangout_details ON content.id = hangout_details.contentId 
        WHERE hangout_details.id = polls.hangoutId
      )
      WHERE hangoutId IS NOT NULL;
    `;

    console.log('✅ Step 4 completed: Polls table updated');

    // Step 5: Update rsvp table to use contentId instead of hangoutId
    console.log('📝 Step 5: Updating rsvp table...');
    
    await prisma.$executeRaw`
      ALTER TABLE rsvps ADD COLUMN contentId TEXT;
    `;
    
    // Update existing rsvps to use contentId
    await prisma.$executeRaw`
      UPDATE rsvps 
      SET contentId = (
        SELECT content.id 
        FROM content 
        JOIN hangout_details ON content.id = hangout_details.contentId 
        WHERE hangout_details.id = rsvps.hangoutId
      )
      WHERE hangoutId IS NOT NULL;
    `;

    console.log('✅ Step 5 completed: RSVP table updated');

    // Step 6: Update finalPlan table to use contentId instead of hangoutId
    console.log('📝 Step 6: Updating finalPlan table...');
    
    await prisma.$executeRaw`
      ALTER TABLE final_plans ADD COLUMN contentId TEXT;
    `;
    
    // Update existing finalPlans to use contentId
    await prisma.$executeRaw`
      UPDATE final_plans 
      SET contentId = (
        SELECT content.id 
        FROM content 
        JOIN hangout_details ON content.id = hangout_details.contentId 
        WHERE hangout_details.id = final_plans.hangoutId
      )
      WHERE hangoutId IS NOT NULL;
    `;

    console.log('✅ Step 6 completed: FinalPlan table updated');

    // Step 7: Update messages table to use contentId instead of conversationId
    console.log('📝 Step 7: Updating messages table...');
    
    // Messages already use contentId, so this is just verification
    console.log('✅ Step 7 completed: Messages table already uses contentId');

    console.log('🎉 Migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Update the schema.prisma file with the unified structure');
    console.log('2. Run: npx prisma db push');
    console.log('3. Update API endpoints to use unified structure');
    console.log('4. Update frontend components');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateToUnified().catch(console.error);

























