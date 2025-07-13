import mongoose from 'mongoose';

const FriendshipSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate friendships
FriendshipSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Index for efficient queries
FriendshipSchema.index({ sender: 1, status: 1 });
FriendshipSchema.index({ receiver: 1, status: 1 });

export default mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);
