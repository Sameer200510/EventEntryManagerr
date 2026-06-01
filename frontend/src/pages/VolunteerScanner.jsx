import { useEffect, useState, useRef } from 'react';
import jsQR from 'jsqr';
import { BadgeCheck, XCircle, Lock, LogOut, ScanLine, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { GlobalFooter } from '../components/ui/GlobalFooter';

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
  
  const [activeEvent, setActiveEvent] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [showCpSelect, setShowCpSelect] = useState(false);

  // Haptic flash state
  const [flash, setFlash] = useState(null); // 'success' | 'error' | null

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const isScanRef  = useRef(false);
  const loadingRef = useRef(false);
  const timerRef   = useRef(null);

  const { toast } = useToast();

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    fetchActiveEvent();
  }, []);

  const fetchActiveEvent = async () => {
    try {
      const { data } = await api.get('/events/active');
      setActiveEvent(data);
      if (data.checkpoints && data.checkpoints.length > 0) {
        setCheckpoints(data.checkpoints);
        const activeCp = data.checkpoints.find(c => c.isActive);
        if (activeCp) setSelectedCheckpoint(activeCp);
      }
    } catch (err) {
      console.error("Failed to fetch active event", err);
      toast({ type: 'error', message: 'No active event found. Checkpoints disabled.' });
    }
  };

  useEffect(() => {
    if (useOtp) { stopCamera(); return; }
    initCamera();
    return () => stopCamera();
  }, [useOtp]);

  const initCamera = async () => {
    setPermState('asking');
    try {
      const constraints = { video: { facingMode: 'environment' }, audio: false };
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
    const scale = Math.min(1, 600 / (v.videoWidth || 640));
    c.width = (v.videoWidth || 640) * scale; 
    c.height = (v.videoHeight || 480) * scale;
    
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    
    const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (code?.data && !isScanRef.current && !loadingRef.current) { 
      isScanRef.current = true; 
      handleVerifyQR(code.data); 
      return; 
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const triggerHaptic = (type) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === 'success') navigator.vibrate([100]); // Short pop
      else navigator.vibrate([200, 100, 200]); // Buzz buzz
    }
    setFlash(type);
    setTimeout(() => setFlash(null), 800);
  };

  const readyForNext = () => {
    clearTimeout(timerRef.current);
    setScanResult(null); setErrorMsg(null); setShowResult(false); setFlash(null);
    setTimeout(() => { 
      isScanRef.current = false; 
      if (!useOtp) rafRef.current = requestAnimationFrame(scanFrame);
    }, 500); // reduced timeout for speed
  };

  const handleVerifyQR = async (rawToken) => {
    if (!selectedCheckpoint) {
      toast({ type: 'warning', message: 'Please select a checkpoint first!' });
      readyForNext();
      return;
    }

    let token = rawToken;
    try {
      if (rawToken.includes('verify/')) token = rawToken.split('verify/').pop();
      else if (rawToken.includes('token=')) token = new URL(rawToken).searchParams.get('token');
    } catch {}
    
    setLoading(true); setScanResult(null); setErrorMsg(null);
    try {
      const { data } = await api.post('/attendees/scan', { 
        token, 
        checkpointId: selectedCheckpoint.id,
        type: role === 'FOOD_VOLUNTEER' ? 'food' : 'entry'
      });
      
      setScanResult(data.attendee); setScanCount(c => c + 1); 
      triggerHaptic('success');
      playTone(880, 1320, 0.2);
      setShowResult(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or out of sequence.';
      setErrorMsg(msg); 
      triggerHaptic('error');
      playTone(440, 220, 0.3);
      setShowResult(true);
    } finally {
      setLoading(false);
      timerRef.current = setTimeout(readyForNext, 3000);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setScanResult(null); setErrorMsg(null);
    try { 
      await api.post('/otp/send', { roll: roll.trim(), type: role === 'FOOD_VOLUNTEER' ? 'food' : 'entry' }); 
      setOtpSent(true); 
      toast({ type: 'info', message: 'OTP sent to registered email' }); 
    }
    catch (err) { const m = err.response?.data?.error || 'Failed.'; setErrorMsg(m); toast({ type: 'error', message: m }); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!selectedCheckpoint) {
      toast({ type: 'warning', message: 'Please select a checkpoint first!' });
      return;
    }
    setLoading(true); setScanResult(null); setErrorMsg(null);
    try {
      const { data } = await api.post('/otp/verify', { roll: roll.trim(), otp: otp.trim(), type: role === 'FOOD_VOLUNTEER' ? 'food' : 'entry' });
      await api.post('/attendees/scan', { 
        token: data.token, 
        checkpointId: selectedCheckpoint.id,
        type: role === 'FOOD_VOLUNTEER' ? 'food' : 'entry'
      });
      
      setScanResult({ name: data.name, roll: roll.trim() }); setScanCount(c => c + 1); 
      triggerHaptic('success');
      playTone(880, 1320, 0.2);
      setRoll(''); setOtp(''); setOtpSent(false);
      setShowResult(true);
    } catch (err) { 
      const m = err.response?.data?.error || 'Validation failed.'; 
      setErrorMsg(m); 
      triggerHaptic('error');
      toast({ type: 'error', message: m }); 
    }
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
    <div className="h-[100dvh] flex flex-col bg-slate-950 overflow-hidden relative font-sans">

      {/* Screen Flashes for Haptic/Visual Feedback */}
      {flash === 'success' && <div className="absolute inset-0 bg-emerald-500/30 z-40 animate-fade-out pointer-events-none" />}
      {flash === 'error' && <div className="absolute inset-0 bg-red-500/40 z-40 animate-fade-out pointer-events-none" />}

      {/* Top Bar */}
      <div className="shrink-0 flex items-center justify-between px-4 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 z-30">
        
        <div className="relative">
          <button 
            onClick={() => setShowCpSelect(!showCpSelect)}
            className="flex items-center gap-2 bg-transparent border-none text-white cursor-pointer p-0 focus:outline-none group"
          >
            <div className="text-left">
              <p className="text-indigo-400 text-[0.65rem] font-extrabold uppercase tracking-widest m-0">Scanning For</p>
              <h2 className="text-sm sm:text-base font-bold m-0 flex items-center gap-1.5 group-hover:text-indigo-200 transition-colors">
                {selectedCheckpoint ? selectedCheckpoint.name : 'Select Checkpoint'} <ChevronDown size={14} className="opacity-70"/>
              </h2>
            </div>
          </button>

          {showCpSelect && (
            <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl p-2 min-w-[220px] shadow-2xl z-50 animate-pop-in">
              {checkpoints.length === 0 ? (
                <p className="text-slate-400 text-sm p-2 m-0 text-center">No checkpoints available</p>
              ) : (
                checkpoints.filter(c => c.isActive).map(cp => (
                  <button 
                    key={cp.id}
                    onClick={() => { setSelectedCheckpoint(cp); setShowCpSelect(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${selectedCheckpoint?.id === cp.id ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    {cp.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { setUseOtp(v => !v); readyForNext(); }} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${useOtp ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
          >
            {useOtp ? <><ScanLine size={12}/> QR</> : <><Lock size={12}/> OTP</>}
          </button>
          {onLogout && (
            <button 
              onClick={onLogout} 
              className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center justify-center"
            >
              <LogOut size={16}/>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {!useOtp && (
          <div className="absolute inset-0">
            <video ref={videoRef} onLoadedData={onVideoReady} className="w-full h-full object-cover" playsInline muted autoPlay/>
            <canvas ref={canvasRef} className="hidden"/>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"/>
            
            {permState === 'granted' && !showResult && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                   {/* Scanning animation line */}
                   <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_4px_rgba(99,102,241,0.5)] animate-scan-line" />
                   {/* Corner markers */}
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-3xl" />
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-3xl" />
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-3xl" />
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-3xl" />
                </div>
                <div className="text-center mt-8 bg-black/50 px-6 py-2 rounded-full backdrop-blur-md">
                  <p className="text-white/90 text-sm font-bold tracking-widest uppercase m-0">Align QR Code</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-indigo-500 animate-spin mb-4" />
                <p className="text-indigo-400 font-bold animate-pulse">Verifying Database...</p>
              </div>
            )}
          </div>
        )}

        {/* OTP Panel */}
        {useOtp && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="card-glass w-full max-w-sm p-8 animate-slide-up">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-white mb-1">Manual OTP</h2>
                <p className="text-slate-400 text-sm font-medium">{selectedCheckpoint ? selectedCheckpoint.name : 'Unknown Checkpoint'}</p>
              </div>

              {errorMsg && (
                <div className="animate-pop-in bg-red-500/10 text-red-400 rounded-xl p-4 text-sm font-medium flex items-center gap-2 mb-6 border border-red-500/20">
                  <AlertTriangle size={16} className="shrink-0"/>
                  {errorMsg}
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="input-label" htmlFor="otp-roll">Roll Number</label>
                    <input id="otp-roll" className="input" type="text" placeholder="Enter roll number" value={roll} onChange={e => setRoll(e.target.value)} required disabled={loading} autoCapitalize="none" />
                  </div>
                  <button type="submit" className="btn btn-primary w-full py-3.5 shadow-lg shadow-indigo-500/20" disabled={loading || !selectedCheckpoint}>
                    {loading ? 'Sending...' : 'Send OTP via Email'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-sm text-slate-400 font-medium text-center border border-white/5">
                    Code sent to <strong className="text-white">{roll}</strong>
                  </div>
                  <div>
                    <input 
                      id="otp-code" 
                      className="w-full bg-slate-900 border-2 border-indigo-500/30 rounded-xl px-4 py-4 text-white text-3xl tracking-[0.5em] text-center font-black focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder-slate-700" 
                      type="text" 
                      inputMode="numeric" 
                      pattern="[0-9]*" 
                      autoComplete="one-time-code" 
                      placeholder="------" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value)} 
                      maxLength={6} 
                      required 
                      disabled={loading} 
                    />
                  </div>
                  <button type="submit" className="btn btn-success w-full py-3.5 shadow-lg shadow-emerald-500/20" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Admit'}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="btn btn-secondary w-full py-3">← Change Roll Number</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Result Bottom Sheet */}
        {showResult && !useOtp && (
          <>
            <div onClick={readyForNext} className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm cursor-pointer animate-fade-in" />
            <div className="absolute bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl z-50 p-6 pt-3 animate-slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-6" />

              {scanResult ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.4)] text-white">
                    <BadgeCheck size={48} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                    ✅ Validated • {selectedCheckpoint?.name}
                  </span>
                  <h2 className="text-3xl font-black text-white m-0 mb-1">{scanResult.name}</h2>
                  <p className="text-slate-400 text-lg font-medium mb-8">
                    Roll: <span className="text-white">{scanResult.roll}</span>
                  </p>
                  <button onClick={readyForNext} className="btn btn-success w-full py-4 text-lg rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <ScanLine size={20} className="mr-2"/> Scan Next Attendee
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(239,68,68,0.4)] text-white">
                    <XCircle size={48} />
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                    Access Denied
                  </span>
                  <h2 className="text-xl font-bold text-white mb-8 mx-4">{errorMsg}</h2>
                  <button onClick={readyForNext} className="btn btn-secondary w-full py-4 text-lg rounded-2xl">
                    <RefreshCw size={20} className="mr-2"/> Try Again
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Footer stays at bottom */}
      <div className="hidden sm:block">
        <GlobalFooter />
      </div>
    </div>
  );
}
