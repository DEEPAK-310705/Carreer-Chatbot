import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Simple session-based user (no auth required)
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  preferences: {
    theme: { type: String, default: 'dark', enum: ['dark', 'light'] },
    botMode: { type: String, default: 'general', enum: ['general', 'interview', 'resume', 'salary', 'skills'] },
    voiceEnabled: { type: Boolean, default: true },
    selectedVoice: { type: String, default: 'female-indian' },
  },
  lastActive: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Update lastActive on every access
userSchema.methods.touch = function () {
  this.lastActive = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);
