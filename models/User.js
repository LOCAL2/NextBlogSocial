import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: null
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'dev'],
    default: 'user'
  },
  publicTitles: [{
    text: {
      type: String,
      required: true,
      maxLength: 30
    },
    color: {
      type: String,
      enum: ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'],
      default: 'accent'
    },
    icon: {
      type: String,
      default: '👑'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  customBadges: [{
    text: {
      type: String,
      required: true,
      maxLength: 20
    },
    color: {
      type: String,
      enum: ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'],
      default: 'primary'
    },
    icon: {
      type: String,
      maxLength: 50
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for better performance and uniqueness
UserSchema.index({ discordId: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
