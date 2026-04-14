import { useState } from 'react'
import './ResumeAnalyzer.css'

function ResumeAnalyzer({ sessionId, userApiKey = '' }) {
  const [resumeText, setResumeText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const analyzeResume = async () => {
    if (!resumeText.trim()) {
      setError('Please paste your resume text first')
      return
    }

    setError('')
    setIsAnalyzing(true)
    setResults(null)

    try {
      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, sessionId, apiKey: userApiKey.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Server error')
      }

      setResults(data)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Work'
  }

  return (
    <div className="resume-analyzer">
      <div className="resume-scroll">
        <div className="resume-header">
          <h1>📄 Resume Analyzer</h1>
          <p>Paste your resume text below for AI-powered analysis and optimization tips</p>
        </div>

        <div className="resume-content">
          {/* Input Panel */}
          <div className="resume-input-panel">
            <div className="input-panel-header">
              <h3>📝 Your Resume</h3>
              <span className="char-count">{resumeText.length} characters</span>
            </div>
            <textarea
              className="resume-textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder={`Paste your resume text here...

Example:
John Doe
Software Engineer | 5+ years experience

EXPERIENCE
Senior Developer at TechCorp (2022-Present)
- Led team of 8 engineers on cloud migration project
- Reduced deployment time by 60% using CI/CD pipelines

SKILLS
JavaScript, React, Node.js, Python, AWS, Docker`}
              rows={16}
            />
            <div className="input-actions">
              <button
                className="analyze-btn"
                onClick={analyzeResume}
                disabled={isAnalyzing || !resumeText.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <span className="analyze-spinner" />
                    Analyzing...
                  </>
                ) : (
                  <>🔍 Analyze Resume</>
                )}
              </button>
              {resumeText && (
                <button className="clear-resume-btn" onClick={() => { setResumeText(''); setResults(null); setError('') }}>
                  ✕ Clear
                </button>
              )}
            </div>
            {error && <div className="resume-error">⚠️ {error}</div>}
          </div>

          {/* Results Panel */}
          <div className="resume-results-panel">
            {isAnalyzing ? (
              <div className="analyzing-state">
                <div className="analyzing-icon">
                  <div className="scan-line" />
                  📄
                </div>
                <h3>Analyzing your resume...</h3>
                <p>Our AI is evaluating your resume for content, formatting, and ATS compatibility</p>
                <div className="skeleton-grid">
                  <div className="skeleton-card" />
                  <div className="skeleton-card" />
                  <div className="skeleton-card tall" />
                  <div className="skeleton-card tall" />
                </div>
              </div>
            ) : results ? (
              <div className="results-content">
                {/* Score Gauges */}
                <div className="scores-row">
                  <div className="score-card">
                    <div className="score-gauge" style={{ '--score-color': getScoreColor(results.overallScore) }}>
                      <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          stroke={getScoreColor(results.overallScore)}
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={`${results.overallScore * 3.14} 314`}
                          transform="rotate(-90 60 60)"
                          className="score-progress"
                        />
                      </svg>
                      <div className="score-text">
                        <span className="score-number">{results.overallScore}</span>
                        <span className="score-max">/100</span>
                      </div>
                    </div>
                    <h4>Overall Score</h4>
                    <span className="score-badge" style={{ color: getScoreColor(results.overallScore) }}>
                      {getScoreLabel(results.overallScore)}
                    </span>
                  </div>

                  <div className="score-card">
                    <div className="score-gauge" style={{ '--score-color': getScoreColor(results.atsScore) }}>
                      <svg viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          stroke={getScoreColor(results.atsScore)}
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={`${results.atsScore * 3.14} 314`}
                          transform="rotate(-90 60 60)"
                          className="score-progress"
                        />
                      </svg>
                      <div className="score-text">
                        <span className="score-number">{results.atsScore}</span>
                        <span className="score-max">/100</span>
                      </div>
                    </div>
                    <h4>ATS Compatibility</h4>
                    <span className="score-badge" style={{ color: getScoreColor(results.atsScore) }}>
                      {getScoreLabel(results.atsScore)}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                {results.summary && (
                  <div className="result-section summary-section">
                    <h4>📋 Summary</h4>
                    <p>{results.summary}</p>
                  </div>
                )}

                {/* Strengths */}
                <div className="result-section strengths-section">
                  <h4>✅ Strengths</h4>
                  <ul>
                    {results.strengths?.map((s, i) => (
                      <li key={i} style={{ animationDelay: `${i * 0.1}s` }}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="result-section improvements-section">
                  <h4>🔧 Areas for Improvement</h4>
                  <ul>
                    {results.improvements?.map((s, i) => (
                      <li key={i} style={{ animationDelay: `${i * 0.1}s` }}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Keywords */}
                <div className="result-section keywords-section">
                  <h4>🏷️ Suggested Keywords</h4>
                  <div className="keywords-cloud">
                    {results.keywords?.map((kw, i) => (
                      <span key={i} className="keyword-tag" style={{ animationDelay: `${i * 0.05}s` }}>{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-results">
                <div className="empty-results-icon">📊</div>
                <h3>Resume Analysis Results</h3>
                <p>Paste your resume on the left and click <strong>Analyze Resume</strong> to get AI-powered insights on your resume quality, ATS compatibility, and improvement suggestions.</p>
                <div className="features-list">
                  <div className="feature-pill">📈 Overall Score</div>
                  <div className="feature-pill">🤖 ATS Compatibility</div>
                  <div className="feature-pill">✅ Strengths Analysis</div>
                  <div className="feature-pill">🔧 Improvement Tips</div>
                  <div className="feature-pill">🏷️ Keyword Suggestions</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumeAnalyzer
