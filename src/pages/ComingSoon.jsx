import logo from '../assets/logo.png';

export default function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <div style={{ display: 'grid', placeItems: 'center', gap: 20, marginTop: 100, textAlign: 'center' }}>
        <img src={logo} alt="" width={220} />
        <p style={{ fontSize: 20, fontWeight: 500 }}>This part of Planosaur is still hatching.</p>
        <p style={{ color: 'var(--muted)' }}>{title} is coming soon.</p>
      </div>
    </div>
  );
}
