pub mod folders;
pub mod import;
pub mod items;
pub mod library;
pub mod tags;
pub mod thumbnails;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub title: Option<String>,
    pub file_path: Option<String>,
    pub url: Option<String>,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub folder_id: Option<String>,
    pub is_favorited: bool,
    pub color_hex: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub thumbnail_path: Option<String>,
    #[serde(default)]
    pub tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub path: String,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(default)]
    pub children: Vec<Folder>,
    #[serde(default)]
    pub item_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    #[serde(default)]
    pub item_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryStats {
    pub total_items: i32,
    pub total_images: i32,
    pub total_bookmarks: i32,
    pub total_folders: i32,
    pub total_tags: i32,
    pub favorites_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemFilter {
    pub folder_id: Option<String>,
    pub tag_ids: Option<Vec<String>>,
    pub item_type: Option<String>,
    pub is_favorited: Option<bool>,
    pub search_query: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
