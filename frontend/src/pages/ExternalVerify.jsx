import { ShieldAlert } from 'lucide-react';

export default function ExternalVerify() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', background: 'var(--bg)'
    }}>
      <div className="card animate-slide-up" style={{ maxWidth: 420, width: '100%', overflow: 'hidden' }}>
        {/* Top accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />

        <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: 'var(--amber-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', color: 'var(--amber)'
          }}>
            <ShieldAlert size={36} />
          </div>

          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
            Official Scanner Required
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            This QR code must be scanned through our{' '}
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Authorized Platform</span>.
            Manual scanning is not permitted.
          </p>

          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '1.5rem'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
              Why am I seeing this?
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0, lineHeight: 1.6 }}>
              To prevent unauthorized access, QR codes can only be processed by event volunteers using the official scanner app. This protects your entry from being misused.
            </p>
          </div>

          <button disabled style={{
            width: '100%', padding: '0.875rem', borderRadius: 12, fontWeight: 700,
            fontSize: '0.9375rem', background: 'var(--surface-2)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', cursor: 'not-allowed', opacity: 0.7
          }}>
            Scanning Not Available Here
          </button>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', fontWeight: 500 }}>
            Contact an event volunteer for assistance.
          </p>
        </div>
      </div>

      {/* Watermark */}
      <div className="watermark">Designed by SAMEER LOHANI &amp; VARUN DOBHAL</div>
    </div>
  );
}
