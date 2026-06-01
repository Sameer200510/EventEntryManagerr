import React, { useState } from 'react';
import { Search, X, Mail, Loader2, RefreshCw, Trash2, ChevronRight, Download, SlidersHorizontal, CheckCircle2, UserCircle } from 'lucide-react';

function StatusBadge({ done, doneLabel = "Done", pendingLabel = "Pending", time }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider rounded-full border ${done ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-white/5'}`}>
        {done ? `✓ ${doneLabel}` : `○ ${pendingLabel}`}
      </span>
      {time && (
        <span className="text-[0.6rem] text-slate-500 font-bold">
          {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

export default function AttendeeTable({
  filtered, stats, eventCheckpoints,
  searchTerm, setSearchTerm, sortOption, setSortOption,
  checkpointFilters, setCheckpointFilters, emailFilter, setEmailFilter,
  handleClearAttendees, fetchAttendees, handleSendEmail, emailLoading
}) {
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  const getCheckpointStatus = (attendee, cpId) => {
    return attendee.checkpointStatuses?.find(cs => cs.checkpointId === cpId);
  };

  return (
    <div className="card-glass p-0 overflow-hidden relative">
      
      {/* Slide-out Details Drawer */}
      <div className={`absolute top-0 right-0 w-full md:w-96 h-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${selectedAttendee ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedAttendee && (
          <>
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900">
              <h3 className="font-bold text-white text-lg">Attendee Details</h3>
              <button onClick={() => setSelectedAttendee(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg">
                <X size={18}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                  <UserCircle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{selectedAttendee.name}</h2>
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider border border-white/5">
                    Roll: {selectedAttendee.roll}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Contact Info</h4>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                    <p className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
                      <Mail size={14} className="text-indigo-400" /> {selectedAttendee.email || 'No email provided'}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                      <span className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border ${selectedAttendee.emailSent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {selectedAttendee.emailSent ? 'Email Sent' : 'Email Pending'}
                      </span>
                      <button
                        onClick={() => handleSendEmail(selectedAttendee.id)}
                        disabled={!selectedAttendee.email || emailLoading === selectedAttendee.id}
                        className="btn btn-primary btn-sm px-4"
                      >
                        {emailLoading === selectedAttendee.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                        {selectedAttendee.emailSent ? 'Resend' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Timeline & Checkpoints</h4>
                  <div className="space-y-3">
                    {eventCheckpoints.map((cp, idx) => {
                      const status = getCheckpointStatus(selectedAttendee, cp.id);
                      return (
                        <div key={cp.id} className="relative flex gap-4 bg-slate-800/30 p-4 rounded-xl border border-white/5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${status?.status ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                            {status?.status ? <CheckCircle2 size={16}/> : idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white mb-0.5">{cp.name}</p>
                            <p className="text-xs text-slate-400 font-medium">
                              {status?.status ? `Scanned at ${new Date(status.scannedAt).toLocaleTimeString()}` : 'Pending validation'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="p-5 border-b border-white/10 flex items-center flex-wrap gap-4 justify-between bg-slate-900/30">
        <div>
          <h2 className="text-lg font-bold text-white m-0">Attendee Database</h2>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {filtered.length} of {stats.total} records shown
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleClearAttendees} className="btn btn-sm btn-secondary bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50" title="Delete all attendees for this event">
            <Trash2 size={14} className="mr-1.5" /> Clear All
          </button>
          <button onClick={fetchAttendees} className="btn btn-sm btn-secondary">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-white/5 flex gap-3 flex-wrap bg-slate-900/50 items-center">
        <div className="relative flex-grow min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input w-full pl-9 py-2 text-sm bg-slate-800 border-slate-700 focus:border-indigo-500 transition-colors"
            type="text"
            placeholder="Search by name or roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
            <SlidersHorizontal size={14} className="text-slate-500 mx-2" />
            <select className="bg-transparent text-sm text-slate-300 font-medium focus:outline-none pr-2 py-1 cursor-pointer" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="upload">Sort: Default</option>
              <option value="name">Sort: A-Z</option>
              <option value="roll">Sort: Roll No</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
            <select className="bg-transparent text-sm text-slate-300 font-medium focus:outline-none px-2 py-1 cursor-pointer" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)}>
              <option value="all">Email: All</option>
              <option value="sent">Email: Sent ✉️</option>
              <option value="pending">Email: Pending</option>
            </select>
          </div>

          {eventCheckpoints.map(cp => (
            <div key={cp.id} className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700 shrink-0">
              <select
                className="bg-transparent text-sm text-slate-300 font-medium focus:outline-none px-2 py-1 cursor-pointer max-w-[120px] truncate"
                value={checkpointFilters[cp.id] || "all"}
                onChange={(e) => setCheckpointFilters(prev => ({...prev, [cp.id]: e.target.value}))}
              >
                <option value="all">{cp.name}: All</option>
                <option value="done">{cp.name}: Done ✓</option>
                <option value="pending">{cp.name}: Pending</option>
              </select>
            </div>
          ))}
          
          {(searchTerm || sortOption !== "upload" || emailFilter !== "all" || Object.values(checkpointFilters).some(v => v !== "all")) && (
            <button className="btn-icon bg-slate-800 border border-slate-700 text-slate-400 hover:text-white shrink-0" onClick={() => { setSearchTerm(""); setSortOption("upload"); setCheckpointFilters({}); setEmailFilter("all"); }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-white/10">
              {["Attendee", "Contact", "Email Status", ...eventCheckpoints.map(c => c.name), "Actions"].map((h) => (
                <th key={h} className={`px-4 py-3 text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap ${["Email Status", ...eventCheckpoints.map(c => c.name), "Actions"].includes(h) ? "text-center" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={eventCheckpoints.length + 4} className="py-24 text-center">
                  <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700">
                    <Search size={32} className="text-slate-500 mb-3" />
                    <p className="text-slate-400 font-medium text-sm">No attendees match your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr 
                  key={a.id} 
                  className="group hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedAttendee(a)}
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-white text-sm mb-0.5">{a.name}</p>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">
                      {a.roll}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[150px]">
                      {a.email || "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider border ${a.emailSent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {a.emailSent ? "Sent" : "Pending"}
                    </span>
                  </td>
                  {eventCheckpoints.map(cp => {
                    const status = getCheckpointStatus(a, cp.id);
                    return (
                      <td key={cp.id} className="px-4 py-3 text-center">
                        <StatusBadge done={status?.status} time={status?.scannedAt} />
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleSendEmail(a.id)}
                      disabled={!a.email || emailLoading === a.id}
                      className={`btn btn-xs shadow-md ${a.emailSent ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'btn-primary'}`}
                    >
                      {emailLoading === a.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      {a.emailSent ? "Resend" : "Send"}
                    </button>
                    <button 
                      onClick={() => setSelectedAttendee(a)}
                      className="ml-2 btn-icon bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
