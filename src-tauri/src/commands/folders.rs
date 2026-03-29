use crate::AppState;
use rusqlite::params;
use std::fs;
use std::path::Path;
use tauri::State;

use super::Folder;

/// Sanitize a folder name to prevent path traversal attacks.
/// Removes path separators and parent directory references.
fn sanitize_folder_name(name: &str) -> Result<String, String> {
    // Reject empty names
    if name.trim().is_empty() {
        return Err("Folder name cannot be empty".to_string());
    }

    // Reject names that are just dots
    if name == "." || name == ".." {
        return Err("Invalid folder name".to_string());
    }

    // Check for path separators or null bytes
    if name.contains('/') || name.contains('\\') || name.contains('\0') {
        return Err("Folder name cannot contain path separators".to_string());
    }

    // Check for parent directory references anywhere in the name
    if name.contains("..") {
        return Err("Folder name cannot contain '..'".to_string());
    }

    Ok(name.to_string())
}

/// Validate that a path stays within the library directory.
/// Returns the validated full path if safe, or an error if path escapes.
fn validate_path_within_library(library_path: &Path, relative_path: &str) -> Result<std::path::PathBuf, String> {
    let full_path = library_path.join(relative_path);

    // Canonicalize both paths for comparison
    // Note: The full_path may not exist yet, so we canonicalize the parent
    let canonical_library = library_path.canonicalize()
        .map_err(|e| format!("Failed to resolve library path: {}", e))?;

    // For new paths that don't exist, we check each component
    let mut check_path = canonical_library.clone();
    for component in Path::new(relative_path).components() {
        use std::path::Component;
        match component {
            Component::Normal(name) => {
                check_path = check_path.join(name);
            }
            Component::ParentDir => {
                return Err("Path cannot contain parent directory references".to_string());
            }
            Component::CurDir => {
                // Current directory reference is okay
            }
            _ => {
                return Err("Invalid path component".to_string());
            }
        }
    }

    // Verify the constructed path is still under the library
    if !check_path.starts_with(&canonical_library) {
        return Err("Path escapes library directory".to_string());
    }

    Ok(full_path)
}

/// Get all folders as a tree structure
#[tauri::command]
pub fn get_folders(state: State<'_, AppState>) -> Result<Vec<Folder>, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT f.id, f.name, f.parent_id, f.path, f.sort_order, f.created_at, f.updated_at,
                    (SELECT COUNT(*) FROM items WHERE folder_id = f.id) as item_count
             FROM folders f
             ORDER BY f.sort_order, f.name",
        )
        .map_err(|e| e.to_string())?;

    let folders: Vec<Folder> = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                path: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                children: Vec::new(),
                item_count: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Build tree structure
    let tree = build_folder_tree(folders);
    Ok(tree)
}

fn build_folder_tree(folders: Vec<Folder>) -> Vec<Folder> {
    use std::collections::HashMap;

    let mut folder_map: HashMap<String, Folder> = HashMap::new();
    let mut root_ids: Vec<String> = Vec::new();

    // First pass: collect all folders
    for folder in folders {
        if folder.parent_id.is_none() {
            root_ids.push(folder.id.clone());
        }
        folder_map.insert(folder.id.clone(), folder);
    }

    // Second pass: build children relationships
    let folder_ids: Vec<String> = folder_map.keys().cloned().collect();
    for id in folder_ids {
        if let Some(folder) = folder_map.get(&id).cloned() {
            if let Some(parent_id) = &folder.parent_id {
                if let Some(parent) = folder_map.get_mut(parent_id) {
                    parent.children.push(folder.clone());
                }
            }
        }
    }

    // Sort children and return root folders
    for folder in folder_map.values_mut() {
        folder.children.sort_by(|a, b| {
            a.sort_order
                .cmp(&b.sort_order)
                .then(a.name.cmp(&b.name))
        });
    }

    root_ids
        .iter()
        .filter_map(|id| folder_map.remove(id))
        .collect()
}

/// Create a new folder
#[tauri::command]
pub fn create_folder(
    state: State<'_, AppState>,
    name: String,
    parent_id: Option<String>,
) -> Result<Folder, String> {
    // Sanitize the folder name first
    let sanitized_name = sanitize_folder_name(&name)?;

    let library_path = state
        .library_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No library open")?;

    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Determine the path
    let path = if let Some(ref pid) = parent_id {
        let parent_path: String = conn
            .query_row("SELECT path FROM folders WHERE id = ?1", [pid], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;
        format!("{}/{}", parent_path, sanitized_name)
    } else {
        sanitized_name.clone()
    };

    // Validate the path stays within the library
    let full_path = validate_path_within_library(&library_path, &path)?;

    // Create the filesystem directory
    fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;

    // Get the next sort order
    let sort_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM folders WHERE parent_id IS ?1",
            [&parent_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO folders (id, name, parent_id, path, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, sanitized_name, parent_id, path, sort_order, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Folder {
        id,
        name: sanitized_name,
        parent_id,
        path,
        sort_order,
        created_at: now,
        updated_at: now,
        children: Vec::new(),
        item_count: 0,
    })
}

/// Rename a folder
#[tauri::command]
pub fn rename_folder(
    state: State<'_, AppState>,
    id: String,
    new_name: String,
) -> Result<Folder, String> {
    // Sanitize the new folder name first
    let sanitized_name = sanitize_folder_name(&new_name)?;

    let library_path = state
        .library_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No library open")?;

    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Get current folder info
    let (current_path, parent_id): (String, Option<String>) = conn
        .query_row(
            "SELECT path, parent_id FROM folders WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    // Calculate new path
    let new_path = if let Some(ref _pid) = parent_id {
        let parts: Vec<&str> = current_path.rsplitn(2, '/').collect();
        if parts.len() > 1 {
            format!("{}/{}", parts[1], sanitized_name)
        } else {
            sanitized_name.clone()
        }
    } else {
        sanitized_name.clone()
    };

    // Validate the new path stays within the library
    let new_full_path = validate_path_within_library(&library_path, &new_path)?;

    // Rename filesystem directory
    let old_full_path = library_path.join(&current_path);
    if old_full_path.exists() {
        fs::rename(&old_full_path, &new_full_path).map_err(|e| e.to_string())?;
    }

    let now = chrono::Utc::now().timestamp();

    // Update database
    conn.execute(
        "UPDATE folders SET name = ?1, path = ?2, updated_at = ?3 WHERE id = ?4",
        params![sanitized_name, new_path, now, id],
    )
    .map_err(|e| e.to_string())?;

    // Update child folder paths
    conn.execute(
        "UPDATE folders SET path = REPLACE(path, ?1, ?2), updated_at = ?3
         WHERE path LIKE ?4",
        params![
            current_path,
            new_path,
            now,
            format!("{}/%", current_path)
        ],
    )
    .map_err(|e| e.to_string())?;

    // Return updated folder
    let folder = conn
        .query_row(
            "SELECT id, name, parent_id, path, sort_order, created_at, updated_at
             FROM folders WHERE id = ?1",
            [&id],
            |row| {
                Ok(Folder {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    parent_id: row.get(2)?,
                    path: row.get(3)?,
                    sort_order: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    children: Vec::new(),
                    item_count: 0,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(folder)
}

/// Delete a folder (moves items to parent or root)
#[tauri::command]
pub fn delete_folder(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let library_path = state
        .library_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No library open")?;

    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Get folder info
    let (path, parent_id): (String, Option<String>) = conn
        .query_row(
            "SELECT path, parent_id FROM folders WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    // Move items to parent folder
    conn.execute(
        "UPDATE items SET folder_id = ?1 WHERE folder_id = ?2",
        params![parent_id, id],
    )
    .map_err(|e| e.to_string())?;

    // Move child folders to parent
    conn.execute(
        "UPDATE folders SET parent_id = ?1 WHERE parent_id = ?2",
        params![parent_id, id],
    )
    .map_err(|e| e.to_string())?;

    // Delete the folder record
    conn.execute("DELETE FROM folders WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Optionally remove empty filesystem directory
    let full_path = library_path.join(&path);
    if full_path.exists() {
        let _ = fs::remove_dir(&full_path); // Only removes if empty
    }

    Ok(())
}

/// Reorder folders
#[tauri::command]
pub fn reorder_folders(
    state: State<'_, AppState>,
    folder_ids: Vec<String>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    for (index, id) in folder_ids.iter().enumerate() {
        conn.execute(
            "UPDATE folders SET sort_order = ?1 WHERE id = ?2",
            params![index as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
