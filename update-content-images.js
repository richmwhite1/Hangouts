const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Beautiful images for existing content
const contentImageUpdates = {
  'Salt Lake City Food Festival': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
  'Utah Jazz vs Lakers Game': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
  'Hiking in Big Cottonwood Canyon': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
  'Salt Lake City Art Walk': 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
  'Farmers Market Brunch': 'https://images.unsplash.com/photo-1488459716781-b6717f83f659?w=800&h=600&fit=crop',
  'Coffee & Coding Meetup': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  'Weekend Movie Night': 'https://images.unsplash.com/photo-1489599804342-4b0b0a0b0b0b?w=800&h=600&fit=crop',
  'Game Night at My Place': 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&h=600&fit=crop'
};

async function updateContentImages() {
  try {
    console.log('🖼️ Updating content images...');

    for (const [title, imageUrl] of Object.entries(contentImageUpdates)) {
      try {
        const result = await prisma.content.updateMany({
          where: {
            title: title,
            image: null // Only update if no image exists
          },
          data: {
            image: imageUrl,
            updatedAt: new Date()
          }
        });

        if (result.count > 0) {
          console.log(`✅ Updated image for: ${title}`);
        } else {
          // Check if content exists but already has an image
          const existing = await prisma.content.findFirst({
            where: { title: title },
            select: { title: true, image: true }
          });
          
          if (existing) {
            console.log(`ℹ️  ${title} already has an image: ${existing.image ? 'Yes' : 'No'}`);
          } else {
            console.log(`⚠️  Content not found: ${title}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating ${title}:`, error.message);
      }
    }

    // Also update any content that has placeholder or missing images
    const placeholderUpdates = await prisma.content.updateMany({
      where: {
        OR: [
          { image: null },
          { image: '' },
          { image: { contains: 'placeholder' } }
        ]
      },
      data: {
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Default beautiful image
        updatedAt: new Date()
      }
    });

    if (placeholderUpdates.count > 0) {
      console.log(`✅ Updated ${placeholderUpdates.count} items with placeholder/missing images`);
    }

    // Show final status
    const allContent = await prisma.content.findMany({
      select: {
        title: true,
        type: true,
        image: true
      }
    });

    console.log('\n📊 Final content status:');
    allContent.forEach(item => {
      const hasImage = item.image && !item.image.includes('placeholder');
      console.log(`   - ${item.type}: ${item.title} (Image: ${hasImage ? '✅' : '❌'})`);
    });

  } catch (error) {
    console.error('❌ Error updating content images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateContentImages();










