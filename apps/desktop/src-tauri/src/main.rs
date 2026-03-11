#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

const OVERLAY_LABEL: &str = "overlay";

fn ensure_overlay_window(app: &tauri::AppHandle) -> Result<(), String> {
    if app.get_webview_window(OVERLAY_LABEL).is_some() {
        return Ok(());
    }

    WebviewWindowBuilder::new(
        app,
        OVERLAY_LABEL,
        WebviewUrl::App("index.html?overlay=1".into()),
    )
    .title("AI Coach Overlay")
    .decorations(false)
    .always_on_top(true)
    .transparent(true)
    .resizable(true)
    .skip_taskbar(true)
    .visible(false)
    .inner_size(420.0, 180.0)
    .position(1450.0, 80.0)
    .build()
    .map_err(|err| format!("failed to create overlay: {err}"))?;

    Ok(())
}

#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) -> Result<(), String> {
    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "overlay window not found".to_string())?;

    if overlay.is_visible().map_err(|e| e.to_string())? {
        overlay.hide().map_err(|e| e.to_string())?;
    } else {
        overlay.show().map_err(|e| e.to_string())?;
        overlay.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn set_overlay_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    let overlay = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "overlay window not found".to_string())?;

    overlay
        .emit("overlay:update", text)
        .map_err(|err| format!("failed to emit overlay update: {err}"))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            ensure_overlay_window(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![toggle_overlay, set_overlay_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
