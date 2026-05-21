import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1>
            Decentralized Freelance<br />
            <span className="gradient-text">Powered by Web3</span>
          </h1>
          <p className="hero-subtitle">
            Connect, collaborate, and transact directly. No middlemen. No hidden fees.
            Smart contract escrow ensures fair payment for every milestone.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">Get Started</Link>
            <a href="#features" className="btn btn-outline btn-lg">Learn More</a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="features">
        <h2>Why FreeLedger?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Smart Contract Escrow</h3>
            <p>Funds are held in secure Ethereum smart contracts, released automatically when milestones are approved.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔑</div>
            <h3>Wallet Authentication</h3>
            <p>No passwords. Your MetaMask wallet is your identity. Sign once, work securely.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Decentralized Storage</h3>
            <p>All deliverables stored on IPFS with content-addressed CIDs. Immutable and verifiable.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Low Fees</h3>
            <p>Only 2.5% platform fee — no middlemen taking 20% of your hard work.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Dispute Resolution</h3>
            <p>Fair arbitration process with admin resolution. Smart contract enforces the outcome.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Hybrid Architecture</h3>
            <p>Fast centralized API for UX, decentralized blockchain for trust. Best of both worlds.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Decentralize Your Work?</h2>
        <p>Join the future of freelancing. No platform lock-in. Own your reputation.</p>
        <Link to="/login" className="btn btn-primary btn-lg">Connect Wallet</Link>
      </section>

      <footer className="footer">
        <p>FreeLedger &mdash; A Decentralized Freelance Protocol with Web3 Integration</p>
        <p className="footer-small">Taylors University, Malaysia &middot; 2026</p>
      </footer>
    </div>
  );
}
