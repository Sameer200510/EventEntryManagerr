import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Zap, BarChart3, Users, 
  Mail, Smartphone, ChevronDown, CheckCircle2, 
  ArrowRight, Play, Server, Lock 
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqs = [
    { q: "How does QR authentication work?", a: "Every attendee receives a unique cryptographic QR code via email. Volunteers scan this code at the venue using our mobile-optimized scanner to instantly verify authenticity and prevent duplicates." },
    { q: "Can I manage multiple events?", a: "Yes, our platform supports managing an unlimited number of concurrent events, each with their own attendee lists, checkpoints, and analytics." },
    { q: "Is email campaign management included?", a: "Absolutely. Our platform features a robust email engine that sends bulk personalized invitations, tracks delivery statuses, and allows you to retry failed deliveries." },
    { q: "What is Multi-Checkpoint Verification?", a: "You can define multiple zones (e.g., Entry Gate, Food Counter, VIP Lounge). Our system tracks whether an attendee has passed through specific checkpoints, ensuring tight access control." },
    { q: "Can volunteers use their own phones?", a: "Yes, our volunteer portal is completely web-based and mobile-optimized. Volunteers simply log in on their smartphone browser to start scanning." }
  ];

  return (
    <div className="min-h-screen bg-transparent text-slate-50 selection:bg-indigo-500/30 overflow-hidden font-sans">

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Event<span className="text-indigo-400">Core</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
              Log In
            </button>
            <button onClick={() => navigate('/login')} className="btn btn-primary btn-sm px-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border-0">
              Go to Console
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap size={14} className="text-indigo-400" /> Enterprise Grade Platform
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              Secure. Simplify. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
                Scale Your Events.
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 mb-8 leading-relaxed max-w-xl">
              The next-generation QR authentication platform built for universities, conferences, and massive scale operations. Automate invites, secure entry, and monitor live analytics instantly.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => navigate('/login')} className="btn btn-primary px-8 py-4 text-base shadow-lg shadow-indigo-500/25">
                Start Managing <ArrowRight size={18} />
              </button>
              <button className="btn btn-secondary px-8 py-4 text-base bg-white/5 border-white/10 hover:bg-white/10 text-white backdrop-blur-md">
                <Play size={18} /> Watch Demo
              </button>
            </div>
            
            <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-8 text-slate-400 text-sm">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">500k+</span>
                <span>Scans Processed</span>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">99.9%</span>
                <span>Uptime SLA</span>
              </div>
              <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-2xl font-bold text-white">&lt; 1s</span>
                <span>Verification Time</span>
              </div>
            </div>
          </div>

          {/* Hero Visual - Dashboard Glass Mockup */}
          <div className="relative lg:h-[600px] flex items-center justify-center animate-float hidden md:flex">
            <div className="w-full max-w-md aspect-[4/5] rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
              {/* Fake Browser Header */}
              <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              
              {/* Fake Dashboard Content */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-white">Tech Symposium 2026</h3>
                    <p className="text-xs text-emerald-400">Live Status: Active</p>
                  </div>
                  <div className="h-8 w-8 rounded-full border border-indigo-500/30 flex items-center justify-center bg-indigo-500/10">
                    <BarChart3 size={16} className="text-indigo-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Total Attendees</p>
                    <p className="text-2xl font-bold text-white">1,204</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Checked In</p>
                    <p className="text-2xl font-bold text-emerald-400">892</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Recent Scans</p>
                  {[
                    { n: 'Alex Chen', t: 'Just now', s: 'Entry Gate' },
                    { n: 'Sarah Miller', t: '2m ago', s: 'Food Counter' },
                    { n: 'James Wilson', t: '5m ago', s: 'Entry Gate' }
                  ].map((scan, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                          {scan.n.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{scan.n}</p>
                          <p className="text-xs text-slate-400">{scan.s}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{scan.t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating scanner element */}
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-emerald-500/20 blur-[60px] rounded-full"></div>
              <div className="absolute bottom-6 right-6 bg-slate-800 border border-emerald-500/30 rounded-xl p-3 shadow-xl flex items-center gap-3 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.5s' }}>
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-300">Scan Successful</p>
                  <p className="text-sm font-bold text-white">Valid Ticket</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 relative z-10 bg-slate-900/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to run flawless events</h2>
            <p className="text-slate-400 text-lg">A complete toolkit designed to eliminate bottlenecks, prevent fraud, and give organizers absolute control.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <ShieldCheck/>, color: 'text-emerald-400', bg: 'bg-emerald-400/10', title: 'Cryptographic QR Auth', desc: 'Bank-grade secure tokens prevent duplication and screenshot sharing. Instant offline-capable validation.' },
              { icon: <Mail/>, color: 'text-indigo-400', bg: 'bg-indigo-400/10', title: 'Smart Email Engine', desc: 'Upload CSVs to dispatch thousands of personalized tickets. Track deliveries, bounces, and resend failed invites.' },
              { icon: <BarChart3/>, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'Live Command Center', desc: 'Monitor check-ins, bottleneck areas, and volunteer performance in real-time with comprehensive dashboards.' },
              { icon: <Smartphone/>, color: 'text-pink-400', bg: 'bg-pink-400/10', title: 'Mobile Volunteer App', desc: 'No hardware needed. Turn any smartphone into a lightning-fast scanner with zero-training required.' },
              { icon: <Server/>, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Multi-Checkpoint Zoning', desc: 'Configure separate gates for Entry, Food, and VIP zones. Track attendee journeys throughout your venue.' },
              { icon: <Users/>, color: 'text-amber-400', bg: 'bg-amber-400/10', title: 'Role-Based Access', desc: 'Strict permissions separate Admins from Volunteers, ensuring data privacy and operational security.' }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 hover:bg-slate-800 transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Deep Dive */}
      <section id="security" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full"></div>
              <div className="relative border border-white/10 bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Lock className="text-indigo-400" size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Enterprise Security</h4>
                    <p className="text-sm text-slate-400">Zero-trust architecture</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {[
                    'Helmet-enforced strict HTTP headers (HSTS, CSP)',
                    'JWT-based stateless authentication flow',
                    'Memory-buffer MIME validation for secure uploads',
                    'Encrypted database credentials and logs',
                    'Rate-limited APIs to prevent brute-forcing'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-400 mt-0.5 shrink-0" size={18} />
                      <span className="text-slate-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Impenetrable security from the ground up.</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                When managing thousands of attendees, you cannot afford leaks or fraudulent entries. We built our platform with a paranoia-first approach, employing industry-standard safeguards to protect your data and venue.
              </p>
              <button className="text-indigo-400 font-semibold flex items-center gap-2 hover:text-indigo-300 transition-colors">
                Read our Security Whitepaper <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 relative z-10 bg-slate-900/30 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-400">Everything you need to know about the product and billing.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-xl bg-slate-800/30 overflow-hidden transition-all duration-200">
                <button 
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                >
                  <span className="font-semibold text-slate-200">{faq.q}</span>
                  <ChevronDown className={`text-slate-400 transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} size={20} />
                </button>
                <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${activeFaq === i ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-indigo-900/20 p-12 text-center shadow-2xl shadow-indigo-500/10">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-extrabold text-white mb-6">Transform Your Event Operations Today</h2>
              <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
                Join hundreds of universities and organizers who have upgraded from chaotic paper lists to our seamless digital platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => navigate('/login')} className="btn btn-primary px-8 py-4 w-full sm:w-auto shadow-xl shadow-indigo-500/30 text-base">
                  Start Managing Events
                </button>
                <button className="btn btn-secondary px-8 py-4 w-full sm:w-auto bg-slate-900/50 border-white/20 hover:bg-slate-800 text-white text-base">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="text-indigo-500" size={24} />
                <span className="font-bold text-xl text-white">Event<span className="text-indigo-400">Core</span></span>
              </div>
              <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                The enterprise standard for QR-based event entry, authentication, and analytics. Securely processing millions of attendees worldwide.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} EventCore Platform. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              Designed by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 font-bold">SAMEER LOHANI & VARUN DOBHAL</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
