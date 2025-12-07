
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Search, Filter, Loader2, Check, RefreshCw, CheckCircle2, AlertCircle, ArrowUpDown } from 'lucide-react';
import { Email, FilterType, SortOption } from '../types';

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  syncStatus?: { status: 'idle' | 'syncing' | 'error' | 'success', lastSync: string, message?: string };
  onSync?: () => void;
  emailCount?: number;
  syncProgress?: { processed: number; total: number; synced: number; currentFolder: string } | null;
  isLoading?: boolean;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  searchQuery,
  onSearchChange,
  currentFilter,
  onFilterChange,
  syncStatus,
  onSync,
  emailCount,
  syncProgress,
  isLoading
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const listRef = useRef<HTMLDivElement>(null);

  // Sort emails
  const sortedEmails = useMemo(() => {
    return [...emails].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'sender-asc':
          return a.senderName.localeCompare(b.senderName);
        case 'sender-desc':
          return b.senderName.localeCompare(a.senderName);
        case 'subject-asc':
          return a.subject.localeCompare(b.subject);
        case 'subject-desc':
          return b.subject.localeCompare(a.subject);
        default:
          return 0;
      }
    });
  }, [emails, sortOption]);

  // Simulate infinite scroll loading
  useEffect(() => {
    const handleScroll = () => {
      if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 20) {
          if (!isLoadingMore) {
            setIsLoadingMore(true);
            setTimeout(() => setIsLoadingMore(false), 2000); // Reset after 2s
          }
        }
      }
    };

    const ref = listRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => ref?.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore]);

  return (
    <div className="flex flex-col h-full bg-win-panel/30">
      {/* Search Header */}
      <div className="h-14 min-h-[56px] px-4 flex items-center border-b border-win-border bg-win-panel/80 backdrop-blur-md sticky top-0 z-10 gap-2">
        <div className="relative w-full group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-win-subtext group-focus-within:text-win-primary transition-colors" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-win-surface border border-transparent border-b-2 border-b-transparent focus:border-b-win-primary rounded-t-md px-3 py-1.5 pl-9 text-sm text-win-text placeholder-win-subtext focus:outline-none focus:bg-win-surface transition-colors shadow-sm"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          {isSortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-40 bg-win-surface border border-win-border rounded-xl shadow-win-elevation p-1 z-20 animate-win-open">
                {[
                  { id: 'date-desc', label: 'Newest' },
                  { id: 'date-asc', label: 'Oldest' },
                  { id: 'sender-asc', label: 'Sender (A-Z)' },
                  { id: 'sender-desc', label: 'Sender (Z-A)' },
                  { id: 'subject-asc', label: 'Subject (A-Z)' },
                  { id: 'subject-desc', label: 'Subject (Z-A)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortOption(opt.id as SortOption); setIsSortOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-win-text hover:bg-win-surface-hover transition-colors"
                  >
                    <span>{opt.label}</span>
                    {sortOption === opt.id && <Check size={14} className="text-win-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className={`p-1.5 rounded-md transition-colors ${isSortOpen ? 'text-win-primary bg-win-surface-active' : 'text-win-subtext hover:text-win-text hover:bg-win-surface-hover'}`}
            title="Sort"
          >
            <ArrowUpDown size={16} />
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-40 bg-win-surface border border-win-border rounded-xl shadow-win-elevation p-1 z-20 animate-win-open">
                {(['all', 'unread', 'starred'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { onFilterChange(type); setIsFilterOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-win-text hover:bg-win-surface-hover transition-colors capitalize"
                  >
                    <span>{type}</span>
                    {currentFilter === type && <Check size={14} className="text-win-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-1.5 rounded-md transition-colors ${isFilterOpen || currentFilter !== 'all' ? 'text-win-primary bg-win-surface-active' : 'text-win-subtext hover:text-win-text hover:bg-win-surface-hover'}`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Sync Progress Bar */}
      {syncProgress && syncProgress.total > 0 && (
        <div className="px-4 py-2 bg-win-surface border-b border-win-border">
          <div className="flex items-center justify-between text-xs text-win-subtext mb-1">
            <span className="capitalize">{syncProgress.currentFolder || 'Syncing'}</span>
            <span>{syncProgress.processed}/{syncProgress.total} ({syncProgress.synced} new)</span>
          </div>
          <div className="h-1.5 bg-win-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-win-primary transition-all duration-300 ease-out"
              style={{ width: `${(syncProgress.processed / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Email List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar pb-4"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-win-subtext">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-sm">Loading emails...</span>
          </div>
        ) : sortedEmails.length === 0 ? (
          <div className="p-8 text-center text-win-subtext text-sm">
            {searchQuery ? 'No emails found matching your search.' : 'No emails found.'}
          </div>
        ) : (
          sortedEmails.map(email => {
            const isSelected = selectedEmailId === email.id;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`
                  relative px-4 py-3 mb-1 cursor-pointer rounded-md transition-all duration-150 ease-micro border border-transparent group
                  ${isSelected
                    ? 'bg-win-surface-active border-l-[3px] border-l-win-primary shadow-sm'
                    : 'hover:bg-win-surface-hover border-l-[3px] border-l-transparent'}
                  ${email.isNew ? 'animate-slide-in-right bg-win-primary/5' : ''}
                `}
              >
                {email.isNew && (
                  <div className="absolute right-2 top-2 w-2 h-2 bg-win-primary rounded-full animate-pulse shadow-sm" title="New Email"></div>
                )}
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm truncate pr-2 ${!email.read ? 'font-bold text-win-text' : 'font-medium text-win-text/90'}`}>
                    {email.senderName}
                  </h3>
                  <span className={`text-[10px] whitespace-nowrap flex-shrink-0 ${isSelected ? 'text-win-text' : 'text-win-subtext'}`}>
                    {email.timestamp}
                  </span>
                </div>

                <div className={`text-xs mb-1 truncate ${!email.read ? 'font-semibold text-win-primary' : 'text-win-subtext group-hover:text-win-text transition-colors'}`}>
                  {email.subject}
                </div>

                <p className="text-[11px] truncate leading-relaxed text-win-muted">
                  {email.preview}
                </p>
              </div>
            );
          })
        )}

        {/* Skeleton Loader at bottom */}
        {isLoadingMore && (
          <div className="space-y-2 mt-2 px-1 animate-pulse-fluent">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-md bg-win-surface-hover border border-win-border p-3">
                <div className="flex justify-between mb-2">
                  <div className="h-3 w-24 bg-win-border rounded"></div>
                  <div className="h-3 w-8 bg-win-border rounded"></div>
                </div>
                <div className="h-3 w-3/4 bg-win-border rounded mb-2"></div>
                <div className="h-2 w-1/2 bg-win-border-active rounded"></div>
              </div>
            ))}
            <div className="text-center text-xs text-win-muted pt-2">Loading more...</div>
          </div>
        )}
      </div>

      {/* Sync Status Bar */}
      <div className="h-8 min-h-[32px] bg-win-surface border-t border-win-border flex items-center justify-between px-3 text-[11px] text-win-subtext select-none">
        <div className="flex items-center gap-2">
          <span>{emailCount !== undefined ? `${emailCount} messages` : ''}</span>
        </div>

        <div className="flex items-center gap-2">
          {syncStatus?.status === 'syncing' && (
            <span className="text-win-primary flex items-center gap-1.5">
              {syncStatus.message || 'Syncing...'}
            </span>
          )}
          {syncStatus?.status === 'error' && (
            <span className="text-red-500 flex items-center gap-1.5">
              {syncStatus.message || 'Sync Error'}
            </span>
          )}
          {syncStatus?.status === 'success' && (
            <span className="text-green-600 flex items-center gap-1.5">
              {syncStatus.message || 'Up to date'}
            </span>
          )}
          {(!syncStatus || syncStatus.status === 'idle') && (
            <span>Up to date</span>
          )}

          <button
            onClick={onSync}
            className={`p-1 hover:bg-win-surface-hover rounded transition-colors ${syncStatus?.status === 'syncing' ? 'animate-spin text-win-primary' : ''}`}
            title="Sync Now"
          >
            <RefreshCw size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};
