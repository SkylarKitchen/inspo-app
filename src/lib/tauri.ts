import { invoke } from "@tauri-apps/api/core";
import type { Item, Folder, Tag, LibraryStats, ItemFilter } from "@/types";

// Library commands
export async function initLibrary(path: string): Promise<string> {
  return invoke("init_library", { path });
}

export async function openLibrary(path: string): Promise<string> {
  return invoke("open_library", { path });
}

export async function getLibraryPath(): Promise<string | null> {
  return invoke("get_library_path");
}

export async function isLibraryOpen(): Promise<boolean> {
  return invoke("is_library_open");
}

export async function getLibraryStats(): Promise<LibraryStats> {
  return invoke("get_library_stats");
}

// Item commands
export async function getItems(filter?: ItemFilter): Promise<Item[]> {
  return invoke("get_items", { filter });
}

export async function getItem(id: string): Promise<Item | null> {
  return invoke("get_item", { id });
}

export async function updateItem(
  id: string,
  updates: {
    title?: string;
    description?: string;
    folderId?: string;
    isFavorited?: boolean;
  }
): Promise<Item> {
  return invoke("update_item", {
    id,
    title: updates.title,
    description: updates.description,
    folderId: updates.folderId,
    isFavorited: updates.isFavorited,
  });
}

export async function deleteItem(id: string): Promise<void> {
  return invoke("delete_item", { id });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  return invoke("toggle_favorite", { id });
}

export async function moveItemsToFolder(
  itemIds: string[],
  folderId: string | null
): Promise<void> {
  return invoke("move_items_to_folder", { itemIds, folderId });
}

export async function deleteItems(itemIds: string[]): Promise<void> {
  return invoke("delete_items", { itemIds });
}

// Folder commands
export async function getFolders(): Promise<Folder[]> {
  return invoke("get_folders");
}

export async function createFolder(
  name: string,
  parentId?: string
): Promise<Folder> {
  return invoke("create_folder", { name, parentId });
}

export async function renameFolder(id: string, newName: string): Promise<Folder> {
  return invoke("rename_folder", { id, newName });
}

export async function deleteFolder(id: string): Promise<void> {
  return invoke("delete_folder", { id });
}

export async function reorderFolders(folderIds: string[]): Promise<void> {
  return invoke("reorder_folders", { folderIds });
}

// Tag commands
export async function getTags(): Promise<Tag[]> {
  return invoke("get_tags");
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  return invoke("create_tag", { name, color });
}

export async function updateTag(
  id: string,
  name?: string,
  color?: string
): Promise<Tag> {
  return invoke("update_tag", { id, name, color });
}

export async function deleteTag(id: string): Promise<void> {
  return invoke("delete_tag", { id });
}

export async function addTagsToItem(
  itemId: string,
  tagIds: string[]
): Promise<void> {
  return invoke("add_tags_to_item", { itemId, tagIds });
}

export async function removeTagsFromItem(
  itemId: string,
  tagIds: string[]
): Promise<void> {
  return invoke("remove_tags_from_item", { itemId, tagIds });
}

export async function setItemTags(
  itemId: string,
  tagIds: string[]
): Promise<void> {
  return invoke("set_item_tags", { itemId, tagIds });
}

export async function getItemTags(itemId: string): Promise<Tag[]> {
  return invoke("get_item_tags", { itemId });
}

// Import commands
export async function importImage(
  sourcePath: string,
  folderId?: string,
  copyFile?: boolean
): Promise<Item> {
  return invoke("import_image", { sourcePath, folderId, copyFile });
}

export async function importImages(
  sourcePaths: string[],
  folderId?: string
): Promise<Item[]> {
  return invoke("import_images", { sourcePaths, folderId });
}

export async function importBookmark(
  url: string,
  title?: string,
  description?: string,
  folderId?: string
): Promise<Item> {
  return invoke("import_bookmark", { url, title, description, folderId });
}

export interface BookmarkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  domain: string | null;
}

export async function fetchBookmarkMetadata(
  url: string
): Promise<BookmarkMetadata> {
  return invoke("fetch_bookmark_metadata", { url });
}
