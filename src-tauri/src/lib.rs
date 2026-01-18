mod commands;
mod db;

use db::Database;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Option<Database>>,
    pub library_path: Mutex<Option<PathBuf>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            db: Mutex::new(None),
            library_path: Mutex::new(None),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            // Library commands
            commands::library::init_library,
            commands::library::open_library,
            commands::library::get_library_path,
            commands::library::is_library_open,
            commands::library::get_library_stats,
            // Item commands
            commands::items::get_items,
            commands::items::get_item,
            commands::items::update_item,
            commands::items::delete_item,
            commands::items::toggle_favorite,
            commands::items::move_items_to_folder,
            commands::items::delete_items,
            // Folder commands
            commands::folders::get_folders,
            commands::folders::create_folder,
            commands::folders::rename_folder,
            commands::folders::delete_folder,
            commands::folders::reorder_folders,
            // Tag commands
            commands::tags::get_tags,
            commands::tags::create_tag,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::tags::add_tags_to_item,
            commands::tags::remove_tags_from_item,
            commands::tags::set_item_tags,
            commands::tags::get_item_tags,
            // Import commands
            commands::import::import_image,
            commands::import::import_images,
            commands::import::import_bookmark,
            commands::import::fetch_bookmark_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
