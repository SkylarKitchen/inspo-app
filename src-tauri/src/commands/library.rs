use crate::db::Database;
use crate::AppState;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tauri::State;

/// Initialize a new library at the specified path
#[tauri::command]
pub async fn init_library(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let library_path = PathBuf::from(&path);

    // Create the library directory structure
    let inspo_dir = library_path.join(".inspo");
    let thumbnails_dir = inspo_dir.join("thumbnails");
    let inbox_dir = library_path.join("Inbox");
    let bookmarks_dir = library_path.join("_bookmarks");

    fs::create_dir_all(&thumbnails_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&inbox_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&bookmarks_dir).map_err(|e| e.to_string())?;

    // Create config.json
    let config = json!({
        "version": "1.0",
        "created_at": chrono::Utc::now().timestamp(),
        "library_name": library_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Inspo Library")
    });
    let config_path = inspo_dir.join("config.json");
    fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap())
        .map_err(|e| e.to_string())?;

    // Initialize database
    let db_path = inspo_dir.join("db.sqlite");
    let db = Database::new(&db_path).map_err(|e| e.to_string())?;

    // Store the library path in database settings
    {
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('library_path', ?1)",
            [&path],
        )
        .map_err(|e| e.to_string())?;
    }

    // Create default Inbox folder in database
    let inbox_id = uuid::Uuid::new_v4().to_string();
    {
        let conn = db.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO folders (id, name, path, sort_order) VALUES (?1, 'Inbox', 'Inbox', 0)",
            [&inbox_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Update app state
    let mut library_path_lock = state.library_path.lock().unwrap();
    *library_path_lock = Some(library_path.clone());

    let mut db_lock = state.db.lock().unwrap();
    *db_lock = Some(db);

    Ok(path)
}

/// Open an existing library
#[tauri::command]
pub async fn open_library(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let library_path = PathBuf::from(&path);
    let db_path = library_path.join(".inspo").join("db.sqlite");

    if !db_path.exists() {
        return Err("Not a valid Inspo library. Missing .inspo/db.sqlite".to_string());
    }

    let db = Database::new(&db_path).map_err(|e| e.to_string())?;

    let mut library_path_lock = state.library_path.lock().unwrap();
    *library_path_lock = Some(library_path);

    let mut db_lock = state.db.lock().unwrap();
    *db_lock = Some(db);

    Ok(path)
}

/// Get the current library path
#[tauri::command]
pub fn get_library_path(state: State<'_, AppState>) -> Option<String> {
    state
        .library_path
        .lock()
        .unwrap()
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
}

/// Check if a library is currently open
#[tauri::command]
pub fn is_library_open(state: State<'_, AppState>) -> bool {
    state.library_path.lock().unwrap().is_some()
}

/// Get library statistics
#[tauri::command]
pub fn get_library_stats(state: State<'_, AppState>) -> Result<super::LibraryStats, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // All counts should exclude trashed items (deleted_at IS NULL)
    let total_items: i32 = conn
        .query_row("SELECT COUNT(*) FROM items WHERE deleted_at IS NULL", [], |row| row.get(0))
        .unwrap_or(0);

    let total_images: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM items WHERE type = 'image' AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_bookmarks: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM items WHERE type = 'bookmark' AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_folders: i32 = conn
        .query_row("SELECT COUNT(*) FROM folders", [], |row| row.get(0))
        .unwrap_or(0);

    let total_tags: i32 = conn
        .query_row("SELECT COUNT(*) FROM tags", [], |row| row.get(0))
        .unwrap_or(0);

    let favorites_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM items WHERE is_favorited = 1 AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(super::LibraryStats {
        total_items,
        total_images,
        total_bookmarks,
        total_folders,
        total_tags,
        favorites_count,
    })
}
