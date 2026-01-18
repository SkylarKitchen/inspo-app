export interface Item {
  id: string;
  type: "image" | "bookmark" | "file";
  title: string | null;
  filePath: string | null;
  url: string | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  folderId: string | null;
  isFavorited: boolean;
  colorHex: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  thumbnailPath: string | null;
  tags: Tag[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  children: Folder[];
  itemCount: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  itemCount: number;
}

export interface LibraryStats {
  totalItems: number;
  totalImages: number;
  totalBookmarks: number;
  totalFolders: number;
  totalTags: number;
  favoritesCount: number;
}

export interface ItemFilter {
  folderId?: string;
  tagIds?: string[];
  itemType?: "image" | "bookmark" | "file";
  isFavorited?: boolean;
  searchQuery?: string;
  sortBy?: "created_at" | "updated_at" | "title";
  sortOrder?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

export type ViewMode = "grid" | "masonry" | "list";

export type SortOption = {
  label: string;
  value: string;
  order: "ASC" | "DESC";
};

export interface AppState {
  libraryPath: string | null;
  isLibraryOpen: boolean;
  currentFolderId: string | null;
  selectedItemIds: Set<string>;
  viewMode: ViewMode;
  searchQuery: string;
}
