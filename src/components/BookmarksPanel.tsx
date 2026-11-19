import { useMemo, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { BookmarkItem } from '../browser/types';
import { getDisplayHost, resolveOmniboxInput } from '../browser/url';
import { Favicon } from './Favicon';

interface BookmarksPanelProps {
  bookmarks: BookmarkItem[];
  currentUrl: string;
  currentTitle: string;
  onOpenUrl: (url: string) => void;
  onOpenInNewTab: (url: string) => void;
  onAddBookmark: (item: { title: string; url: string; folder: string }) => void;
  onUpdateBookmark: (id: string, updates: { title: string; url: string; folder: string }) => void;
  onDeleteBookmark: (id: string) => void;
}

export function BookmarksPanel({
  bookmarks,
  currentUrl,
  currentTitle,
  onOpenUrl,
  onOpenInNewTab,
  onAddBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
}: BookmarksPanelProps) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newFolder, setNewFolder] = useState('Favorites');
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editFolder, setEditFolder] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.folder.toLowerCase().includes(q)
    );
  }, [bookmarks, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, BookmarkItem[]>();
    for (const bm of filtered) {
      const folder = bm.folder || 'Favorites';
      const list = map.get(folder) ?? [];
      list.push(bm);
      map.set(folder, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleOpenAddForm = () => {
    setFormError('');
    if (currentUrl && !currentUrl.startsWith('velo://')) {
      setNewTitle(currentTitle || getDisplayHost(currentUrl));
      setNewUrl(currentUrl);
    } else {
      setNewTitle('');
      setNewUrl('');
    }
    setNewFolder('Favorites');
    setShowAddForm(true);
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const rawUrl = newUrl.trim();
    if (!rawUrl) {
      setFormError('Enter a website URL.');
      return;
    }
    const resolved = resolveOmniboxInput(rawUrl);
    if (resolved.isSearch) {
      setFormError('Enter a valid web address (e.g. https://example.com).');
      return;
    }
    onAddBookmark({
      title: newTitle.trim() || getDisplayHost(resolved.url),
      url: resolved.url,
      folder: newFolder.trim() || 'Favorites',
    });
    setShowAddForm(false);
    setNewTitle('');
    setNewUrl('');
    setFormError('');
  };

  const startEditing = (bm: BookmarkItem) => {
    setEditingId(bm.id);
    setEditTitle(bm.title);
    setEditUrl(bm.url);
    setEditFolder(bm.folder);
  };

  const commitEdit = (id: string) => {
    const rawUrl = editUrl.trim();
    if (!rawUrl) return;
    const resolved = resolveOmniboxInput(rawUrl);
    onUpdateBookmark(id, {
      title: editTitle.trim() || getDisplayHost(resolved.url),
      url: resolved.isSearch ? rawUrl : resolved.url,
      folder: editFolder.trim() || 'Favorites',
    });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2.5 space-y-2 border-b border-zinc-200/80 dark:border-[#23262C]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-900 dark:text-[#ECEEF2]">Bookmarks</h2>
          <button
            type="button"
            onClick={() => (showAddForm ? setShowAddForm(false) : handleOpenAddForm())}
            aria-label={showAddForm ? 'Cancel adding bookmark' : 'Add bookmark'}
            className="h-7 px-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-[#22252C] inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showAddForm ? <X size={13} /> : <Plus size={13} />}
            <span>{showAddForm ? 'Cancel' : 'Add'}</span>
          </button>
        </div>

        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <label htmlFor="bookmarks-search" className="sr-only">
            Filter bookmarks
          </label>
          <input
            id="bookmarks-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter bookmarks"
            className="w-full h-8 pl-8 pr-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2] placeholder:text-zinc-400 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
          />
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#2A2D35] space-y-2"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              aria-label="Bookmark title"
              className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setFormError('');
              }}
              placeholder="https://example.com"
              aria-label="Bookmark URL"
              className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs font-mono text-zinc-900 dark:text-[#ECEEF2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
            />
            <input
              type="text"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="Folder (e.g. Favorites)"
              aria-label="Bookmark folder"
              className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
            />
            {formError && (
              <p className="text-[11px] text-red-600 dark:text-red-400">{formError}</p>
            )}
            <button
              type="submit"
              className="w-full h-7 rounded bg-[#2563EB] dark:bg-[#4C8BF5] hover:bg-[#1D4ED8] dark:hover:bg-[#3B7BE3] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Save bookmark
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {grouped.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              {search ? 'No matching bookmarks.' : 'No bookmarks saved yet.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="text-xs font-medium text-[#2563EB] dark:text-[#4C8BF5] hover:underline cursor-pointer"
              >
                Add your first bookmark
              </button>
            )}
          </div>
        ) : (
          grouped.map(([folder, items]) => (
            <div key={folder} className="space-y-0.5">
              <div className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                <span>{folder}</span>
                <span className="tabular-nums text-zinc-600 dark:text-zinc-400">{items.length}</span>
              </div>
              {items.map((bm) =>
                editingId === bm.id ? (
                  <div
                    key={bm.id}
                    className="p-2 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#2E323B] space-y-1.5"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      aria-label="Edit bookmark title"
                      className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2]"
                    />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      aria-label="Edit bookmark URL"
                      className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs font-mono text-zinc-900 dark:text-[#ECEEF2]"
                    />
                    <input
                      type="text"
                      value={editFolder}
                      onChange={(e) => setEditFolder(e.target.value)}
                      aria-label="Edit bookmark folder"
                      className="w-full h-7 px-2 rounded bg-zinc-50 dark:bg-[#131518] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2]"
                    />
                    <div className="flex items-center justify-end gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-6 px-2 rounded text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#23262C] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => commitEdit(bm.id)}
                        className="h-6 px-2 rounded bg-[#2563EB] dark:bg-[#4C8BF5] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={11} />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={bm.id}
                    className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-zinc-200/60 dark:hover:bg-[#1B1D22] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenUrl(bm.url)}
                      className="flex-1 min-w-0 flex items-center gap-2 py-0.5 px-1 text-left cursor-pointer"
                    >
                      <Favicon url={bm.url} size={14} variant="tile" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-900 dark:text-[#ECEEF2] truncate">
                          {bm.title}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate font-mono">
                          {getDisplayHost(bm.url)}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onOpenInNewTab(bm.url)}
                        aria-label={`Open bookmark ${bm.title} in new tab`}
                        title="Open in new tab"
                        className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(bm)}
                        aria-label={`Edit bookmark ${bm.title}`}
                        title="Edit"
                        className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBookmark(bm.id)}
                        aria-label={`Delete bookmark ${bm.title}`}
                        title="Delete"
                        className="h-6 w-6 rounded inline-flex items-center justify-center text-zinc-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
