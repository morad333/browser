import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileDown,
  Loader2,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import type { DownloadItem } from '../browser/types';
import { formatBytes, formatRelativeTime, getDisplayHost, isInternalUrl, resolveOmniboxInput } from '../browser/url';

interface DownloadsPanelProps {
  downloads: DownloadItem[];
  currentUrl: string;
  onStartDownload: (url: string, filename?: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (item: DownloadItem) => void;
  onSaveAgain: (item: DownloadItem) => void;
  onRemoveDownload: (id: string) => void;
  onClearFinished: () => void;
}

export function DownloadsPanel({
  downloads,
  currentUrl,
  onStartDownload,
  onCancelDownload,
  onRetryDownload,
  onSaveAgain,
  onRemoveDownload,
  onClearFinished,
}: DownloadsPanelProps) {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const hasFinished = downloads.some((d) => d.status !== 'downloading');
  const canDownloadCurrent = Boolean(currentUrl && !isInternalUrl(currentUrl));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) {
      setErrorMsg('Enter a URL to download.');
      return;
    }
    const resolved = resolveOmniboxInput(raw);
    if (resolved.isSearch) {
      setErrorMsg('Enter a valid http(s) file or page URL.');
      return;
    }
    setErrorMsg('');
    setUrlInput('');
    onStartDownload(resolved.url);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2.5 space-y-2 border-b border-zinc-200/80 dark:border-[#23262C]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-[#ECEEF2]">Downloads</h2>
          {hasFinished && (
            <button
              type="button"
              onClick={onClearFinished}
              className="h-7 px-2 rounded-md text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-[#22252C] transition-colors cursor-pointer"
            >
              Clear finished
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="download-url-input" className="sr-only">
              File or page URL to download
            </label>
            <input
              id="download-url-input"
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Paste URL to download..."
              className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs font-mono text-zinc-900 dark:text-[#ECEEF2] placeholder:text-zinc-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
            />
            <button
              type="submit"
              aria-label="Start download"
              className="h-8 px-2.5 rounded-md bg-[#2563EB] dark:bg-[#4C8BF5] hover:bg-[#1D4ED8] dark:hover:bg-[#3B7BE3] text-white text-xs font-medium inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <Download size={13} />
            </button>
          </div>
          {errorMsg && (
            <p className="text-[11px] text-red-600 dark:text-red-400">{errorMsg}</p>
          )}
        </form>

        {canDownloadCurrent && (
          <button
            type="button"
            onClick={() => onStartDownload(currentUrl)}
            className="w-full h-7 px-2.5 rounded-md bg-white dark:bg-[#191B1F] hover:bg-zinc-50 dark:hover:bg-[#22252C] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-700 dark:text-zinc-300 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileDown size={13} aria-hidden="true" />
            <span className="truncate">Save current page ({getDisplayHost(currentUrl)})</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {downloads.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Downloaded files and saved pages appear here.
          </div>
        ) : (
          downloads.map((item) => {
            const pct =
              item.totalBytes && item.totalBytes > 0
                ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100))
                : null;

            return (
              <div
                key={item.id}
                className="p-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200/80 dark:border-[#272A30] space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-zinc-900 dark:text-[#ECEEF2] truncate">
                      {item.filename}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-mono">
                      {getDisplayHost(item.url)}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {item.status === 'downloading' ? (
                      <button
                        type="button"
                        onClick={() => onCancelDownload(item.id)}
                        aria-label={`Cancel download ${item.filename}`}
                        title="Cancel"
                        className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <>
                        {item.status === 'completed' && item.blobUrl && (
                          <button
                            type="button"
                            onClick={() => onSaveAgain(item)}
                            aria-label={`Save ${item.filename} again`}
                            title="Save file"
                            className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                          >
                            <Download size={12} />
                          </button>
                        )}
                        {(item.status === 'failed' || item.status === 'cancelled') && (
                          <button
                            type="button"
                            onClick={() => onRetryDownload(item)}
                            aria-label={`Retry download ${item.filename}`}
                            title="Retry"
                            className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                          >
                            <RotateCw size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveDownload(item.id)}
                          aria-label={`Remove ${item.filename} from downloads`}
                          title="Remove"
                          className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {item.status === 'downloading' && (
                  <div className="h-1 w-full rounded-full bg-zinc-200 dark:bg-[#272A30] overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] dark:bg-[#4C8BF5] transition-all duration-150"
                      style={{ width: pct !== null ? `${pct}%` : '40%' }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {item.status === 'downloading' && (
                      <>
                        <Loader2 size={11} className="animate-spin text-[#4C8BF5]" aria-hidden="true" />
                        <span>
                          {formatBytes(item.receivedBytes)}
                          {item.totalBytes ? ` / ${formatBytes(item.totalBytes)}` : ''}
                        </span>
                      </>
                    )}
                    {item.status === 'completed' && (
                      <>
                        <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Done · {formatBytes(item.receivedBytes || item.totalBytes)}</span>
                      </>
                    )}
                    {item.status === 'failed' && (
                      <>
                        <AlertCircle size={11} className="text-red-500" aria-hidden="true" />
                        <span className="text-red-600 dark:text-red-400 truncate max-w-[140px]">
                          {item.error || 'Failed'}
                        </span>
                      </>
                    )}
                    {item.status === 'cancelled' && <span>Cancelled</span>}
                  </span>
                  <span>{formatRelativeTime(item.completedAt ?? item.startedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
