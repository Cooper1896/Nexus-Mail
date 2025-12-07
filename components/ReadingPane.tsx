
import React, { useState } from 'react';
import { 
  Reply, ReplyAll, Forward, Trash2, Archive, MoreHorizontal, 
  Star, Printer, Download, Mail, AlertOctagon
} from 'lucide-react';
import { Email } from '../types';

interface ReadingPaneProps {
  email: Email | null;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onStar?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onMarkSpam?: (id: string) => void;
}

export const ReadingPane: React.FC<ReadingPaneProps> = ({ email, onDelete, onArchive, onStar, onMarkUnread, onMarkSpam }) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-win-subtext select-none">
        <div className="w-16 h-16 rounded-xl bg-win-surface flex items-center justify-center mb-4 border border-win-border shadow-sm">
           <svg className="w-8 h-8 text-win-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
           </svg>
        </div>
        <p className="text-sm font-medium">Select an item to read</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-win-surface/50 relative min-w-0">
      {/* Toolbar */}
      <div className="h-14 min-h-[56px] px-6 flex items-center justify-between border-b border-win-border bg-win-panel/90 backdrop-blur-md sticky top-0 z-10 shrink-0">
         <div className="flex items-center gap-1">
            <button className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-md transition-colors" title="Reply">
               <Reply size={16} />
            </button>
            <button className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-md transition-colors" title="Reply All">
               <ReplyAll size={16} />
            </button>
            <button className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-md transition-colors" title="Forward">
               <Forward size={16} />
            </button>
            <div className="w-px h-5 bg-win-border mx-2 hidden sm:block"></div>
            <button 
              onClick={() => onDelete && onDelete(email.id)}
              className="p-2 text-win-subtext hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" 
              title="Delete"
            >
               <Trash2 size={16} />
            </button>
            <button 
              onClick={() => onArchive && onArchive(email.id)}
              className="p-2 text-win-subtext hover:text-win-text hover:bg-win-surface-hover rounded-md transition-colors" 
              title="Archive"
            >
               <Archive size={16} />
            </button>
         </div>
         <div className="flex items-center gap-1 relative">
             <button 
               onClick={() => onStar && onStar(email.id)}
               className="p-2 text-win-subtext hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors"
               title="Star"
             >
               <Star size={16} className={email.starred ? "fill-yellow-400 text-yellow-400" : ""} />
             </button>
             
             {/* More Menu */}
             <div className="relative">
                {isMoreMenuOpen && (
                   <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-win-surface border border-win-border rounded-xl shadow-win-elevation p-1 z-20 animate-win-open">
                         <button 
                           onClick={() => { onMarkUnread && onMarkUnread(email.id); setIsMoreMenuOpen(false); }}
                           className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-win-text hover:bg-win-surface-hover transition-colors"
                         >
                            <Mail size={16} className="text-win-subtext" />
                            <span>Mark as unread</span>
                         </button>
                         <button 
                            onClick={() => { onMarkSpam && onMarkSpam(email.id); setIsMoreMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-win-text hover:bg-win-surface-hover transition-colors"
                         >
                            <AlertOctagon size={16} className="text-win-subtext" />
                            <span>Report spam</span>
                         </button>
                         <div className="h-px bg-win-border my-1"></div>
                         <button 
                            onClick={handlePrint}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-win-text hover:bg-win-surface-hover transition-colors"
                         >
                            <Printer size={16} className="text-win-subtext" />
                            <span>Print</span>
                         </button>
                      </div>
                   </>
                )}
                <button 
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`p-2 rounded-md transition-colors ${isMoreMenuOpen ? 'bg-win-surface-active text-win-text' : 'text-win-subtext hover:text-win-text hover:bg-win-surface-hover'}`}
                >
                  <MoreHorizontal size={16} />
                </button>
             </div>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
         <div className="p-8 max-w-4xl mx-auto min-w-0 animate-in fade-in duration-300 slide-in-from-bottom-2">
            {/* Header */}
            <div className="mb-8">
               <h1 className="text-2xl font-semibold text-win-text mb-6 leading-tight select-text">{email.subject}</h1>
               
               <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${email.avatarColor || 'bg-blue-600'} text-white border border-white/10`}>
                     {email.senderName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                     <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-win-text text-base">{email.senderName}</span>
                        <span className="text-xs text-win-subtext">{email.timestamp}</span>
                     </div>
                     <div className="text-xs text-win-subtext mt-0.5">
                        &lt;{email.senderEmail}&gt;
                     </div>
                     <div className="text-xs text-win-subtext mt-0.5">
                        To: <span className="text-win-text">Me</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Body */}
            <div className="prose prose-sm max-w-none select-text border-t border-win-border pt-6">
               <div 
                 className="text-win-text leading-7 font-normal email-content"
                 dangerouslySetInnerHTML={{ __html: email.body }}
               />
            </div>

            {/* Attachments Area */}
            <div className="mt-8 pt-4 border-t border-win-border">
               {email.attachments && email.attachments.length > 0 && (
                  <>
                     <p className="text-xs font-semibold text-win-subtext uppercase tracking-wider mb-3">Attachments</p>
                     <div className="flex flex-wrap gap-3">
                        {email.attachments.map((att, index) => (
                           <div 
                              key={index}
                              onClick={() => (window as any).electronAPI?.openPath(att.path)}
                              className="flex items-center gap-3 p-2 pr-4 rounded-md border border-win-border bg-win-surface hover:bg-win-surface-hover cursor-pointer transition-colors group shadow-sm"
                           >
                              <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 border border-red-500/20">
                                 <span className="text-[10px] font-bold">{att.filename.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className="text-xs font-medium text-win-text group-hover:underline truncate max-w-[150px]" title={att.filename}>{att.filename}</span>
                                 <span className="text-[10px] text-win-subtext">{Math.round(att.size / 1024)} KB</span>
                              </div>
                              <Download size={14} className="text-win-subtext group-hover:text-win-text ml-auto" />
                           </div>
                        ))}
                     </div>
                  </>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
