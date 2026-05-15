'use client';

import React, { useState } from 'react';
import { API_BASE, authHeaders } from '../../../lib/api';
import { SettingsTab } from '../types';

interface UserProfile {
  name: string;
  username: string;
  email: string;
  address: string;
  city: string;
  country: string;
}

const defaultProfile: UserProfile = {
  name: 'User',
  username: '',
  email: '',
  address: '',
  city: '',
  country: '',
};

function getSavedModel() {
  if (typeof window === 'undefined') return 'gemini-2.0-flash';
  return localStorage.getItem('preferredModel') || 'gemini-2.0-flash';
}

function getSavedProfile(): UserProfile {
  if (typeof window === 'undefined') return defaultProfile;
  const userStr = localStorage.getItem('user');
  if (!userStr) return defaultProfile;
  try {
    const user = JSON.parse(userStr) as Partial<UserProfile>;
    return {
      ...defaultProfile,
      name: user.name || defaultProfile.name,
      username: user.username || defaultProfile.username,
      email: user.email || defaultProfile.email,
      city: user.city || defaultProfile.city,
      address: user.address || defaultProfile.address,
      country: user.country || defaultProfile.country,
    };
  } catch (error) {
    console.error('Failed to parse user info', error);
    return defaultProfile;
  }
}

interface SettingsUIProps {
  initialTab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  onShowToast?: (msg: string) => void;
}

export default function SettingsUI({ initialTab = 'edit-profile', onTabChange, onShowToast }: SettingsUIProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getSavedModel);
  const [profile, setProfile] = useState<UserProfile>(getSavedProfile);

  const handleSaveModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem('preferredModel', model);
    if (onShowToast) onShowToast(`✅ Model updated: ${model}`);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/me/update`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Failed to update profile');
      }

      const result = await response.json();
      // Update local storage
      localStorage.setItem('user', JSON.stringify(result.user));
      
      if (onShowToast) onShowToast('✅ Profile updated in MongoDB');
      
      // Force refresh to sync Sidebar and other components
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      if (onShowToast) onShowToast(`❌ ${message}`);
      else alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!passwords.current || !passwords.next) {
      if (onShowToast) onShowToast('⚠️ Please fill both password fields');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const response = await fetch(`${API_BASE}/api/me/change-password`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          current_password: passwords.current,
          new_password: passwords.next,
        }),
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Failed to update password');
      }

      setPasswords({ current: '', next: '' });
      if (onShowToast) onShowToast('✅ Password updated in MongoDB');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      if (onShowToast) onShowToast(`❌ ${message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const tabs = [
    { id: 'edit-profile' as SettingsTab, label: 'Edit Profile' },
    { id: 'preferences' as SettingsTab, label: 'Preferences' },
    { id: 'security' as SettingsTab, label: 'Security' },
  ];

  const models = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Highest quality, best for complex trades' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Faster, good for simple documents' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Stable, high accuracy' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Stable & very fast' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'Latest experimental model' },
  ];

  const handleChange = (field: string, val: string) => {
    setProfile(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <div className="bg-white rounded-[24px] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        
        {/* Tabs Header */}
        <div className="px-8 pt-6 border-b border-gray-100">
          <div className="flex gap-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (onTabChange) onTabChange(tab.id);
                }}
                className={`pb-4 text-sm font-semibold transition-all relative ${
                  activeTab === tab.id ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-10 overflow-y-auto">
          {/* 1. Edit Profile Tab */}
          {activeTab === 'edit-profile' && (
            <div className="flex flex-col gap-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-bg-main flex items-center justify-center border-4 border-white shadow-sm overflow-hidden group relative cursor-pointer">
                  {/* Using smart masculine avatar Jasper (DiceBear v9) */}
                  <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Jasper" alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Edit</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-secondary">{profile.name}</h2>
                  <p className="text-sm text-text-tertiary">Trade Operations Specialist</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Your Name</label>
                  <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-white border border-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">User Name</label>
                  <input 
                    type="text" 
                    value={profile.username} 
                    readOnly
                    className="bg-bg-main border border-border-secondary rounded-xl px-4 py-3 text-sm text-text-tertiary cursor-not-allowed" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Email</label>
                  <input 
                    type="email" 
                    value={profile.email} 
                    readOnly
                    className="bg-bg-main border border-border-secondary rounded-xl px-4 py-3 text-sm text-text-tertiary cursor-not-allowed" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">City</label>
                  <input 
                    type="text" 
                    value={profile.city} 
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="bg-white border border-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm font-medium text-text-secondary">Address</label>
                  <input 
                    type="text" 
                    value={profile.address} 
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="bg-white border border-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="max-w-2xl flex flex-col gap-8">
              <div>
                <h2 className="text-lg font-bold text-text-secondary mb-2">AI Model Preference</h2>
                <p className="text-sm text-text-tertiary">Select which Gemini model to use for trade extraction and analysis.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSaveModel(model.id)}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left ${
                      selectedModel === model.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border-secondary hover:border-primary/50 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-text-secondary">{model.name}</span>
                      <span className="text-xs text-text-tertiary">{model.desc}</span>
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px]">✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-md flex flex-col gap-8">
              <div>
                <h2 className="text-lg font-bold text-text-secondary mb-2">Security Settings</h2>
                <p className="text-sm text-text-tertiary">Manage your password and account security.</p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">Current Password</label>
                  <input 
                    type="password" 
                    value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••" 
                    className="bg-white border border-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-secondary">New Password</label>
                  <input 
                    type="password" 
                    value={passwords.next}
                    onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                    placeholder="••••••••" 
                    className="bg-white border border-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                  />
                </div>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className="bg-primary text-white py-3 rounded-xl font-bold shadow-button hover:bg-[#0a06f4] transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-6 border-t border-gray-100 flex justify-end gap-4">
          <button className="px-8 py-3 text-sm font-bold text-text-tertiary hover:bg-bg-main rounded-xl transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || activeTab !== 'edit-profile'}
            className="bg-primary text-white px-10 py-3 rounded-xl font-bold shadow-button hover:bg-[#0a06f4] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
