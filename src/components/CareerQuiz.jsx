import { useState } from 'react'
import './CareerQuiz.css'

function CareerQuiz({ onDiscussWithAI }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)

  const questions = [
    {
      question: 'When faced with a complex software problem, what is your first instinct?',
      icon: '🧠',
      options: [
        { text: 'Optimize the Time & Space Complexity (O(n), O(1))', icon: '⏱️', tags: ['backend', 'data'] },
        { text: 'Sketch out how the user will interact with it', icon: '🎨', tags: ['frontend', 'product'] },
        { text: 'Look for patterns in historical data to solve it', icon: '📊', tags: ['data'] },
        { text: 'Check if the underlying servers and network can handle it', icon: '☁️', tags: ['devops', 'cyber'] }
      ]
    },
    {
      question: 'Which Data Structures & Algorithms topic do you find most interesting?',
      icon: '🧮',
      options: [
        { text: 'Dynamic Programming & Graph Traversal', icon: '🕸️', tags: ['backend', 'data'] },
        { text: 'Arrays, Strings & DOM Manipulation', icon: '🔠', tags: ['frontend'] },
        { text: 'Probability, Statistics & Matrix Math', icon: '📈', tags: ['data'] },
        { text: 'Cryptography, Hashing & Network Trees', icon: '🔐', tags: ['cyber', 'backend'] }
      ]
    },
    {
      question: 'What aspect of a technical project excites you the most?',
      icon: '🔥',
      options: [
        { text: 'Designing robust APIs and database schemas', icon: '🗄️', tags: ['backend'] },
        { text: 'Crafting pixel-perfect, interactive user interfaces', icon: '✨', tags: ['frontend'] },
        { text: 'Automating deployments and scaling infrastructure', icon: '🚀', tags: ['devops'] },
        { text: 'Defining the product roadmap and business strategy', icon: '📋', tags: ['product'] }
      ]
    },
    {
      question: 'Choose a weekend personal project:',
      icon: '💻',
      options: [
        { text: 'Building a real-time chat server with WebSockets', icon: '🔌', tags: ['backend', 'devops'] },
        { text: 'Cloning the UI of a famous app using React/Tailwind', icon: '📱', tags: ['frontend'] },
        { text: 'Scraping Twitter data to run sentiment analysis', icon: '🐦', tags: ['data'] },
        { text: 'Setting up a secure home server/Raspberry Pi lab', icon: '🖥️', tags: ['cyber', 'devops'] }
      ]
    },
    {
      question: 'How do you prefer to handle data in applications?',
      icon: '📂',
      options: [
        { text: 'Writing complex SQL joins and transactions', icon: '🛢️', tags: ['backend'] },
        { text: 'Fetching and managing state using Redux/Context', icon: '🔄', tags: ['frontend'] },
        { text: 'Cleaning huge datasets using Pandas or PySpark', icon: '🧹', tags: ['data'] },
        { text: 'Encrypting data in transit and at rest', icon: '🛡️', tags: ['cyber'] }
      ]
    },
    {
      question: 'What kind of technical articles or blogs do you naturally gravitate towards?',
      icon: '📖',
      options: [
        { text: 'System Design and High-level Architecture', icon: '🏗️', tags: ['backend', 'product'] },
        { text: 'CSS Tricks, Animations, and Web Accessibility', icon: '♿', tags: ['frontend'] },
        { text: 'New Machine Learning models (LLMs, Transformers)', icon: '🤖', tags: ['data'] },
        { text: 'Zero-day vulnerabilities and Ethical Hacking', icon: '🕵️', tags: ['cyber'] }
      ]
    },
    {
      question: 'Your app is running slow. How do you optimize it?',
      icon: '⚡',
      options: [
        { text: 'Add Redis caching and optimize database indexes', icon: '💾', tags: ['backend'] },
        { text: 'Implement code-splitting and lazy-load images', icon: '🖼️', tags: ['frontend'] },
        { text: 'Add load balancers and auto-scaling groups', icon: '⚖️', tags: ['devops'] },
        { text: 'Optimize the ML inference code for GPUs', icon: '🎮', tags: ['data'] }
      ]
    },
    {
      question: 'Which tools are you most comfortable opening on a Monday morning?',
      icon: '🛠️',
      options: [
        { text: 'Postman, Docker, and a heavy IDE (IntelliJ/VS Code)', icon: '⚙️', tags: ['backend', 'devops'] },
        { text: 'Figma, VS Code, and Chrome DevTools', icon: '🎨', tags: ['frontend', 'product'] },
        { text: 'Jupyter Notebooks, Google Colab, and Python', icon: '📓', tags: ['data'] },
        { text: 'Linux Terminal, Wireshark, and AWS Console', icon: '🐧', tags: ['cyber', 'devops'] }
      ]
    },
    {
      question: 'If you could master one skill instantly Matrix-style, what would it be?',
      icon: '💊',
      options: [
        { text: 'Advanced Graph Algorithms & Distributed Systems', icon: '🕸️', tags: ['backend'] },
        { text: 'Advanced 3D WebGL Animations & Framer Motion', icon: '🌀', tags: ['frontend'] },
        { text: 'Deep Learning Mathematics & Calculus', icon: '∑', tags: ['data'] },
        { text: 'Penetration Testing & Reverse Engineering', icon: '🔓', tags: ['cyber'] }
      ]
    },
    {
      question: 'Where do you see yourself making the biggest impact in 3 years?',
      icon: '🎯',
      options: [
        { text: 'Architecting scalable systems that handle millions of users', icon: '🌍', tags: ['backend', 'devops'] },
        { text: 'Building gorgeous apps that users fall in love with', icon: '❤️', tags: ['frontend'] },
        { text: 'Leading agile teams and defining product vision', icon: '👑', tags: ['product'] },
        { text: 'Protecting user data and predicting AI trends', icon: '🛡️', tags: ['cyber', 'data'] }
      ]
    }
  ]

  const careerProfiles = {
    backend: { name: 'Backend / SDE Role', icon: '⚙️', color: '#3b82f6', desc: 'Focus on APIs, Databases, System Design, and heavy DSA application.' },
    frontend: { name: 'Frontend / UI Engineer', icon: '✨', color: '#10b981', desc: 'Focus on React, CSS, User Experience, and creating interactive interfaces.' },
    data: { name: 'Data Scientist / AI Engineer', icon: '🤖', color: '#f59e0b', desc: 'Focus on Python, Machine Learning, Analytics, and Data processing.' },
    devops: { name: 'DevOps / Cloud Engineer', icon: '☁️', color: '#8b5cf6', desc: 'Focus on AWS/Azure, Docker, Kubernetes, and scaling infrastructure.' },
    cyber: { name: 'Cybersecurity Analyst', icon: '🛡️', color: '#ef4444', desc: 'Focus on ethical hacking, network security, and cryptography.' },
    product: { name: 'Product Manager (PM)', icon: '📋', color: '#ec4899', desc: 'Focus on strategy, agile management, business, and bridging tech with users.' }
  }

  const handleSelect = (optionIdx) => {
    setSelectedOption(optionIdx)
    setTimeout(() => {
      const newAnswers = [...answers, questions[currentQ].options[optionIdx].tags]
      setAnswers(newAnswers)
      setSelectedOption(null)

      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1)
      } else {
        setShowResults(true)
      }
    }, 450)
  }

  const getResults = () => {
    const tagCount = {}
    answers.flat().forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })

    const total = answers.flat().length
    const sorted = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({
        ...careerProfiles[tag],
        percentage: Math.round((count / total) * 100),
        tag
      }))

    return sorted
  }

  const resetQuiz = () => {
    setCurrentQ(0)
    setAnswers([])
    setShowResults(false)
    setSelectedOption(null)
  }

  const handleDiscuss = () => {
    const results = getResults()
    const msg = `Based on the Technical Placement Quiz, my top domain matches are:\n${results.map((r, i) => `${i + 1}. ${r.name} (${r.percentage}% match) - ${r.desc}`).join('\n')}\n\nGiven this profile, can you outline a 3-month preparation plan focusing on specific DSA topics, tech stack, and portfolio projects to crack interviews for these roles?`
    if (onDiscussWithAI) onDiscussWithAI(msg)
  }

  if (showResults) {
    const results = getResults()
    return (
      <div className="career-quiz">
        <div className="quiz-scroll">
          <div className="quiz-results">
            <div className="results-header">
              <div className="results-icon">🎯</div>
              <h2>Your Placement Domain Match</h2>
              <p>Based on your technical preferences and problem-solving style</p>
            </div>

            <div className="results-cards">
              {results.map((result, i) => (
                <div key={i} className="result-card" style={{ '--result-color': result.color, animationDelay: `${i * 0.15}s` }}>
                  <div className="result-rank">#{i + 1}</div>
                  <div className="result-gauge">
                    <svg viewBox="0 0 120 120" className="gauge-svg">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={result.color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${result.percentage * 3.14} 314`}
                        transform="rotate(-90 60 60)"
                        className="gauge-progress"
                      />
                    </svg>
                    <div className="gauge-text">
                      <span className="gauge-pct">{result.percentage}%</span>
                      <span className="gauge-label">Match</span>
                    </div>
                  </div>
                  <div className="result-icon">{result.icon}</div>
                  <h3>{result.name}</h3>
                  <p>{result.desc}</p>
                </div>
              ))}
            </div>

            <div className="results-actions">
              <button className="discuss-btn" onClick={handleDiscuss}>
                💬 Get Interview Prep Plan from AI
              </button>
              <button className="retake-btn" onClick={resetQuiz}>
                🔄 Retake Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progress = ((currentQ) / questions.length) * 100
  const q = questions[currentQ]

  return (
    <div className="career-quiz">
      <div className="quiz-scroll">
        <div className="quiz-header">
          <h1>🔬 Tech Domain & Placement Quiz</h1>
          <p>Answer 10 engineering-focused questions to find your ideal tech role</p>
        </div>

        <div className="quiz-progress-section">
          <div className="quiz-progress-info">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="quiz-question-card" key={currentQ}>
          <div className="question-icon">{q.icon}</div>
          <h2 className="question-text">{q.question}</h2>

          <div className="options-grid">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`option-card ${selectedOption === i ? 'selected' : ''}`}
                onClick={() => handleSelect(i)}
                disabled={selectedOption !== null}
              >
                <span className="option-icon">{opt.icon}</span>
                <span className="option-text">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CareerQuiz
