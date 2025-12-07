import React, { useState } from 'react';
import { User, Check, X, Smile, Sparkles } from 'lucide-react';

interface AddProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (name: string) => void;
}

export const AddProfileDialog: React.FC<AddProfileDialogProps> = ({ isOpen, onClose, onComplete }) => {
  const [name, setName] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onComplete(name);
    setName('');
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className="w-full max-w-sm bg-win-bg border border-win-border rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-win-open flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-win-border bg-win-surface/50">
          <h2 className="text-lg font-semibold text-win-text">New User Profile</h2>
          <button 
            onClick={onClose}
            className="p-1 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
           <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-win-border flex items-center justify-center shadow-inner relative group cursor-pointer overflow-hidden">
                 <Smile size={40} className="text-win-primary group-hover:scale-110 transition-transform duration-300" />
                 <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Sparkles size={20} className="text-win-text opacity-70" />
                 </div>
              </div>
              <p className="text-sm text-win-subtext text-center px-4">
                Create a separate space for work, personal use, or a guest.
              </p>
           </div>

           <div className="space-y-1.5">
              <label className="text-xs font-semibold text-win-subtext ml-1">Profile Name</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Work"
                  className="fluent-input pl-10 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-muted group-focus-within:text-win-primary transition-colors" />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!name.trim()}
                className={`
                  flex items-center gap-2 px-6 py-2 bg-win-primary hover:bg-win-hover text-white rounded-xl font-medium text-sm shadow-sm active:scale-[0.98] transition-all
                  ${!name.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Check size={16} />
                <span>Create</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
