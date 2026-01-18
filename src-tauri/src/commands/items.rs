use crate::AppState;
use rusqlite::{params, OptionalExtension};
use tauri::State;

use super::{Item, ItemFilter, Tag};

/// Get all items with optional filtering
#[tauri::command]
pub fn get_items(
    state: State<'_, AppState>,
    filter: Option<ItemFilter>,
) -> Result<Vec<Item>, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let filter = filter.unwrap_or(ItemFilter {
        folder_id: None,
        tag_ids: None,
        item_type: None,
        is_favorited: None,
        search_query: None,
        sort_by: Some("created_at".to_string()),
        sort_order: Some("DESC".to_string()),
        limit: Some(100),
        offset: Some(0),
    });

    let mut sql = String::from(
        "SELECT DISTINCT i.id, i.type, i.title, i.file_path, i.url, i.description,
                i.created_at, i.updated_at, i.folder_id, i.is_favorited, i.color_hex,
                i.width, i.height, i.file_size, i.thumbnail_path
         FROM items i",
    );

    let mut conditions: Vec<String> = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Handle tag filtering with join
    if let Some(ref tag_ids) = filter.tag_ids {
        if !tag_ids.is_empty() {
            sql.push_str(" INNER JOIN item_tags it ON i.id = it.item_id");
            let placeholders: Vec<String> = tag_ids.iter().map(|_| "?".to_string()).collect();
            conditions.push(format!("it.tag_id IN ({})", placeholders.join(",")));
            for tag_id in tag_ids {
                params_vec.push(Box::new(tag_id.clone()));
            }
        }
    }

    // Handle search query
    if let Some(ref query) = filter.search_query {
        if !query.is_empty() {
            sql.push_str(" INNER JOIN items_fts fts ON i.rowid = fts.rowid");
            conditions.push("items_fts MATCH ?".to_string());
            params_vec.push(Box::new(format!("{}*", query)));
        }
    }

    if let Some(ref folder_id) = filter.folder_id {
        conditions.push("i.folder_id = ?".to_string());
        params_vec.push(Box::new(folder_id.clone()));
    }

    if let Some(ref item_type) = filter.item_type {
        conditions.push("i.type = ?".to_string());
        params_vec.push(Box::new(item_type.clone()));
    }

    if let Some(is_fav) = filter.is_favorited {
        conditions.push("i.is_favorited = ?".to_string());
        params_vec.push(Box::new(if is_fav { 1 } else { 0 }));
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    // Sorting
    let sort_by = filter.sort_by.unwrap_or_else(|| "created_at".to_string());
    let sort_order = filter.sort_order.unwrap_or_else(|| "DESC".to_string());
    sql.push_str(&format!(" ORDER BY i.{} {}", sort_by, sort_order));

    // Pagination
    let limit = filter.limit.unwrap_or(100);
    let offset = filter.offset.unwrap_or(0);
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(Item {
                id: row.get(0)?,
                item_type: row.get(1)?,
                title: row.get(2)?,
                file_path: row.get(3)?,
                url: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                folder_id: row.get(8)?,
                is_favorited: row.get::<_, i32>(9)? == 1,
                color_hex: row.get(10)?,
                width: row.get(11)?,
                height: row.get(12)?,
                file_size: row.get(13)?,
                thumbnail_path: row.get(14)?,
                tags: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Load tags for each item
    let mut items_with_tags = items;
    for item in &mut items_with_tags {
        item.tags = get_item_tags_internal(&conn, &item.id)?;
    }

    Ok(items_with_tags)
}

/// Get a single item by ID
#[tauri::command]
pub fn get_item(state: State<'_, AppState>, id: String) -> Result<Option<Item>, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT id, type, title, file_path, url, description,
                    created_at, updated_at, folder_id, is_favorited, color_hex,
                    width, height, file_size, thumbnail_path
             FROM items WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let item = stmt
        .query_row([&id], |row| {
            Ok(Item {
                id: row.get(0)?,
                item_type: row.get(1)?,
                title: row.get(2)?,
                file_path: row.get(3)?,
                url: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                folder_id: row.get(8)?,
                is_favorited: row.get::<_, i32>(9)? == 1,
                color_hex: row.get(10)?,
                width: row.get(11)?,
                height: row.get(12)?,
                file_size: row.get(13)?,
                thumbnail_path: row.get(14)?,
                tags: Vec::new(),
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(mut item) = item {
        item.tags = get_item_tags_internal(&conn, &item.id)?;
        Ok(Some(item))
    } else {
        Ok(None)
    }
}

fn get_item_tags_internal(
    conn: &rusqlite::Connection,
    item_id: &str,
) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color
             FROM tags t
             INNER JOIN item_tags it ON t.id = it.tag_id
             WHERE it.item_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let tags = stmt
        .query_map([item_id], |row| {
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

/// Update an item
#[tauri::command]
pub fn update_item(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    folder_id: Option<String>,
    is_favorited: Option<bool>,
) -> Result<Item, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE items SET
            title = COALESCE(?1, title),
            description = COALESCE(?2, description),
            folder_id = COALESCE(?3, folder_id),
            is_favorited = COALESCE(?4, is_favorited),
            updated_at = ?5
         WHERE id = ?6",
        params![
            title,
            description,
            folder_id,
            is_favorited.map(|f| if f { 1 } else { 0 }),
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    drop(conn);
    drop(db_lock);

    get_item(state, id)?.ok_or("Item not found after update".to_string())
}

/// Delete an item
#[tauri::command]
pub fn delete_item(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    // Get the file path before deleting
    let file_info: Option<(Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT file_path, thumbnail_path FROM items WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    // Delete from database
    conn.execute("DELETE FROM items WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete actual files
    if let Some((file_path, thumbnail_path)) = file_info {
        let library_path = state
            .library_path
            .lock()
            .unwrap()
            .clone()
            .ok_or("No library path")?;

        if let Some(fp) = file_path {
            let full_path = library_path.join(&fp);
            let _ = std::fs::remove_file(full_path);
        }

        if let Some(tp) = thumbnail_path {
            let full_path = library_path.join(&tp);
            let _ = std::fs::remove_file(full_path);
        }
    }

    Ok(())
}

/// Toggle favorite status
#[tauri::command]
pub fn toggle_favorite(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let current: i32 = conn
        .query_row(
            "SELECT is_favorited FROM items WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let new_value = if current == 1 { 0 } else { 1 };

    conn.execute(
        "UPDATE items SET is_favorited = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_value, chrono::Utc::now().timestamp(), id],
    )
    .map_err(|e| e.to_string())?;

    Ok(new_value == 1)
}

/// Move items to a folder
#[tauri::command]
pub fn move_items_to_folder(
    state: State<'_, AppState>,
    item_ids: Vec<String>,
    folder_id: Option<String>,
) -> Result<(), String> {
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    let now = chrono::Utc::now().timestamp();

    for id in item_ids {
        conn.execute(
            "UPDATE items SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![folder_id, now, id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Bulk delete items
#[tauri::command]
pub fn delete_items(state: State<'_, AppState>, item_ids: Vec<String>) -> Result<(), String> {
    for id in item_ids {
        delete_item(state.clone(), id)?;
    }
    Ok(())
}
