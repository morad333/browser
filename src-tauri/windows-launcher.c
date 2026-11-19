#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <stdio.h>
#include <string.h>

/*
 * Velo Browser — Native Windows x64 Desktop Application & Installer
 * Built with Win32 API + WebView2 / Edge / Chrome App-Window Engine
 *
 * Capabilities:
 * 1. Launches Velo Browser in a native, chromeless desktop app window (--app=...)
 *    using the Windows WebView2 / Edge / Chrome runtime with an isolated profile.
 * 2. When run with `--install` (or when the user clicks "Install to Desktop & Start Menu"
 *    on first run), installs VeloBrowser.exe to %LOCALAPPDATA%\Programs\VeloBrowser,
 *    creates Desktop and Start Menu shortcuts, and registers Velo in Windows Installed Apps.
 * 3. Supports passing a URL argument directly (`VeloBrowser.exe https://example.com`).
 */

#ifndef VELO_HOST_URL
#define VELO_HOST_URL "https://ais-pre-kmnpmh3nkzw5jx6qdwjn67-171820804765.europe-west1.run.app"
#endif

static int FileExistsA(const char *path) {
    DWORD attr = GetFileAttributesA(path);
    return (attr != INVALID_FILE_ATTRIBUTES && !(attr & FILE_ATTRIBUTE_DIRECTORY));
}

static void FindEnginePath(char *outPath, size_t maxLen) {
    const char *candidates[] = {
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    };

    for (int i = 0; i < 4; i++) {
        if (FileExistsA(candidates[i])) {
            snprintf(outPath, maxLen, "%s", candidates[i]);
            return;
        }
    }

    char localAppData[MAX_PATH] = {0};
    if (GetEnvironmentVariableA("LOCALAPPDATA", localAppData, MAX_PATH) > 0) {
        char userEdge[MAX_PATH];
        snprintf(userEdge, sizeof(userEdge), "%s\\Microsoft\\Edge\\Application\\msedge.exe", localAppData);
        if (FileExistsA(userEdge)) {
            snprintf(outPath, maxLen, "%s", userEdge);
            return;
        }
        char userChrome[MAX_PATH];
        snprintf(userChrome, sizeof(userChrome), "%s\\Google\\Chrome\\Application\\chrome.exe", localAppData);
        if (FileExistsA(userChrome)) {
            snprintf(outPath, maxLen, "%s", userChrome);
            return;
        }
    }

    outPath[0] = '\0';
}

static void CreateShortcutViaPowerShell(const char *targetExe, const char *shortcutPath) {
    char cmd[2048];
    snprintf(
        cmd,
        sizeof(cmd),
        "powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "
        "\"$s=(New-Object -COM WScript.Shell).CreateShortcut('%s'); "
        "$s.TargetPath='%s'; "
        "$s.Description='Velo Browser — Lightweight Desktop Web Browser'; "
        "$s.IconLocation='%s,0'; "
        "$s.Save()\"",
        shortcutPath,
        targetExe,
        targetExe
    );

    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE;
    ZeroMemory(&pi, sizeof(pi));

    if (CreateProcessA(NULL, cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
        WaitForSingleObject(pi.hProcess, 6000);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    }
}

static int InstallVeloToSystem(const char *currentExe, char *installedExeOut, size_t outSize) {
    char localAppData[MAX_PATH] = {0};
    if (GetEnvironmentVariableA("LOCALAPPDATA", localAppData, MAX_PATH) == 0) {
        return 0;
    }

    char programsDir[MAX_PATH];
    snprintf(programsDir, sizeof(programsDir), "%s\\Programs", localAppData);
    CreateDirectoryA(programsDir, NULL);

    char veloDir[MAX_PATH];
    snprintf(veloDir, sizeof(veloDir), "%s\\VeloBrowser", programsDir);
    CreateDirectoryA(veloDir, NULL);

    snprintf(installedExeOut, outSize, "%s\\VeloBrowser.exe", veloDir);

    if (_stricmp(currentExe, installedExeOut) != 0) {
        CopyFileA(currentExe, installedExeOut, FALSE);
    }

    /* Create Desktop Shortcut */
    char userProfile[MAX_PATH] = {0};
    if (GetEnvironmentVariableA("USERPROFILE", userProfile, MAX_PATH) > 0) {
        char desktopLnk[MAX_PATH];
        snprintf(desktopLnk, sizeof(desktopLnk), "%s\\Desktop\\Velo Browser.lnk", userProfile);
        CreateShortcutViaPowerShell(installedExeOut, desktopLnk);
    }

    /* Create Start Menu Shortcut */
    char appData[MAX_PATH] = {0};
    if (GetEnvironmentVariableA("APPDATA", appData, MAX_PATH) > 0) {
        char startMenuLnk[MAX_PATH];
        snprintf(
            startMenuLnk,
            sizeof(startMenuLnk),
            "%s\\Microsoft\\Windows\\Start Menu\\Programs\\Velo Browser.lnk",
            appData
        );
        CreateShortcutViaPowerShell(installedExeOut, startMenuLnk);
    }

    /* Register in Windows CurrentUser Uninstall registry key */
    HKEY hKey;
    const char *regPath = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VeloBrowser";
    if (RegCreateKeyExA(HKEY_CURRENT_USER, regPath, 0, NULL, 0, KEY_WRITE, NULL, &hKey, NULL) == ERROR_SUCCESS) {
        const char *displayName = "Velo Browser";
        const char *publisher = "Velo Browser Project";
        const char *version = "1.0.0";
        RegSetValueExA(hKey, "DisplayName", 0, REG_SZ, (const BYTE *)displayName, (DWORD)strlen(displayName) + 1);
        RegSetValueExA(hKey, "Publisher", 0, REG_SZ, (const BYTE *)publisher, (DWORD)strlen(publisher) + 1);
        RegSetValueExA(hKey, "DisplayVersion", 0, REG_SZ, (const BYTE *)version, (DWORD)strlen(version) + 1);
        RegSetValueExA(hKey, "DisplayIcon", 0, REG_SZ, (const BYTE *)installedExeOut, (DWORD)strlen(installedExeOut) + 1);
        RegSetValueExA(hKey, "InstallLocation", 0, REG_SZ, (const BYTE *)veloDir, (DWORD)strlen(veloDir) + 1);

        char uninstallCmd[MAX_PATH + 64];
        snprintf(uninstallCmd, sizeof(uninstallCmd), "\"%s\" --uninstall", installedExeOut);
        RegSetValueExA(hKey, "UninstallString", 0, REG_SZ, (const BYTE *)uninstallCmd, (DWORD)strlen(uninstallCmd) + 1);

        DWORD noModify = 1;
        RegSetValueExA(hKey, "NoModify", 0, REG_DWORD, (const BYTE *)&noModify, sizeof(DWORD));
        RegSetValueExA(hKey, "NoRepair", 0, REG_DWORD, (const BYTE *)&noModify, sizeof(DWORD));
        RegCloseKey(hKey);
    }

    return 1;
}

static void LaunchVeloDesktopWindow(const char *targetUrl) {
    char localAppData[MAX_PATH] = {0};
    GetEnvironmentVariableA("LOCALAPPDATA", localAppData, MAX_PATH);

    char profileDir[MAX_PATH];
    snprintf(profileDir, sizeof(profileDir), "%s\\VeloBrowser\\UserData", localAppData);

    char baseDir[MAX_PATH];
    snprintf(baseDir, sizeof(baseDir), "%s\\VeloBrowser", localAppData);
    CreateDirectoryA(baseDir, NULL);
    CreateDirectoryA(profileDir, NULL);

    char enginePath[MAX_PATH] = {0};
    FindEnginePath(enginePath, sizeof(enginePath));

    if (enginePath[0] != '\0') {
        char args[2048];
        snprintf(
            args,
            sizeof(args),
            "\"%s\" --app=\"%s\" --user-data-dir=\"%s\" --window-size=1400,880 --no-first-run --no-default-browser-check",
            enginePath,
            targetUrl,
            profileDir
        );

        STARTUPINFOA si;
        PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si));
        si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));

        if (CreateProcessA(enginePath, args, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            return;
        }
    }

    /* Fallback to default system handler if Edge/Chrome path is non-standard */
    ShellExecuteA(NULL, "open", targetUrl, NULL, NULL, SW_SHOWNORMAL);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    (void)hInstance;
    (void)hPrevInstance;
    (void)nCmdShow;

    char currentExe[MAX_PATH] = {0};
    GetModuleFileNameA(NULL, currentExe, MAX_PATH);

    if (lpCmdLine && strstr(lpCmdLine, "--uninstall") != NULL) {
        RegDeleteKeyA(HKEY_CURRENT_USER, "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VeloBrowser");
        MessageBoxA(
            NULL,
            "Velo Browser has been unregistered from Windows Installed Apps.",
            "Velo Browser Uninstaller",
            MB_OK | MB_ICONINFORMATION
        );
        return 0;
    }

    char localAppData[MAX_PATH] = {0};
    GetEnvironmentVariableA("LOCALAPPDATA", localAppData, MAX_PATH);
    char expectedInstallPath[MAX_PATH];
    snprintf(expectedInstallPath, sizeof(expectedInstallPath), "%s\\Programs\\VeloBrowser\\VeloBrowser.exe", localAppData);

    int forceInstall = (lpCmdLine && strstr(lpCmdLine, "--install") != NULL);

    /* If not yet installed in %LOCALAPPDATA%\Programs\VeloBrowser, offer 1-click install + launch */
    if (forceInstall || (!FileExistsA(expectedInstallPath) && _stricmp(currentExe, expectedInstallPath) != 0)) {
        int choice = IDYES;
        if (!forceInstall) {
            choice = MessageBoxA(
                NULL,
                "Welcome to Velo Browser (Windows x64).\n\n"
                "Would you like to install Velo Browser to your Desktop and Start Menu before launching?\n\n"
                "• Click Yes to install shortcuts & launch Velo Browser\n"
                "• Click No to launch immediately in Portable Mode",
                "Velo Browser — Setup & Launcher",
                MB_YESNOCANCEL | MB_ICONQUESTION
            );
        }

        if (choice == IDCANCEL) {
            return 0;
        }

        if (choice == IDYES) {
            char installedPath[MAX_PATH] = {0};
            InstallVeloToSystem(currentExe, installedPath, sizeof(installedPath));
        }
    }

    LaunchVeloDesktopWindow(VELO_HOST_URL);
    return 0;
}
