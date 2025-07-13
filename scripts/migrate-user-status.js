const mongoose = require('mongoose');

// MongoDB connection string - replace with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextblog-social';

async function migrateUserStatus() {
  try {
    console.log('Starting migration...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the User collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check current users
    const userCount = await usersCollection.countDocuments();
    console.log(`Found ${userCount} users in database`);

    // Update all existing users to add new fields
    const result = await usersCollection.updateMany(
      {}, // Update all documents
      {
        $set: {
          isOnline: false,
          lastSeen: new Date()
        }
      }
    );

    console.log(`Migration completed successfully!`);
    console.log(`Updated ${result.modifiedCount} users`);
    console.log(`Matched ${result.matchedCount} users`);

    // Verify the migration
    const sampleUser = await usersCollection.findOne({});
    if (sampleUser) {
      console.log('\nSample user after migration:');
      console.log({
        _id: sampleUser._id,
        username: sampleUser.username,
        isOnline: sampleUser.isOnline,
        lastSeen: sampleUser.lastSeen
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUserStatus();
