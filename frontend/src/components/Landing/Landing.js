import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BlockchainViz from '../BlockchainViz/BlockchainViz';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
        </svg>
      ),
      title: 'Secure Identity',
      desc: 'Build your decentralized profile with blockchain-backed credentials that you own.'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: 'Smart Contract Escrow',
      desc: 'Funds are locked safely and released automatically upon milestone completion.'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      ),
      title: 'Decentralized Storage',
      desc: 'Your work and portfolio live on IPFS — permanent, uncensorable, and always accessible.'
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
      title: 'Fair Marketplace',
      desc: 'Transparent matching algorithms highlight your skills and ensure fair opportunities.'
    }
  ];

  const steps = [
    { num: '1', title: 'Connect Wallet', desc: 'Link MetaMask, Phantom, etc. to securely authenticate without passwords.' },
    { num: '2', title: 'Browse Opportunities', desc: 'Explore a global list of projects or browse top talent using our on-chain verification.' },
    { num: '3', title: 'Secure Agreement', desc: 'Smart contracts handle the escrow and enforce terms automatically.' },
    { num: '4', title: 'Complete & Get Paid', desc: 'Deliver work through IPFS. Payment is released instantly once milestones are approved.' }
  ];

  return (
    <div className="landing">
      <nav className="nav">
        <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <div className="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          FreeLedger
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Freelancers</a>
        </div>
        <div className="nav-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Log In</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </nav>

      <section>
        <motion.div 
          className="hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-text">
            <div className="hero-badge"><span></span> Web3 · Decentralized · No Middlemen</div>
            <h1>Decentralized<br/>Freelancing<br/><em>Without Middlemen</em></h1>
            <p>Hire talent or find projects with secure smart contracts and decentralized identity. No hidden fees, no gatekeepers.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>Connect Wallet</button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>Explore Jobs</button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="chain-nodes">
              <div className="node">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <div className="chain-line"></div>
              <div className="node">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                </svg>
              </div>
              <div className="chain-line"></div>
              <div className="node">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="chain-line"></div>
              <div className="node">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="section" id="features">
        <motion.div 
          className="section-header"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-label">Why FreeLedger</div>
          <h2 className="section-title">Built for the future of work</h2>
          <p className="section-sub">Experience the first truly peer-to-peer professional ecosystem powered by blockchain.</p>
        </motion.div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="how-section" id="how">
        <div className="how-inner">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="section-label">Process</div>
              <h2 className="section-title">How It Works</h2>
              <p className="section-sub" style={{ marginBottom: '40px' }}>Four simple steps to start working in the decentralized economy.</p>
            </motion.div>
            <div className="how-steps">
              {steps.map((step, index) => (
                <motion.div 
                  key={index} 
                  className="step"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="step-num">{step.num}</div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div 
            className="how-visual"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3>Platform Snapshot</h3>
            <div className="stat-row">
              <div className="stat-box"><div className="val">2.4K</div><div className="lbl">Active Projects</div></div>
              <div className="stat-box"><div className="val">98%</div><div className="lbl">Success Rate</div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>Smart Contract Volume</span><span>84%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '84%' }}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>Developer Demand</span><span>91%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '91%' }}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span>On-time Delivery</span><span>76%</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: '76%' }}></div></div>
            </div>
          </motion.div>
        </div>
      </div>

      <BlockchainViz />

      <div className="cta-section">
        <motion.div 
          className="cta-inner"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2>Ready to join the revolution?</h2>
          <p>Start working on projects that define the next generation of the internet.</p>
          <button className="btn btn-white btn-lg" onClick={() => navigate('/login')}>Join FreeLedger Today →</button>
        </motion.div>
      </div>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ color: '#fff' }}>
              <div className="nav-logo-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              FreeLedger
            </a>
            <p>The future of decentralized work. No fees, no middlemen, no compromise. Powered by blockchain smart contracts.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#">Find Talent</a>
            <a href="#">Find Work</a>
            <a href="#">Smart Escrow</a>
            <a href="#">Token</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">Help Center</a>
            <a href="#">Blog</a>
            <a href="#">Changelog</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Governance</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 FreeLedger DAO. All rights reserved.</p>
          <div className="footer-socials">
            <div className="social-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
              </svg>
            </div>
            <div className="social-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
