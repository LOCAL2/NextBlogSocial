import mongoose from 'mongoose';

const AdminActionSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['delete_user', 'change_username', 'delete_post', 'edit_post', 'delete_comment', 'edit_comment', 'ban_user', 'unban_user'],
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  details: {
    oldValue: String, // For username changes, original post content, etc.
    newValue: String, // For new username, edited post content, etc.
    reason: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Additional data specific to action type
  }
}, {
  timestamps: true
});

// Index for better performance
AdminActionSchema.index({ admin: 1, createdAt: -1 });
AdminActionSchema.index({ targetUser: 1, createdAt: -1 });
AdminActionSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.AdminAction || mongoose.model('AdminAction', AdminActionSchema);
