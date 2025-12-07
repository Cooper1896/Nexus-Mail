import React, { useState, useRef } from 'react';
import { X, Send, Paperclip, Minus, Maximize2, Check, File, Trash2 } from 'lucide-react';
import { isValidEmail } from '../utils/validation';

interface Attachment {
  name: string;
  path: string;
  size: number;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, attachments?: Attachment[]) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSend }) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newAttachments.push({
        name: file.name,
        path: (file as any).path || file.name, // Electron gives file.path
        size: file.size
      });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSend = async () => {
    if (!to || !subject || !body || !isValidEmail(to)) return;
    setIsSending(true);

    try {
      // Simulate a brief delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Delegate actual sending to parent (App.tsx) which handles API calls
      onSend(to, subject, body, attachments);
      
      setIsSending(false);
      setIsSent(true);
      
      setTimeout(() => {
        resetForm();
        // onClose is handled by parent usually, but we can trigger it here if needed
        // or wait for parent to close it. App.tsx sets isComposeOpen(false) immediately.
      }, 1000);
      
    } catch (err) {
      console.error('Send failed:', err);
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBody('');
    setAttachments([]);
    setIsSent(false);
    setShowCcBcc(false);
  };

  const handleSaveDraft = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveDraft({ to, subject, body });
    }
    resetForm();
    onClose();
  };

  return (
    // Overlay
    <div className="absolute inset-0 z-50 flex items-end justify-end p-0 md:p-6 pointer-events-none">

      {/* Modal Window - Strict rounded-3xl */}
      <div className="w-full h-full md:w-[600px] md:h-[600px] bg-win-bg border-t md:border border-win-border md:rounded-3xl shadow-2xl pointer-events-auto animate-slide-up-fluent flex flex-col overflow-hidden">

        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-win-surface border-b border-win-border select-none shrink-0">
          <span className="text-sm font-semibold text-win-text">New Message</span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors">
              <Minus size={14} />
            </button>
            <button className="p-1.5 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors hidden md:block">
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-win-subtext hover:text-white hover:bg-[#c42b1c] rounded-xl transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar bg-win-bg">
          <div className="mb-2">
            <div className={`flex items-center border-b border-win-border focus-within:border-win-primary transition-colors ${to && !isValidEmail(to) ? 'border-red-500' : ''}`}>
              <span className="text-xs text-win-subtext w-12 shrink-0">To:</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm text-win-text focus:outline-none placeholder-win-muted"
                autoFocus
              />
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-win-primary hover:underline px-2"
              >
                {showCcBcc ? 'Hide' : 'Cc/Bcc'}
              </button>
            </div>
            {to && !isValidEmail(to) && (
              <p className="text-[10px] text-red-500 mt-1">Invalid email format</p>
            )}
          </div>

          {showCcBcc && (
            <>
              <div className="mb-2">
                <div className="flex items-center border-b border-win-border focus-within:border-win-primary transition-colors">
                  <span className="text-xs text-win-subtext w-12 shrink-0">Cc:</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 bg-transparent py-2 text-sm text-win-text focus:outline-none placeholder-win-muted"
                    placeholder="Separate multiple emails with commas"
                  />
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-center border-b border-win-border focus-within:border-win-primary transition-colors">
                  <span className="text-xs text-win-subtext w-12 shrink-0">Bcc:</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 bg-transparent py-2 text-sm text-win-text focus:outline-none placeholder-win-muted"
                    placeholder="Separate multiple emails with commas"
                  />
                </div>
              </div>
            </>
          )}

          <div className="mb-4">
            <div className="flex items-center border-b border-win-border focus-within:border-win-primary transition-colors">
              <span className="text-xs text-win-subtext w-12 shrink-0">Subject:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm text-win-text focus:outline-none placeholder-win-muted"
              />
            </div>
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-win-surface rounded-lg border border-win-border">
                  <File size={14} className="text-win-subtext" />
                  <span className="text-xs text-win-text max-w-[150px] truncate">{att.name}</span>
                  <span className="text-xs text-win-muted">({formatFileSize(att.size)})</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="p-0.5 hover:bg-red-500/20 rounded text-win-subtext hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            placeholder="Type your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 w-full bg-transparent resize-none text-win-text text-sm leading-relaxed focus:outline-none placeholder-win-muted"
          />
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-win-surface border-t border-win-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={!to || !subject || isSending || isSent || !isValidEmail(to)}
              className={`
                 flex items-center gap-2 px-4 py-1.5 rounded-xl font-medium text-sm transition-all
                 ${!to || !subject || isSending || !isValidEmail(to)
                  ? 'bg-win-border text-win-subtext cursor-not-allowed'
                  : isSent
                    ? 'bg-green-600 text-white'
                    : 'bg-win-primary hover:bg-win-hover active:bg-win-pressed text-white shadow-sm active:scale-[0.98]'}
               `}
            >
              {isSent ? (
                <>
                  <span>Sent</span>
                  <Check size={14} className="animate-in zoom-in spin-in-90 duration-300" />
                </>
              ) : (
                <>
                  <span>{isSending ? 'Sending...' : 'Send'}</span>
                  <Send size={14} />
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors relative"
              title="Add attachments"
            >
              <Paperclip size={16} />
              {attachments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-win-primary text-white text-[10px] rounded-full flex items-center justify-center">
                  {attachments.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={handleSaveDraft}
            className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-xl transition-colors text-xs"
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  );
};
