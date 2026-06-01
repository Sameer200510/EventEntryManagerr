export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/20 backdrop-blur-sm ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/5">
          <Icon className="w-8 h-8 text-indigo-400" />
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-8 text-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="btn btn-primary btn-sm px-6 shadow-lg shadow-indigo-500/20 animate-pop-in"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
