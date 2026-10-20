import logo from '../assets/logo.png';

export default function Splash({ message = 'Loading…' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 10.5, textAlign: 'center' }}>
      <div>
        <img src={logo} alt="" width={80} />
        <p style={{ marginTop: 10.5, color: 'var(--muted)' }}>{message}</p>
      </div>
    </div>
  );
}
