import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Users,
  Clock,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Business } from '../types';

export const BusinessManagement: React.FC = () => {
  const { businesses, employees, users, addBusiness, updateBusiness, currentUser } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openEditModal = (b: Business) => {
    setEditingBiz(b);
    setName(b.name);
    setCode(b.code);
    setDescription(b.description || '');
    setAddress(b.address || '');
    setContactNumber(b.contactNumber || '');
    setEmail(b.email || '');
    setStatus(b.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBiz) {
      updateBusiness(editingBiz.id, {
        name,
        code,
        description,
        address,
        contactNumber,
        email,
        status,
      });
      setEditingBiz(null);
    } else {
      addBusiness({
        name,
        code,
        description,
        address,
        contactNumber,
        email,
        status,
      });
      setShowAddModal(false);
    }

    // Reset fields
    setName('');
    setCode('');
    setDescription('');
    setAddress('');
    setContactNumber('');
    setEmail('');
    setStatus('active');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Business Units Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage CV Group of Companies subsidiaries and branch operational centers.
          </p>
        </div>

        {currentUser.role === 'super_admin' && (
          <button
            onClick={() => {
              setEditingBiz(null);
              setName('');
              setCode('');
              setDescription('');
              setAddress('');
              setContactNumber('');
              setEmail('');
              setStatus('active');
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Subsidiary Business
          </button>
        )}
      </div>

      {/* Grid of Businesses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {businesses.map((biz) => {
          const bizEmployees = employees.filter((e) => e.businessId === biz.id);
          const activeCount = bizEmployees.filter((e) => e.accountStatus === 'active').length;
          const adminUser = users.find((u) => u.businessId === biz.id && u.role === 'business_admin');

          return (
            <div
              key={biz.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                        {biz.code}
                      </span>
                      <h3 className="font-bold text-white text-base mt-1 leading-tight">{biz.name}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      biz.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {biz.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                  {biz.description || 'CV Group operations unit'}
                </p>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  {biz.address && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{biz.address}</span>
                    </div>
                  )}
                  {biz.contactNumber && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono">{biz.contactNumber}</span>
                    </div>
                  )}
                  {adminUser && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Admin: <strong>{adminUser.fullName}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white font-mono">{activeCount}</span> Staff Members
                </div>

                {currentUser.role === 'super_admin' && (
                  <button
                    onClick={() => openEditModal(biz)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Business Modal */}
      {(showAddModal || editingBiz) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">
                  {editingBiz ? 'Edit Subsidiary Business' : 'Add New Subsidiary Business'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBiz(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Business Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DailyGrind Bakery"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Code / Acronym:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DGB"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description / Line of Business:</label>
                <textarea
                  rows={2}
                  placeholder="Specialty pastries and artisan bread wholesale..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Location / Address:</label>
                <input
                  type="text"
                  placeholder="Unit 102, Commercial Strip, Davao City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Contact Phone:</label>
                  <input
                    type="text"
                    placeholder="+63 912 345 6789"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Contact Email:</label>
                  <input
                    type="email"
                    placeholder="branch@cvgroup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Operating Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBiz(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  {editingBiz ? 'Update Business' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
