// src/pages/HowToUse.tsx

const tools = [
  { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',       href: 'https://emoticons.deepvortexai.art' },
  { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork generator',         href: 'https://images.deepvortexai.art' },
  { name: 'Avatar Gen',    icon: '🎭', desc: 'AI portrait styles',           href: 'https://avatar.deepvortexai.art' },
  { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly', href: 'https://bgremover.deepvortexai.art' },
  { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',      href: 'https://upscaler.deepvortexai.art' },
  { name: 'Voice Gen',     icon: '🎙️', desc: 'AI Voice Generator',           href: 'https://voice.deepvortexai.art' },
  { name: 'Image → Video', icon: '🎬', desc: 'Animate images with AI',       href: 'https://video.deepvortexai.art' },
  { name: 'AI Chat',       icon: '💬', desc: 'Conversational AI assistant',  href: 'https://chat.deepvortexai.art' },
  { name: 'Deep Vortex Hub', icon: '🌐', desc: 'All AI tools in one place',  href: 'https://deepvortexai.art' },
]

const steps = [
  {
    number: 1,
    title: 'Describe Your 3D Model',
    desc: 'Write what object or scene you want in 3D. Be as descriptive as you like — materials, style, era, mood. The more detail you provide, the better the result.',
  },
  {
    number: 2,
    title: 'AI Generates Your Model',
    desc: 'Our AI creates a stunning 3D model from your description. Generation typically takes 30–90 seconds. You\'ll see a 360° preview video when it\'s ready.',
  },
  {
    number: 3,
    title: 'Download & Use',
    desc: 'Download your 3D model as a GLB file — ready for games, 3D printing, or design tools like Blender, Unity, or Unreal Engine.',
  },
]

export function HowToUse() {
  return (
    <div style={styles.page}>
      {/* Back link */}
      <a href="/" style={styles.backLink}>← Back to 3D Generator</a>

      {/* Logo */}
      <div style={styles.logoWrap}>
        <img src="/logotinyreal.webp" alt="Deep Vortex" style={styles.logo} />
      </div>

      {/* Title */}
      <h1 style={styles.title}>How to Use the AI 3D Generator</h1>
      <p style={styles.subtitle}>From idea to downloadable 3D model in three simple steps</p>

      {/* Steps */}
      <div style={styles.stepsWrap}>
        {steps.map((step) => (
          <div key={step.number} style={styles.stepCard}>
            <div style={styles.stepNumber}>{step.number}</div>
            <div style={styles.stepBody}>
              <h2 style={styles.stepTitle}>{step.title}</h2>
              <p style={styles.stepDesc}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pro tip */}
      <div style={styles.tipBox}>
        <span style={styles.tipLabel}>💡 Pro Tip</span>
        <p style={styles.tipText}>
          Be specific about materials and style. Example:{' '}
          <em style={styles.tipExample}>
            "A medieval knight helmet, metallic, detailed engravings, dark steel"
          </em>
        </p>
      </div>

      {/* Other tools */}
      <section style={styles.toolsSection}>
        <h2 style={styles.toolsHeading}>Explore Our Other AI Tools</h2>
        <div style={styles.toolsGrid}>
          {tools.map((tool) => (
            <a key={tool.name} href={tool.href} style={styles.toolCard} target="_blank" rel="noopener noreferrer">
              <span style={styles.toolIcon}>{tool.icon}</span>
              <span style={styles.toolName}>{tool.name}</span>
              <span style={styles.toolDesc}>{tool.desc}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <a href="https://deepvortexai.art" style={styles.footerLink}>
          Deep Vortex AI — Building the complete AI creative ecosystem
        </a>
      </footer>
    </div>
  )
}

const GOLD = '#D4AF37'
const GOLD_LIGHT = '#E8C87C'
const GOLD_DIM = 'rgba(212,175,55,0.15)'
const GOLD_BORDER = 'rgba(212,175,55,0.3)'

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    padding: '5rem 1.5rem 3rem',
    maxWidth: '860px',
    margin: '0 auto',
    position: 'relative',
  },
  backLink: {
    position: 'absolute',
    top: '1.25rem',
    left: '1.5rem',
    background: GOLD_DIM,
    border: `1px solid ${GOLD_BORDER}`,
    color: GOLD,
    borderRadius: '8px',
    padding: '0.4rem 1rem',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  logo: {
    height: '90px',
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 12px rgba(255,160,0,0.5))',
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
    fontWeight: 900,
    textAlign: 'center',
    background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #B8960C 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '2px',
    marginBottom: '0.5rem',
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '1rem',
    marginBottom: '2.5rem',
  },
  stepsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginBottom: '2rem',
  },
  stepCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1.25rem',
    background: 'rgba(26,26,26,0.8)',
    border: `1px solid ${GOLD_BORDER}`,
    borderRadius: '14px',
    padding: '1.5rem',
  },
  stepNumber: {
    flexShrink: 0,
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${GOLD} 0%, #B8960C 100%)`,
    color: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900,
    fontSize: '1.2rem',
    boxShadow: `0 0 16px rgba(212,175,55,0.4)`,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '1.1rem',
    fontWeight: 700,
    color: GOLD_LIGHT,
    marginBottom: '0.4rem',
    letterSpacing: '0.5px',
  },
  stepDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: 0,
  },
  tipBox: {
    background: 'rgba(212,175,55,0.07)',
    border: `1px solid rgba(212,175,55,0.4)`,
    borderLeft: `4px solid ${GOLD}`,
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    marginBottom: '2.5rem',
  },
  tipLabel: {
    display: 'block',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    color: GOLD,
    fontSize: '0.9rem',
    letterSpacing: '1px',
    marginBottom: '0.5rem',
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: 0,
  },
  tipExample: {
    color: GOLD_LIGHT,
    fontStyle: 'normal',
    fontWeight: 500,
  },
  toolsSection: {
    marginBottom: '2.5rem',
  },
  toolsHeading: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
    fontWeight: 700,
    color: GOLD,
    textAlign: 'center',
    letterSpacing: '1px',
    marginBottom: '1.25rem',
  },
  toolsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '0.9rem',
  },
  toolCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(26,26,26,0.8)',
    border: `1px solid ${GOLD_BORDER}`,
    borderRadius: '12px',
    padding: '1.1rem 0.75rem',
    textDecoration: 'none',
    transition: 'all 0.25s ease',
    cursor: 'pointer',
  },
  toolIcon: {
    fontSize: '1.8rem',
    lineHeight: 1,
  },
  toolName: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: '0.78rem',
    color: GOLD_LIGHT,
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  toolDesc: {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  footer: {
    textAlign: 'center',
    paddingTop: '1rem',
    borderTop: `1px solid ${GOLD_BORDER}`,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    textDecoration: 'none',
  },
}
