import mongoose from 'mongoose';

const resumeAnalysisSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  resumeText: {
    type: String,
    required: true,
  },
  analysis: {
    overallScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    strengths: [String],
    improvements: [String],
    keywords: [String],
    summary: { type: String, default: '' },
  },
}, {
  timestamps: true,
});

// Index for efficient lookups
resumeAnalysisSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
