import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [animateSkills, setAnimateSkills] = useState(false)
  const [animateStats, setAnimateStats] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setAnimateSkills(true), 300)
    const t2 = setTimeout(() => setAnimateStats(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const stats = [
    { label: 'Placement Readiness', value: '85%', icon: '🚀', color: '#10b981' },
    { label: 'DSA Solved', value: '142', icon: '🧠', color: '#3b82f6' },
    { label: 'Applications', value: '18', icon: '📄', color: '#8b5cf6' },
    { label: 'Interviews', value: '3', icon: '🎯', color: '#f59e0b' }
  ]

  const dsaProgress = [
    { topic: 'Arrays & Strings', solved: 45, total: 50, color: '#22c55e' },
    { topic: 'Dynamic Programming', solved: 15, total: 40, color: '#f59e0b' },
    { topic: 'Graphs & Trees', solved: 25, total: 35, color: '#3b82f6' },
    { topic: 'System Design', solved: 8, total: 20, color: '#8b5cf6' }
  ]

  const upcomingDrives = [
    { company: 'Google', role: 'SWE II', date: 'Oct 15', type: 'On-Campus', logo: '🇬' },
    { company: 'Microsoft', role: 'SDE', date: 'Oct 22', type: 'Off-Campus', logo: 'Ⓜ️' },
    { company: 'Amazon', role: 'AWS DevOps', date: 'Nov 05', type: 'Remote', logo: '🅰️' },
    { company: 'Goldman Sachs', role: 'Quant Analyst', date: 'Nov 12', type: 'On-Campus', logo: '🏦' }
  ]

  const recommendedRoles = [
    { title: 'Full Stack Developer', match: 92, salary: '₹12L - ₹24L', tags: ['React', 'Node.js', 'System Design'] },
    { title: 'Data Scientist', match: 78, salary: '₹10L - ₹20L', tags: ['Python', 'Machine Learning', 'SQL'] },
    { title: 'Backend Engineer', match: 88, salary: '₹14L - ₹28L', tags: ['Java', 'Microservices', 'AWS'] }
  ]

  const skills = [
    { name: 'Data Structures', level: 85, color: '#3b82f6' },
    { name: 'Algorithms', level: 75, color: '#3b82f6' },
    { name: 'Frontend Dev', level: 90, color: '#10b981' },
    { name: 'Backend Dev', level: 80, color: '#10b981' },
    { name: 'System Design', level: 45, color: '#f59e0b' },
    { name: 'CS Core (OS/DBMS)', level: 70, color: '#8b5cf6' },
    { name: 'Aptitude', level: 88, color: '#ec4899' },
    { name: 'Communication', level: 92, color: '#22c55e' }
  ]

  const getSkillLabel = (level) => {
    if (level >= 80) return 'Interview Ready'
    if (level >= 60) return 'Intermediate'
    return 'Needs Practice'
  }

  return (
    <div className="dashboard">
      <div className="dashboard-scroll">
        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-content">
            <h1>🎓 Placement Readiness Hub</h1>
            <p>Track your job applications, DSA progress, and skill matching for top tech companies.</p>
          </div>
          <div className="readiness-badge">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray="85, 100"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">85%</text>
            </svg>
            <span>Ready</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="stats-row">
          {stats.map((stat, i) => (
            <div key={i} className={`stat-card ${animateStats ? 'animate' : ''}`} style={{ animationDelay: `${i * 0.1}s`, '--stat-color': stat.color }}>
              <div className="stat-icon-wrapper" style={{ color: stat.color, background: `${stat.color}15` }}>
                {stat.icon}
              </div>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-grid-2">
          {/* DSA Tracker */}
          <section className="dash-section dsa-section">
            <div className="section-head">
              <h2>🧠 DSA & Problem Solving</h2>
              <button className="view-all-btn">LeetCode Sync 🔄</button>
            </div>
            <div className="dsa-list">
              {dsaProgress.map((item, i) => {
                const pct = Math.round((item.solved / item.total) * 100)
                return (
                  <div key={i} className="dsa-item">
                    <div className="dsa-item-head">
                      <span className="dsa-topic">{item.topic}</span>
                      <span className="dsa-fraction">{item.solved} / {item.total}</span>
                    </div>
                    <div className="dsa-bar">
                      <div className={`dsa-fill ${animateSkills ? 'animate' : ''}`} 
                           style={{ '--target-width': `${pct}%`, background: item.color, boxShadow: `0 0 10px ${item.color}88` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Upcoming Drives */}
          <section className="dash-section drives-section">
            <div className="section-head">
              <h2>🏢 Upcoming Placement Drives</h2>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="drives-list">
              {upcomingDrives.map((drive, i) => (
                <div key={i} className="drive-card">
                  <div className="drive-logo">{drive.logo}</div>
                  <div className="drive-details">
                    <h3>{drive.company}</h3>
                    <p>{drive.role}</p>
                  </div>
                  <div className="drive-meta">
                    <span className="drive-date">{drive.date}</span>
                    <span className="drive-type">{drive.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Job Recommendations */}
        <section className="dash-section rec-section">
          <div className="section-head">
            <h2>💼 Recommended Roles based on your profile</h2>
            <p>We analyze your skills and DSA progress to suggest the best matches.</p>
          </div>
          <div className="roles-grid">
            {recommendedRoles.map((role, i) => (
              <div key={i} className="role-card">
                <div className="role-head">
                  <h3>{role.title}</h3>
                  <div className="role-match">{role.match}% Match</div>
                </div>
                <div className="role-salary">💰 {role.salary}</div>
                <div className="role-tags">
                  {role.tags.map((tag, j) => <span key={j} className="role-tag">{tag}</span>)}
                </div>
                <button className="apply-btn">Apply Now</button>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Skills */}
        <section className="dash-section pb-40">
          <div className="section-head">
            <h2>🎯 Technical Skill Matrix</h2>
          </div>
          <div className="skills-container inner">
            <div className="skills-grid">
              {skills.map((skill, i) => (
                <div key={i} className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">{skill.name}</span>
                    <div className="skill-meta">
                      <span className="skill-badge" style={{ color: skill.color, borderColor: `${skill.color}44`, background: `${skill.color}15` }}>
                        {getSkillLabel(skill.level)}
                      </span>
                      <span className="skill-pct">{skill.level}%</span>
                    </div>
                  </div>
                  <div className="skill-bar">
                    <div
                      className={`skill-fill ${animateSkills ? 'animate' : ''}`}
                      style={{
                        '--target-width': `${skill.level}%`,
                        background: `linear-gradient(90deg, ${skill.color}, ${skill.color}88)`,
                        boxShadow: `0 0 12px ${skill.color}44`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
