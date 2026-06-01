import { useEffect, useState, useRef } from 'react';
import jsQR from 'jsqr';
import { BadgeCheck, XCircle, Lock, Send, KeyRound, CameraOff, LogOut, ScanLine, Utensils, RefreshCw, Moon, Sun, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import logoImg from '../assets/logo.png';

export default function VolunteerScanner({ role, onLogout }) {
  const [permState, setPermState]   = useState('asking');
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [useOtp, setUseOtp]         = useState(false);
  const [roll, setRoll]             = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [otp, setOtp]               = useState('');
  const [scanCount, setScanCount]   = useState(0);
  const [showResult, setShowResult] = useState(false);

  const isFood   = role === 'FOOD_VOLUNTEER';
  const scanType = isFood ? 'food' : 'entry';
  const scanLabel = isFood ? 'Food Distribution' : 'Event Entry';
  const accent   = isFood ? 'var(--amber)' : 'var(--brand)';
  const accentGrad = isFood
    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
    : 'linear-gradient(135deg,#6366f1,#4f46e5)';
  const accentGlow = isFood ? 'rgba(245,158,11,0.45)' : 'rgba(99,102,241,0.45)';

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const isScanRef  = useRef(false);
  const loadingRef = useRef(false);
  const timerRef   = useRef(null);

  const { dark, setDark } = useTheme();
  const { toast } = useToast();

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (useOtp) { stopCamera(); return; }
    initCamera();
    return () => stopCamera();
  }, [useOtp]);

  const initCamera = async () => {
    setPermState('asking');
    try {
      const constraints = {
        video: { facingMode: 'environment' },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      setPermState('granted');
    } catch { setPermState('denied'); }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    isScanRef.current = false;
  };

  const onVideoReady = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(scanFrame); };

  const scanFrame = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < v.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(scanFrame); return; }
    // Scale down for mobile performance (cap width at 600px)
    const scale = Math.min(1, 600 / (v.videoWidth || 640));
    c.width = (v.videoWidth || 640) * scale; 
    c.height = (v.videoHeight || 480) * scale;
    
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    
    // Invert attempts can be costly, 'dontInvert' is much faster for dark codes on light bg
    const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (code?.data && !isScanRef.current && !loadingRef.current) { 
      isScanRef.current = true; 
      handleVerifyQR(code.data); 
      return; // Pause scanner loop while processing/displaying
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const readyForNext = () => {
    clearTimeout(timerRef.current);
    setScanResult(null); setErrorMsg(null); setShowResult(false);
    setTimeout(() => { 
      isScanRef.current = false; 
      rafRef.current = requestAnimationFrame(scanFrame); // Resume scanner loop
    }, 1500);
  };

  const handleVerifyQR = async (rawToken) => {
    let token = rawToken;
    try {
      if (rawToken.includes('verify/')) token = rawToken.split('verify/').pop();
      else if (rawToken.includes('token=')) token = new URL(rawToken).searchParams.get('token');
    } catch {}
    setLoading(true); setScanResult(null); setErrorMsg(null);
    try {
      const { data } = await api.post('/attendees/scan', { token, type: scanType });
      if (data.alreadyVerified) {
        setScanResult({ ...data.attendee, alreadyOtp: true });
        toast({ type: 'warning', message: `${data.attendee.name} — already via OTP` });
      } else {
        setScanResult(data.attendee); setScanCount(c => c + 1); playTone(880, 1320, 0.2);
        toast({ type: 'success', message: `${data.attendee.name} ✓ ${scanLabel}` });
      }
      setShowResult(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired QR.';
      setErrorMsg(msg); setShowResult(true); playTone(440, 220, 0.3);
      toast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
      timerRef.current = setTimeout(readyForNext, 5000);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setScanResult(null); setErrorMsg(null);
    try { await api.post('/otp/send', { roll: roll.trim(), type: scanType }); setOtpSent(true); toast({ type: 'info', message: 'OTP sent to registered email' }); }
    catch (err) { const m = err.response?.data?.error || 'Failed.'; setErrorMsg(m); toast({ type: 'error', message: m }); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setLoading(true); setScanResult(null); setErrorMsg(null);
    try {
      const { data } = await api.post('/otp/verify', { roll: roll.trim(), otp: otp.trim(), type: scanType });
      setScanResult({ name: data.name, roll: roll.trim() }); setScanCount(c => c + 1); playTone(880, 1320, 0.2);
      setRoll(''); setOtp(''); setOtpSent(false);
      toast({ type: 'success', message: `${data.name} ✓ ${scanLabel} via OTP` });
    } catch (err) { const m = err.response?.data?.error || 'Invalid OTP.'; setErrorMsg(m); toast({ type: 'error', message: m }); }
    finally { setLoading(false); }
  };

  const playTone = (f1, f2, dur) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.6, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden' }}>

      {/* Top Bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', height: 54, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoImg} alt="Logo" style={{ height: "100%", width: "auto", objectFit: "contain" }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: '0.875rem', lineHeight: 1, margin: 0 }}>{scanLabel} Scanner</p>
            {scanCount > 0 && <p style={{ color: accent, fontSize: '0.675rem', fontWeight: 700, marginTop: 2 }}>{scanCount} {isFood ? 'served' : 'admitted'} today</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={() => { setUseOtp(v => !v); readyForNext(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s', background: useOtp ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.15)', borderColor: useOtp ? 'rgba(99,102,241,0.5)' : 'rgba(16,185,129,0.4)', color: useOtp ? '#818cf8' : '#34d399' }}>
            {useOtp ? <><ScanLine size={11}/> QR</> : <><Lock size={11}/> OTP</>}
          </button>
          <button onClick={() => setDark(!dark)} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          {onLogout && <button onClick={onLogout} style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={14}/></button>}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Camera */}
        {!useOtp && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <video ref={videoRef} onLoadedData={onVideoReady} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted autoPlay/>
            <canvas ref={canvasRef} style={{ display: 'none' }}/>

            {/* Gradient vignette */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.7) 100%)' }}/>

            {permState === 'asking' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#000' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid #1e293b', borderTopColor: accent, animation: 'spin 0.8s linear infinite' }}/>
                <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Requesting camera…</p>
              </div>
            )}

            {permState === 'denied' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#070d1a', padding: '2rem', textAlign: 'center' }}>
                <CameraOff size={48} color="#ef4444"/>
                <p style={{ color: '#f0f6ff', fontSize: '1rem', fontWeight: 800 }}>Camera Access Denied</p>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Allow camera in browser settings, then retry.</p>
                <button onClick={initCamera} className="btn btn-primary"><RefreshCw size={15}/> Retry</button>
                <button onClick={() => setUseOtp(true)} className="btn btn-secondary" style={{ color: '#64748b', borderColor: '#1e293b' }}><Lock size={15}/> Use OTP</button>
              </div>
            )}

            {/* Scan frame */}
            {permState === 'granted' && !showResult && !loading && (
              <div className="scanner-overlay">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <div className="scan-frame">
                    <span/>
                    <div className="scan-line"/>
                    <div className="scan-dot tl"/><div className="scan-dot tr"/>
                    <div className="scan-dot bl"/><div className="scan-dot br"/>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Align QR code in frame</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 500, margin: '0.25rem 0 0' }}>{scanLabel} mode active</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.12)', borderTopColor: accent, animation: 'spin 0.75s linear infinite' }}/>
              </div>
            )}
          </div>
        )}

        {/* OTP Panel */}
        {useOtp && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
            <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 400, padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ width: 58, height: 58, borderRadius: 18, background: isFood ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem', color: accent }}>
                  <KeyRound size={28}/>
                </div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>OTP Verification</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 500 }}>{scanLabel} — manual entry</p>
              </div>

              {errorMsg && <div className="animate-pop-in" style={{ background: 'var(--red-light)', color: 'var(--red)', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500, display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}><AlertTriangle size={15} style={{ flexShrink: 0 }}/>{errorMsg}</div>}
              {scanResult && <div className="animate-pop-in" style={{ background: 'var(--green-light)', color: 'var(--green)', borderRadius: 10, padding: '0.875rem 1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><BadgeCheck size={18} style={{ flexShrink: 0 }}/>{scanResult.name} verified!</div>}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="input-label" htmlFor="otp-roll">Roll Number</label>
                    <input id="otp-roll" className="input" type="text" placeholder="Enter roll number" value={roll} onChange={e => setRoll(e.target.value)} required disabled={loading} autoCapitalize="none" autoCorrect="off" spellCheck="false" />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                    {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin"/></> : <><Send size={15}/> Send OTP</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ✉️ OTP sent for roll: <strong style={{ color: 'var(--text-primary)' }}>{roll}</strong>
                  </div>
                  <div>
                    <label className="input-label" htmlFor="otp-code">OTP Code</label>
                    <input id="otp-code" className="input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" placeholder="______" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required disabled={loading} style={{ fontSize: '1.75rem', letterSpacing: '0.4em', textAlign: 'center', fontWeight: 800 }}/>
                  </div>
                  <button type="submit" className="btn btn-success" disabled={loading} style={{ width: '100%' }}>
                    {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin"/> : <><BadgeCheck size={15}/> Verify &amp; Admit</>}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="btn btn-secondary" style={{ width: '100%' }}>← Change Roll</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Result Bottom Sheet */}
        {showResult && !useOtp && (
          <>
            <div onClick={readyForNext} style={{ position: 'absolute', inset: 0, zIndex: 50, cursor: 'pointer' }}/>
            <div className="bottom-sheet" style={{ zIndex: 60, padding: '0.625rem 1.5rem 2.5rem' }}>
              <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--border)', margin: '0 auto 1.25rem' }}/>

              {scanResult && !scanResult.alreadyOtp ? (
                <div className="animate-slide-up" style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 1rem', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(16,185,129,0.25)' }}>
                    <BadgeCheck size={40} color="var(--green)"/>
                  </div>
                  <span className="badge badge-green" style={{ marginBottom: '0.75rem', fontSize: '0.75rem', padding: '0.3rem 0.875rem' }}>{isFood ? '🍽 Food Distributed' : '✅ Entry Allowed'}</span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.375rem 0 0.25rem', letterSpacing: '-0.01em' }}>{scanResult.name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, margin: '0 0 1.5rem' }}>
                    Roll: {scanResult.roll}
                    {(scanResult.entryScannedAt || scanResult.foodScannedAt) && <> &nbsp;·&nbsp; {new Date(scanResult.entryScannedAt || scanResult.foodScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
                  </p>
                  <button onClick={readyForNext} className="btn btn-success" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', borderRadius: '0.875rem' }}>
                    <ScanLine size={17}/> Scan Next Person
                  </button>
                </div>
              ) : scanResult?.alreadyOtp ? (
                <div className="animate-slide-up" style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 1rem', background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={40} color="var(--amber)"/>
                  </div>
                  <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>Already Verified via OTP</span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.375rem 0 1.5rem' }}>{scanResult.name}</h2>
                  <button onClick={readyForNext} className="btn btn-amber" style={{ width: '100%', padding: '0.9rem', borderRadius: '0.875rem' }}><ScanLine size={17}/> Scan Next</button>
                </div>
              ) : (
                <div className="animate-slide-up" style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 1rem', background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(239,68,68,0.2)' }}>
                    <XCircle size={40} color="var(--red)"/>
                  </div>
                  <span className="badge badge-red" style={{ marginBottom: '0.75rem' }}>{isFood ? 'Food Denied' : 'Entry Denied'}</span>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.375rem 1rem 1.5rem', lineHeight: 1.5 }}>{errorMsg}</h2>
                  <button onClick={readyForNext} className="btn btn-secondary" style={{ width: '100%', padding: '0.9rem', borderRadius: '0.875rem' }}><RefreshCw size={17}/> Try Again</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="watermark">Designed by SAMEER LOHANI &amp; VARUN DOBHAL</div>
    </div>
  );
}
