import { useState, type FormEvent } from 'react';
import { Check, Download, Moon, Sun } from 'lucide-react';
import type { BrowserSettings, LayoutMode, SearchEngineId, ThemeMode } from '../browser/types';
import { INTERNAL_NEW_TAB_URL, SEARCH_ENGINES } from '../browser/url';

interface SettingsPanelProps {
  settings: BrowserSettings;
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
  onClearHistory: () => void;
  onClearDownloads: () => void;
}

const SHORTCUTS = [
  { keys: 'Alt + T', action: 'New tab' },
  { keys: 'Alt + W', action: 'Close active tab' },
  { keys: 'Alt + Shift + T', action: 'Reopen closed tab' },
  { keys: 'Alt + L', action: 'Focus address bar' },
  { keys: 'Alt + B', action: 'Toggle sidebar' },
  { keys: 'Alt + P', action: 'Toggle private mode' },
  { keys: 'Alt + D', action: 'Bookmark current page' },
  { keys: 'Alt + R', action: 'Reload current tab' },
  { keys: 'Alt + Left / Right', action: 'Back / Forward' },
  { keys: 'Alt + 1–9', action: 'Switch to tab 1–9' },
];

export function SettingsPanel({
  settings,
  onUpdateSettings,
  onClearHistory,
  onClearDownloads,
}: SettingsPanelProps) {
  const [homepageDraft, setHomepageDraft] = useState(settings.homepage);
  const [savedFlag, setSavedFlag] = useState(false);
  const [clearedMsg, setClearedMsg] = useState('');

  const handleHomepageSave = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = homepageDraft.trim() || INTERNAL_NEW_TAB_URL;
    onUpdateSettings({ homepage: cleaned });
    setHomepageDraft(cleaned);
    setSavedFlag(true);
    window.setTimeout(() => setSavedFlag(false), 1600);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b border-zinc-200/80 dark:border-[#23262C]">
        <h2 className="text-xs font-semibold text-zinc-900 dark:text-[#ECEEF2]">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        {/* Theme */}
        <section className="space-y-2">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">Appearance</div>
          <div
            role="group"
            aria-label="Theme selection"
            className="grid grid-cols-2 gap-1 p-1 rounded-md bg-zinc-200/70 dark:bg-[#191B1F] border border-zinc-200 dark:border-[#262930]"
          >
            {(['dark', 'light'] as ThemeMode[]).map((mode) => {
              const active = settings.theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ theme: mode })}
                  aria-pressed={active}
                  className={`h-7 rounded flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#262932] text-zinc-900 dark:text-[#ECEEF2]'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {mode === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                  <span className="capitalize">{mode}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Layout Mode */}
        <section className="space-y-2">
          <div className="font-medium text-zinc-800 dark:text-zinc-200">Window Layout</div>
          <div
            role="group"
            aria-label="Layout selection"
            className="grid grid-cols-2 gap-1 p-1 rounded-md bg-zinc-200/70 dark:bg-[#191B1F] border border-zinc-200 dark:border-[#262930]"
          >
            {(['compact', 'floating'] as LayoutMode[]).map((mode) => {
              const active = settings.layout === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ layout: mode })}
                  aria-pressed={active}
                  className={`h-7 rounded text-xs font-medium transition-colors cursor-pointer capitalize ${
                    active
                      ? 'bg-white dark:bg-[#262932] text-zinc-900 dark:text-[#ECEEF2]'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Compact maximizes edge-to-edge space; Floating frames the viewport with subtle separation.
          </p>
        </section>

        {/* Collapsed Sidebar Behavior */}
        <section className="space-y-2">
          <div className="font-medium text-zinc-800 dark:text-zinc-200">When Sidebar Is Collapsed</div>
          <div
            role="group"
            aria-label="Collapsed sidebar behavior"
            className="grid grid-cols-3 gap-1 p-1 rounded-md bg-zinc-200/70 dark:bg-[#191B1F] border border-zinc-200 dark:border-[#262930]"
          >
            {(
              [
                { id: 'icon-rail', label: 'Icon rail' },
                { id: 'hover-expand', label: 'Hover' },
                { id: 'top-bar', label: 'Top bar' },
              ] as const
            ).map((option) => {
              const active = settings.collapsedSidebarMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdateSettings({ collapsedSidebarMode: option.id })}
                  aria-pressed={active}
                  className={`h-7 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-[#262932] text-zinc-900 dark:text-[#ECEEF2]'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {settings.collapsedSidebarMode === 'icon-rail' &&
              'Shows clickable vertical tab favicons with close buttons on the left rail.'}
            {settings.collapsedSidebarMode === 'hover-expand' &&
              'Hides the sidebar completely and slides it open when your pointer hits the left edge.'}
            {settings.collapsedSidebarMode === 'top-bar' &&
              'Hides the left sidebar and displays a horizontal tab strip along the top.'}
          </p>
        </section>

        {/* Search Engine */}
        <section className="space-y-1.5">
          <label
            htmlFor="setting-search-engine"
            className="block font-medium text-zinc-700 dark:text-zinc-300"
          >
            Default search engine
          </label>
          <select
            id="setting-search-engine"
            value={settings.searchEngine}
            onChange={(e) =>
              onUpdateSettings({ searchEngine: e.target.value as SearchEngineId })
            }
            className="w-full h-8 px-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-900 dark:text-[#ECEEF2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
          >
            {Object.values(SEARCH_ENGINES).map((engine) => (
              <option key={engine.id} value={engine.id}>
                {engine.name}
              </option>
            ))}
          </select>
        </section>

        {/* Homepage */}
        <section className="space-y-1.5">
          <label
            htmlFor="setting-homepage"
            className="block font-medium text-zinc-700 dark:text-zinc-300"
          >
            Homepage
          </label>
          <form onSubmit={handleHomepageSave} className="flex items-center gap-1.5">
            <input
              id="setting-homepage"
              type="text"
              value={homepageDraft}
              onChange={(e) => setHomepageDraft(e.target.value)}
              placeholder={INTERNAL_NEW_TAB_URL}
              className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs font-mono text-zinc-900 dark:text-[#ECEEF2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#4C8BF5]"
            />
            <button
              type="submit"
              className="h-8 px-2.5 rounded-md bg-zinc-900 dark:bg-[#262932] hover:bg-zinc-800 dark:hover:bg-[#303440] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              {savedFlag ? <Check size={12} /> : null}
              <span>{savedFlag ? 'Saved' : 'Save'}</span>
            </button>
          </form>
        </section>

        {/* Performance & Memory */}
        <section className="space-y-2.5 pt-2 border-t border-zinc-200/80 dark:border-[#23262C]">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">Memory & Tabs</div>
          <label className="flex items-start justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-zinc-800 dark:text-[#ECEEF2]">Auto-suspend idle tabs</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Unload inactive tabs beyond the active limit to keep RAM low.
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSuspendTabs}
              onChange={(e) => onUpdateSettings({ autoSuspendTabs: e.target.checked })}
              className="mt-0.5 accent-[#2563EB] dark:accent-[#4C8BF5]"
            />
          </label>

          {settings.autoSuspendTabs && (
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="setting-max-tabs"
                className="text-zinc-600 dark:text-zinc-400"
              >
                Active tabs kept in memory
              </label>
              <select
                id="setting-max-tabs"
                value={settings.maxActiveTabsInMemory}
                onChange={(e) =>
                  onUpdateSettings({ maxActiveTabsInMemory: Number(e.target.value) })
                }
                className="h-7 px-2 rounded bg-white dark:bg-[#191B1F] border border-zinc-200 dark:border-[#272A30] text-xs font-mono tabular-nums text-zinc-900 dark:text-[#ECEEF2]"
              >
                {[3, 4, 6, 8, 12].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Privacy Data */}
        <section className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-[#23262C]">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">Browsing Data</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClearHistory();
                setClearedMsg('History cleared.');
                window.setTimeout(() => setClearedMsg(''), 2000);
              }}
              className="h-7 px-2.5 rounded-md bg-white dark:bg-[#191B1F] hover:bg-zinc-100 dark:hover:bg-[#23262C] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Clear history
            </button>
            <button
              type="button"
              onClick={() => {
                onClearDownloads();
                setClearedMsg('Downloads list cleared.');
                window.setTimeout(() => setClearedMsg(''), 2000);
              }}
              className="h-7 px-2.5 rounded-md bg-white dark:bg-[#191B1F] hover:bg-zinc-100 dark:hover:bg-[#23262C] border border-zinc-200 dark:border-[#272A30] text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Clear downloads
            </button>
          </div>
          {clearedMsg && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{clearedMsg}</p>
          )}
        </section>

        {/* Windows Desktop Installer (.exe) */}
        <section className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-[#23262C]">
          <div className="font-medium text-zinc-800 dark:text-zinc-200">Desktop App (Windows x64)</div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Install Velo Browser as a native Windows desktop application with Desktop and Start Menu shortcuts.
          </p>
          <div className="flex flex-col gap-1.5">
            <a
              href="/releases/VeloBrowser-Setup-x64.exe"
              download="VeloBrowser-Setup-x64.exe"
              className="h-8 px-3 rounded-md bg-[#2563EB] dark:bg-[#4C8BF5] hover:bg-[#1D4ED8] dark:hover:bg-[#3B7BE3] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download size={13} aria-hidden="true" />
              <span>Download VeloBrowser-Setup-x64.exe</span>
            </a>
            <a
              href="/releases/VeloBrowser-Portable-x64.exe"
              download="VeloBrowser-Portable-x64.exe"
              className="h-7 px-3 rounded-md bg-white dark:bg-[#191B1F] hover:bg-zinc-100 dark:hover:bg-[#23262C] border border-zinc-200 dark:border-[#272A30] text-zinc-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download size={12} aria-hidden="true" />
              <span>Download Portable .exe</span>
            </a>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-[#23262C]">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">Keyboard Shortcuts</div>
          <dl className="space-y-1.5">
            {SHORTCUTS.map((row) => (
              <div key={row.keys} className="flex items-center justify-between gap-2 text-[11px]">
                <dt className="text-zinc-600 dark:text-zinc-400">{row.action}</dt>
                <dd className="font-mono text-zinc-800 dark:text-zinc-300">{row.keys}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
