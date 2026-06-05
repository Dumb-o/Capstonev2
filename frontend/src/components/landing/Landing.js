import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <div>
          <div className="hero-badge">
            <span></span>
            Powered by Ethereum & IPFS
          </div>
          <h1>
            Decentralized Freelance<br />
            <em>Powered by Web3</em>
          </h1>
          <p>
            Connect, collaborate, and transact directly. No middlemen. No hidden fees.
            Smart contract escrow ensures fair payment for every milestone.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">Get Started</Link>
            <a href="#features" className="btn btn-outline btn-lg">Learn More</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="chain-nodes">
            <div className="node">🔒</div>
            <div className="chain-line"></div>
            <div className="node">⚡</div>
            <div className="chain-line"></div>
            <div className="node">🌐</div>
            <div className="chain-line"></div>
            <div className="node">✓</div>
            <div className="chain-line"></div>
            <div className="node">🔑</div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-header">
          <div className="section-label">Features</div>
          <h2 className="section-title">Why FreeLedger?</h2>
          <p className="section-sub">Built for the decentralized future of work</p>
        </div>
        <div className="features-grid">
          {[
            { icon: '🔒', title: 'Smart Contract Escrow', desc: 'Funds are held in secure Ethereum smart contracts, released automatically when milestones are approved.' },
            { icon: '🔑', title: 'Wallet Authentication', desc: 'No passwords. Your MetaMask wallet is your identity. Sign once, work securely.' },
            { icon: '📦', title: 'Decentralized Storage', desc: 'All deliverables stored on IPFS with content-addressed CIDs. Immutable and verifiable.' },
            { icon: '⚡', title: 'Low Fees', desc: 'Only 2.5% platform fee — no middlemen taking 20% of your hard work.' },
            { icon: '🛡️', title: 'Dispute Resolution', desc: 'Fair arbitration process with admin resolution. Smart contract enforces the outcome.' },
            { icon: '🌐', title: 'Hybrid Architecture', desc: 'Fast centralized API for UX, decentralized blockchain for trust. Best of both worlds.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon"><span style={{ fontSize: 20 }}>{f.icon}</span></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="how-inner">
          <div className="how-steps">
            <div className="section-label">How It Works</div>
            <h2 className="section-title">Three Simple Steps</h2>
            {[
              { num: '01', title: 'Connect Your Wallet', desc: 'Sign in with MetaMask or email. Choose your role — client or freelancer.' },
              { num: '02', title: 'Create or Find Work', desc: 'Clients post jobs with milestones. Freelancers browse and submit proposals.' },
              { num: '03', title: 'Work & Get Paid', desc: 'Smart contracts hold funds in escrow. Payments release automatically on milestone approval.' },
            ].map((s, i) => (
              <div key={i} className="step">
                <div className="step-num">{s.num}</div>
                <div className="step-content">
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="how-visual">
            <h3>Platform Stats</h3>
            <div className="stat-row">
              <div className="stat-box">
                <div className="val">0.1%</div>
                <div className="lbl">Dispute Rate</div>
              </div>
              <div className="stat-box">
                <div className="val">2.5%</div>
                <div className="lbl">Platform Fee</div>
              </div>
              <div className="stat-box">
                <div className="val">1s</div>
                <div className="lbl">Avg. Confirmation</div>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>Smart Contract Adoption</span><span>94%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '94%' }}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>On-Chain Milestones</span><span>100%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '100%' }}></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to Decentralize Your Work?</h2>
          <p>Join the future of freelancing. No platform lock-in. Own your reputation.</p>
          <Link to="/login" className="btn btn-white btn-lg">Connect Wallet</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="nav-logo" style={{ color: '#fff' }}>
              <span className="nav-logo-icon" style={{ background: 'rgba(255,255,255,.2)' }}>◈</span>
              FreeLedger
            </Link>
            <p>A decentralized freelance protocol powered by Ethereum smart contracts and IPFS storage.</p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <Link to="/login">Get Started</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a>Documentation</a>
            <a>Smart Contract</a>
            <a>API Reference</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a>About</a>
            <a>Terms</a>
            <a>Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>FreeLedger &mdash; A Decentralized Freelance Protocol</p>
          <p>Taylors University, Malaysia &middot; 2026</p>
        </div>
      </footer>
    </div>
  );
}
