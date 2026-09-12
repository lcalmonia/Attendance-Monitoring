import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Building,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { Holiday, HolidayType } from '../types';

export const HolidayManagement: React.FC = () => {
  const { holidays, businesses, addHoliday, deleteHoliday, currentUser } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<HolidayType>('regular');
  const [rateMultiplier, setRateMultiplier] = useState(2.0);
  const [applicableBusinesses, setApplicableBusinesses] = useState<string[]>(['all']);
  const [notes, setNotes] = useState('');

  const handleTypeChange = (newType: HolidayType) => {
    setType(newType);
    if (newType === 'regular') setRateMultiplier(2.0);
    else if (newType === 'special_non_working') setRateMultiplier(1.3);
    else if (newType === 'special_working') setRateMultiplier(1.0);
    else if (newType === 'company') setRateMultiplier(1.5);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addHoliday({
      name,
      date,
      type,
      rateMultiplier,
      applicableBusinesses,
      notes,
    });
    setShowModal(false);
    setName('');
    setDate('');
    setNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Projected Holidays & Special Days</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Philippine Labor Standards
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configured holidays dynamically augment employee daily rates when work duty is clocked on these dates.
          </p>
        </div>

        {currentUser.role === 'super_admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Projected Holiday
          </button>
        )}
      </div>

      {/* Holiday Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {holidays.map((h) => {
          const appBusinesses = Array.isArray(h.applicableBusinesses) ? h.applicableBusinesses : ['all'];
          const isAll = appBusinesses.includes('all');
          return (
            <div
              key={h.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {h.date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      h.type === 'regular'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : h.type === 'special_non_working'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {h.type.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mt-3">{h.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{h.notes || 'Official statutory day'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Duty Rate Multiplier</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {h.rateMultiplier.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded">
                    {isAll ? 'All Branches' : `${appBusinesses.length} Branch(es)`}
                  </span>
                  {currentUser.role === 'super_admin' && (
                    <button
                      onClick={() => deleteHoliday(h.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Add Projected Holiday</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Holiday / Special Day Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bonifacio Day / Davao City Charter Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Holiday Date:</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Holiday Classification:</label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as HolidayType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="regular">Regular Holiday (2.0x)</option>
                    <option value="special_non_working">Special Non-Working (1.30x)</option>
                    <option value="special_working">Special Working (1.0x)</option>
                    <option value="local">Local Holiday</option>
                    <option value="company">Company Holiday (1.5x)</option>
                    <option value="custom">Custom Multiplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Duty Rate Multiplier:
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  required
                  value={rateMultiplier}
                  onChange={(e) => setRateMultiplier(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notes / Proclamation Ref:</label>
                <input
                  type="text"
                  placeholder="e.g. Proclamation No. 902 / Special city holiday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
