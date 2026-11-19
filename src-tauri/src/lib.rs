use tauri::{LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};
use url::Url;

#[tauri::command]
fn open_native_tab_webview(
    app: tauri::AppHandle,
    tab_id: String,
    target_url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let parsed = Url::parse(&target_url).map_err(|e| e.to_string())?;
    let label = format!("tab-{}", tab_id);

    if let Some(existing) = app.get_webview(&label) {
        existing.navigate(parsed).map_err(|e| e.to_string())?;
        existing.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let window = app
        .get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed));
    window
        .add_child(
            builder,
            LogicalPosition::new(x, y),
            LogicalSize::new(width.max(200.0), height.max(200.0)),
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn set_native_tab_visibility(
    app: tauri::AppHandle,
    tab_id: String,
    visible: bool,
) -> Result<(), String> {
    let label = format!("tab-{}", tab_id);
    if let Some(webview) = app.get_webview(&label) {
        if visible {
            webview.show().map_err(|e| e.to_string())?;
        } else {
            webview.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn close_native_tab_webview(app: tauri::AppHandle, tab_id: String) -> Result<(), String> {
    let label = format!("tab-{}", tab_id);
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_native_tab_webview,
            set_native_tab_visibility,
            close_native_tab_webview
        ])
        .run(tauri::generate_context!())
        .expect("error while running Velo Browser");
}
