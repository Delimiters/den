use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn close_splashscreen(app: tauri::AppHandle) {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}

/// Called from JS settings to toggle whether closing the window quits or hides to tray.
#[tauri::command]
fn set_minimize_to_tray(
    value: bool,
    state: tauri::State<'_, Arc<Mutex<AppConfig>>>,
) {
    if let Ok(mut cfg) = state.lock() {
        cfg.minimize_to_tray = value;
    }
}

struct AppConfig {
    minimize_to_tray: bool,
}

fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show Den", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = Arc::new(Mutex::new(AppConfig { minimize_to_tray: true }));
    let config_for_event = Arc::clone(&config);

    // In debug builds, skip single-instance enforcement so E2E test sessions can each
    // launch their own fresh app instance without the second one immediately exiting.
    #[cfg(debug_assertions)]
    let builder = tauri::Builder::default().manage(config);
    #[cfg(not(debug_assertions))]
    let builder = tauri::Builder::default()
        .manage(config)
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            setup_tray(app.handle())?;

            let window = app.get_webview_window("main").unwrap();

            // Remove native title bar on Windows — we render custom controls in HTML
            #[cfg(target_os = "windows")]
            let _ = window.set_decorations(false);

            // Auto-grant camera and microphone permissions so getUserMedia works in WebView2.
            // Without this handler, WebView2 silently denies media requests with NotAllowedError.
            #[cfg(target_os = "windows")]
            {
                use webview2_com::{
                    Microsoft::Web::WebView2::Win32::{
                        COREWEBVIEW2_PERMISSION_KIND_CAMERA,
                        COREWEBVIEW2_PERMISSION_KIND_MICROPHONE,
                        COREWEBVIEW2_PERMISSION_STATE_ALLOW,
                    },
                    PermissionRequestedEventHandler,
                };
                let _ = window.with_webview(|wv| unsafe {
                    let controller = wv.controller();
                    if let Ok(webview) = controller.CoreWebView2() {
                        let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
                            if let Some(args) = args {
                                let mut kind = COREWEBVIEW2_PERMISSION_KIND_CAMERA; // placeholder
                                args.PermissionKind(&mut kind)?;
                                if kind == COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
                                    || kind == COREWEBVIEW2_PERMISSION_KIND_CAMERA
                                {
                                    args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
                                }
                            }
                            Ok(())
                        }));
                        let mut token: i64 = 0;
                        let _ = webview.add_PermissionRequested(&handler, &mut token);
                    }
                });
            }

            // Set AppUserModelID so Den groups correctly in Task Manager / taskbar.
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::core::w;
                use windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
                let _ = SetCurrentProcessExplicitAppUserModelID(w!("com.jake.den"));
            }

            // Minimize to tray or quit depending on user preference.
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let minimize = config_for_event
                        .lock()
                        .map(|c| c.minimize_to_tray)
                        .unwrap_or(true);
                    if minimize {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, close_splashscreen, set_minimize_to_tray])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
