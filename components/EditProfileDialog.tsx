
import React, { useState } from 'react';
import { User, Check, X, Camera, Image as ImageIcon, Sparkles, Tag } from 'lucide-react';
import { User as UserType } from '../types';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onSave: (updatedUser: UserType) => void;
}

const PRESET_SEEDS = ['Felix', 'Aneka', 'Zack', 'Midnight', 'Bear', 'Loki', 'Pepper', 'Ginger'];

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ isOpen, onClose, currentUser, onSave }) => {
  const [name, setName] = useState(currentUser.name);
  const [group, setGroup] = useState(currentUser.group || 'Personal');
  const [avatarMode, setAvatarMode] = useState<'preset' | 'custom'>('preset');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar);
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...currentUser,
      name,
      group,
      avatar: selectedAvatar
    });
    onClose();
  };

  const handlePresetSelect = (seed: string) => {
    setSelectedAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleCustomUrlApply = () => {
    if (customUrl.trim()) setSelectedAvatar(customUrl);
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Compact Dialog Container */}
      <div className="w-full max-w-xs bg-win-bg border border-win-border rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-win-open flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-win-border bg-win-surface/50">
          <h2 className="text-base font-semibold text-win-text">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">

          {/* Avatar Preview & Selection */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-win-border overflow-hidden bg-win-surface shadow-md">
              <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>

            {/* Toggle Switch */}
            <div className="flex p-0.5 bg-win-surface border border-win-border rounded-lg shadow-sm w-full">
              <button
                onClick={() => setAvatarMode('preset')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${avatarMode === 'preset' ? 'bg-win-primary text-white' : 'text-win-subtext hover:text-win-text'}`}
              >
                <Sparkles size={10} />
                Presets
              </button>
              <button
                onClick={() => setAvatarMode('custom')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${avatarMode === 'custom' ? 'bg-win-primary text-white' : 'text-win-subtext hover:text-win-text'}`}
              >
                <ImageIcon size={10} />
                Custom
              </button>
            </div>

            {/* Avatar Picker Area */}
            <div className="w-full p-2 bg-win-surface/50 rounded-xl border border-win-border">
              {avatarMode === 'preset' && (
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_SEEDS.map(seed => {
                    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                    const isSelected = selectedAvatar === avatarUrl;
                    return (
                      <button
                        key={seed}
                        onClick={() => handlePresetSelect(seed)}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${isSelected ? 'border-win-primary ring-1 ring-win-primary/20' : 'border-transparent hover:border-win-border'}`}
                      >
                        <img src={avatarUrl} alt={seed} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
              {avatarMode === 'custom' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://..."
                      className="fluent-input flex-1 rounded-lg text-xs py-1.5"
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomUrlApply()}
                    />
                    <button
                      onClick={handleCustomUrlApply}
                      disabled={!customUrl.trim()}
                      className="px-2 bg-win-surface border border-win-border rounded-lg text-win-text hover:bg-win-surface-hover disabled:opacity-50 text-xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Text Inputs */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-win-subtext">Display Name</label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="fluent-input pl-8 rounded-lg text-sm py-1.5"
                  placeholder="Your Name"
                />
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-win-subtext">Group / Tag</label>
              <div className="relative group">
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="fluent-input pl-8 rounded-lg text-sm py-1.5"
                  placeholder="e.g. Work, Personal"
                />
                <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-win-border bg-win-surface/30 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-win-primary hover:bg-win-hover text-white rounded-lg font-medium text-xs shadow-sm active:scale-[0.98] transition-all"
          >
            <Check size={14} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
