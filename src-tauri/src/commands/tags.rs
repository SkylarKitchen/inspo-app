use crate::AppState;
use rusqlite::{params, OptionalExtension};
use tauri::State;

use super::Tag;

/// Get all tags with item counts
#[tauri::command]
pub fn get_tags(state: State<'_, AppState>) -> Result<Vec<Tag>, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color,
                    (SELECT COUNT(*) FROM item_tags WHERE tag_id = t.id) as item_count
             FROM tags t
             ORDER BY t.name",
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                item_count: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tags)
}

/// Create a new tag
#[tauri::command]
pub fn create_tag(
    state: State<'_, AppState>,
    name: String,
    color: Option<String>,
) -> Result<Tag, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Check if tag already exists
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM tags WHERE LOWER(name) = LOWER(?1)",
            [&name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if existing.is_some() {
        return Err(format!("Tag '{}' already exists", name));
    }

    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO tags (id, name, color) VALUES (?1, ?2, ?3)",
        params![id, name, color],
    )
    .map_err(|e| e.to_string())?;

    Ok(Tag {
        id,
        name,
        color,
        item_count: 0,
    })
}

/// Update a tag
#[tauri::command]
pub fn update_tag(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    color: Option<String>,
) -> Result<Tag, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE tags SET
            name = COALESCE(?1, name),
            color = COALESCE(?2, color)
         WHERE id = ?3",
        params![name, color, id],
    )
    .map_err(|e| e.to_string())?;

    let tag = conn
        .query_row(
            "SELECT t.id, t.name, t.color,
                    (SELECT COUNT(*) FROM item_tags WHERE tag_id = t.id) as item_count
             FROM tags t WHERE t.id = ?1",
            [&id],
            |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    item_count: row.get(3)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(tag)
}

/// Delete a tag
#[tauri::command]
pub fn delete_tag(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    conn.execute("DELETE FROM tags WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Add tags to an item
#[tauri::command]
pub fn add_tags_to_item(
    state: State<'_, AppState>,
    item_id: String,
    tag_ids: Vec<String>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    for tag_id in tag_ids {
        conn.execute(
            "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            params![item_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Remove tags from an item
#[tauri::command]
pub fn remove_tags_from_item(
    state: State<'_, AppState>,
    item_id: String,
    tag_ids: Vec<String>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    for tag_id in tag_ids {
        conn.execute(
            "DELETE FROM item_tags WHERE item_id = ?1 AND tag_id = ?2",
            params![item_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Set all tags for an item (replaces existing)
#[tauri::command]
pub fn set_item_tags(
    state: State<'_, AppState>,
    item_id: String,
    tag_ids: Vec<String>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Remove all existing tags
    conn.execute("DELETE FROM item_tags WHERE item_id = ?1", [&item_id])
        .map_err(|e| e.to_string())?;

    // Add new tags
    for tag_id in tag_ids {
        conn.execute(
            "INSERT INTO item_tags (item_id, tag_id) VALUES (?1, ?2)",
            params![item_id, tag_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Get tags for an item
#[tauri::command]
pub fn get_item_tags(state: State<'_, AppState>, item_id: String) -> Result<Vec<Tag>, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color
             FROM tags t
             INNER JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?1
             ORDER BY t.name",
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([&item_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                item_count: 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tags)
}
