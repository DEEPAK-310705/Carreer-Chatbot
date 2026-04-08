import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'bot'],
  },
  content: {
    type: String,
    required: true,
  },
  voice: { type: String, default: 'female-indian' },
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Conversation',
  },
  mode: {
    type: String,
    default: 'general',
    enum: ['general', 'interview', 'resume', 'salary', 'skills'],
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Auto-generate title from first user message
conversationSchema.methods.autoTitle = function () {
  const firstUserMsg = this.messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    this.title = firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '');
  }
  return this;
};

// Index for efficient lookups
conversationSchema.index({ sessionId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
