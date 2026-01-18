use crate::commands::thumbnails::generate_thumbnail;
use crate::AppState;
use image::GenericImageView;
use rusqlite::params;
use std::fs;
use std::path::PathBuf;
use tauri::State;

use super::Item;

/// Import an image file into the library
#[tauri::command]
pub async fn import_image(
    state: State<'_, AppState>,
    source_path: String,
    folder_id: Option<String>,
    copy_file: Option<bool>,
) -> Result<Item, String> {
    let library_path = state
        .library_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No library open")?;

    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Source file not found: {}", source_path));
    }

    // Get file info
    let file_name = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid filename")?
        .to_string();

    let file_size = fs::metadata(&source)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    // Determine destination path
    let dest_folder = if let Some(ref fid) = folder_id {
        let db_lock = state.db.lock().unwrap();
        let db = db_lock.as_ref().ok_or("No library open")?;
        let conn = db.conn.lock().unwrap();

        let folder_path: String = conn
            .query_row("SELECT path FROM folders WHERE id = ?1", [fid], |row| {
                row.get(0)
            })
            .map_err(|e| e.to_string())?;

        library_path.join(folder_path)
    } else {
        library_path.join("Inbox")
    };

    // Ensure destination folder exists
    fs::create_dir_all(&dest_folder).map_err(|e| e.to_string())?;

    // Generate unique filename if needed
    let mut dest_name = file_name.clone();
    let mut dest_path = dest_folder.join(&dest_name);
    let mut counter = 1;

    while dest_path.exists() {
        let stem = source
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("file");
        let ext = source
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        dest_name = if ext.is_empty() {
            format!("{}_{}", stem, counter)
        } else {
            format!("{}_{}.{}", stem, counter, ext)
        };
        dest_path = dest_folder.join(&dest_name);
        counter += 1;
    }

    // Copy or move the file
    let should_copy = copy_file.unwrap_or(true);
    if should_copy {
        fs::copy(&source, &dest_path).map_err(|e| e.to_string())?;
    } else {
        fs::rename(&source, &dest_path).map_err(|e| e.to_string())?;
    }

    // Get image dimensions
    let (width, height) = match image::open(&dest_path) {
        Ok(img) => {
            let dims = img.dimensions();
            (Some(dims.0 as i32), Some(dims.1 as i32))
        }
        Err(_) => (None, None),
    };

    // Generate thumbnail
    let id = uuid::Uuid::new_v4().to_string();
    let thumbnail_result = generate_thumbnail(&library_path, &dest_path, &id);
    let thumbnail_path = thumbnail_result.ok();

    // Calculate relative path
    let relative_path = dest_path
        .strip_prefix(&library_path)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| dest_name.clone());

    // Extract dominant color (simplified)
    let color_hex = extract_dominant_color(&dest_path);

    let now = chrono::Utc::now().timestamp();

    // Insert into database
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO items (id, type, title, file_path, created_at, updated_at, folder_id,
                           width, height, file_size, thumbnail_path, color_hex)
         VALUES (?1, 'image', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            file_name,
            relative_path,
            now,
            now,
            folder_id,
            width,
            height,
            file_size,
            thumbnail_path,
            color_hex
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Item {
        id,
        item_type: "image".to_string(),
        title: Some(file_name),
        file_path: Some(relative_path),
        url: None,
        description: None,
        created_at: now,
        updated_at: now,
        folder_id,
        is_favorited: false,
        color_hex,
        width,
        height,
        file_size: Some(file_size),
        thumbnail_path,
        tags: Vec::new(),
    })
}

/// Import multiple images
#[tauri::command]
pub async fn import_images(
    state: State<'_, AppState>,
    source_paths: Vec<String>,
    folder_id: Option<String>,
) -> Result<Vec<Item>, String> {
    let mut items = Vec::new();

    for path in source_paths {
        match import_image(state.clone(), path.clone(), folder_id.clone(), Some(true)).await {
            Ok(item) => items.push(item),
            Err(e) => eprintln!("Failed to import {}: {}", path, e),
        }
    }

    Ok(items)
}

/// Import a bookmark/URL
#[tauri::command]
pub async fn import_bookmark(
    state: State<'_, AppState>,
    url: String,
    title: Option<String>,
    description: Option<String>,
    folder_id: Option<String>,
) -> Result<Item, String> {
    let library_path = state
        .library_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No library open")?;

    // Validate URL
    let parsed_url = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Fetch metadata if title not provided
    let (final_title, final_description) = if title.is_none() || description.is_none() {
        fetch_url_metadata(&url).await.unwrap_or((title, description))
    } else {
        (title, description)
    };

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    // Create bookmark folder
    let bookmark_dir = library_path.join("_bookmarks").join(&id);
    fs::create_dir_all(&bookmark_dir).map_err(|e| e.to_string())?;

    // Save metadata
    let meta = serde_json::json!({
        "url": url,
        "title": final_title,
        "description": final_description,
        "created_at": now,
        "domain": parsed_url.host_str()
    });
    let meta_path = bookmark_dir.join("meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| e.to_string())?;

    let relative_path = format!("_bookmarks/{}/meta.json", id);

    // Insert into database
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO items (id, type, title, file_path, url, description, created_at, updated_at, folder_id)
         VALUES (?1, 'bookmark', ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            final_title,
            relative_path,
            url,
            final_description,
            now,
            now,
            folder_id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Item {
        id,
        item_type: "bookmark".to_string(),
        title: final_title,
        file_path: Some(relative_path),
        url: Some(url),
        description: final_description,
        created_at: now,
        updated_at: now,
        folder_id,
        is_favorited: false,
        color_hex: None,
        width: None,
        height: None,
        file_size: None,
        thumbnail_path: None,
        tags: Vec::new(),
    })
}

/// Response struct for bookmark metadata
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookmarkMetadata {
    pub url: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub domain: Option<String>,
}

/// Fetch metadata from a URL without importing
#[tauri::command]
pub async fn fetch_bookmark_metadata(url: String) -> Result<BookmarkMetadata, String> {
    // Validate URL
    let parsed_url = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;

    let (title, description) = fetch_url_metadata(&url).await.unwrap_or((None, None));

    Ok(BookmarkMetadata {
        url: url.clone(),
        title,
        description,
        domain: parsed_url.host_str().map(String::from),
    })
}

/// Fetch metadata from a URL
async fn fetch_url_metadata(url: &str) -> Result<(Option<String>, Option<String>), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(url)
        .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = response.text().await.map_err(|e| e.to_string())?;
    let document = scraper::Html::parse_document(&html);

    // Extract title
    let title_selector = scraper::Selector::parse("title").unwrap();
    let og_title_selector = scraper::Selector::parse("meta[property='og:title']").unwrap();

    let title = document
        .select(&og_title_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(String::from)
        .or_else(|| {
            document
                .select(&title_selector)
                .next()
                .map(|el| el.inner_html())
        });

    // Extract description
    let desc_selector = scraper::Selector::parse("meta[name='description']").unwrap();
    let og_desc_selector = scraper::Selector::parse("meta[property='og:description']").unwrap();

    let description = document
        .select(&og_desc_selector)
        .next()
        .and_then(|el| el.value().attr("content"))
        .map(String::from)
        .or_else(|| {
            document
                .select(&desc_selector)
                .next()
                .and_then(|el| el.value().attr("content"))
                .map(String::from)
        });

    Ok((title, description))
}

/// Extract dominant color from an image (simplified implementation)
fn extract_dominant_color(path: &PathBuf) -> Option<String> {
    let img = image::open(path).ok()?;
    let img = img.resize(10, 10, image::imageops::FilterType::Nearest);

    let mut r_sum: u64 = 0;
    let mut g_sum: u64 = 0;
    let mut b_sum: u64 = 0;
    let mut count: u64 = 0;

    for pixel in img.to_rgb8().pixels() {
        r_sum += pixel[0] as u64;
        g_sum += pixel[1] as u64;
        b_sum += pixel[2] as u64;
        count += 1;
    }

    if count > 0 {
        let r = (r_sum / count) as u8;
        let g = (g_sum / count) as u8;
        let b = (b_sum / count) as u8;
        Some(format!("#{:02x}{:02x}{:02x}", r, g, b))
    } else {
        None
    }
}
