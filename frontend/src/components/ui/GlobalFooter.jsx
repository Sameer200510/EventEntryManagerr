export const GlobalFooter = () => (
  <footer className="w-full py-6 mt-auto border-t border-white/5 bg-slate-950/50 backdrop-blur-md relative z-10">
    <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-slate-500 text-xs font-medium">
        &copy; {new Date().getFullYear()} EventCore Platform. Secure Enterprise Auth.
      </p>
      <p className="text-slate-500 text-xs font-medium tracking-wider">
        Designed by <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 font-bold">SAMEER LOHANI & VARUN DOBHAL</span>
      </p>
    </div>
  </footer>
);
