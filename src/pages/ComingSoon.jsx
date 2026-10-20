import logo from '../assets/logo.png';

export default function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <div style={{ display: 'grid', placeItems: 'center', gap: 13.5, marginTop: 66.5, textAlign: 'center' }}>
        <img src={logo} alt="" width={147} />
        <p style={{ fontSize: 13.5, fontWeight: 500 }}>This part of Planosaur is still hatching.</p>
        <p style={{ color: 'var(--muted)' }}>{title} is coming soon.</p>
      </div>
    </div>
  );
}
