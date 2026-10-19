import logo from '../assets/logo.png';

export default function Splash({ message = 'Loading…' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
      <div>
        <img src={logo} alt="" width={120} />
        <p style={{ marginTop: 16, color: 'var(--muted)' }}>{message}</p>
      </div>
    </div>
  );
}
