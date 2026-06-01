import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

export default function DashboardAnalytics({ attendees, eventCheckpoints }) {
  // Generate time-series data from attendee scan times
  const timeSeriesData = useMemo(() => {
    if (!attendees || attendees.length === 0) return [];
    
    // Flatten all scans
    const allScans = [];
    attendees.forEach(a => {
      a.checkpointStatuses?.forEach(cs => {
        if (cs.status && cs.scannedAt) {
          allScans.push({ time: new Date(cs.scannedAt).getTime() });
        }
      });
    });

    if (allScans.length === 0) return [];

    allScans.sort((a, b) => a.time - b.time);
    const startTime = allScans[0].time;
    const endTime = allScans[allScans.length - 1].time;
    
    // Group into 10 intervals
    const interval = Math.max((endTime - startTime) / 10, 60000); // min 1 minute
    
    const buckets = [];
    let currentTime = startTime;
    for (let i = 0; i <= 10; i++) {
      buckets.push({
        timeLabel: new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scans: 0,
        endTime: currentTime + interval
      });
      currentTime += interval;
    }

    allScans.forEach(scan => {
      const bucket = buckets.find(b => scan.time < b.endTime) || buckets[buckets.length - 1];
      bucket.scans += 1;
    });

    return buckets;
  }, [attendees]);

  // Generate Checkpoint Drop-off data
  const dropoffData = useMemo(() => {
    if (!eventCheckpoints || eventCheckpoints.length === 0) return [];
    return eventCheckpoints.map(cp => {
      const count = attendees.filter(a => a.checkpointStatuses?.find(cs => cs.checkpointId === cp.id)?.status).length;
      return {
        name: cp.name,
        count
      };
    });
  }, [attendees, eventCheckpoints]);

  if (timeSeriesData.length === 0) {
    return null; // Don't show charts if no data
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Attendance Velocity Chart */}
      <div className="lg:col-span-2 card-glass p-6 border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              Scan Velocity
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Real-time checkpoint throughput</p>
          </div>
          <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <span className="text-xs font-bold text-indigo-400">Live</span>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="scans" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorScans)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Checkpoint Drop-off Stats */}
      <div className="card-glass p-6 border border-white/5 shadow-2xl flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white">Checkpoint Funnel</h3>
          <p className="text-xs text-slate-400 font-medium mt-1">Conversion across zones</p>
        </div>
        
        <div className="flex-1 space-y-4">
          {dropoffData.map((d, i) => {
            const max = Math.max(...dropoffData.map(x => x.count), 1);
            const pct = (d.count / max) * 100;
            return (
              <div key={d.name} className="relative">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">{d.name}</span>
                  <span className="text-white">{d.count}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
