const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugHangoutQuery() {
  const hangoutId = 'hangout_1763432808196_ur71pj2uw';
  
  try {
    console.log('🔍 Testing basic hangout query...');
    
    // Test 1: Basic query
    const basicHangout = await prisma.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        privacyLevel: true
      }
    });
    
    console.log('✅ Basic query successful:', basicHangout);
    
    // Test 2: Query with creator
    console.log('\n🔍 Testing query with creator...');
    const hangoutWithCreator = await prisma.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        title: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });
    
    console.log('✅ Query with creator successful:', hangoutWithCreator);
    
    // Test 3: Query with participants
    console.log('\n🔍 Testing query with participants...');
    const hangoutWithParticipants = await prisma.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        title: true,
        content_participants: {
          select: {
            id: true,
            userId: true,
            users: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });
    
    console.log('✅ Query with participants successful:', hangoutWithParticipants);
    
    // Test 4: Query with polls (this might be the issue)
    console.log('\n🔍 Testing query with polls...');
    try {
      const hangoutWithPolls = await prisma.content.findUnique({
        where: { id: hangoutId },
        select: {
          id: true,
          title: true,
          polls: {
            select: {
              id: true,
              title: true,
              votes: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      console.log('✅ Query with polls successful:', hangoutWithPolls);
    } catch (error) {
      console.error('❌ Query with polls failed:', error.message);
    }
    
    // Test 5: Query with RSVPs
    console.log('\n🔍 Testing query with RSVPs...');
    try {
      const hangoutWithRsvps = await prisma.content.findUnique({
        where: { id: hangoutId },
        select: {
          id: true,
          title: true,
          rsvps: {
            select: {
              id: true,
              status: true,
              users: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
      
      console.log('✅ Query with RSVPs successful:', hangoutWithRsvps);
    } catch (error) {
      console.error('❌ Query with RSVPs failed:', error.message);
    }
    
    // Test 6: Full complex query (like in the API)
    console.log('\n🔍 Testing full complex query...');
    try {
      const fullHangout = await prisma.content.findUnique({
        where: { id: hangoutId },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              lastSeen: true,
              isActive: true
            }
          },
          content_participants: {
            include: {
              users: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  lastSeen: true,
                  isActive: true
                }
              }
            }
          },
          polls: {
            include: {
              votes: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          rsvps: {
            include: {
              users: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true
                }
              }
            }
          },
          _count: {
            select: {
              content_participants: true,
              comments: true,
              messages: true,
              photos: true,
              rsvps: true
            }
          }
        }
      });
      
      console.log('✅ Full complex query successful!');
      console.log('Hangout title:', fullHangout?.title);
      console.log('Participants count:', fullHangout?.content_participants?.length || 0);
      console.log('Polls count:', fullHangout?.polls?.length || 0);
      console.log('RSVPs count:', fullHangout?.rsvps?.length || 0);
      
    } catch (error) {
      console.error('❌ Full complex query failed:', error.message);
      console.error('Full error:', error);
    }
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHangoutQuery();
