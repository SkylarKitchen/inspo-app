use image::imageops::FilterType;
use image::GenericImageView;
use std::fs;
use std::path::{Path, PathBuf};

const THUMBNAIL_SIZE: u32 = 256;

/// Generate a thumbnail for an image
pub fn generate_thumbnail(
    library_path: &Path,
    image_path: &Path,
    item_id: &str,
) -> Result<String, String> {
    let img = image::open(image_path).map_err(|e| format!("Failed to open image: {}", e))?;

    let (width, height) = img.dimensions();

    // Calculate thumbnail dimensions maintaining aspect ratio
    let (thumb_width, thumb_height) = if width > height {
        let ratio = height as f32 / width as f32;
        (THUMBNAIL_SIZE, (THUMBNAIL_SIZE as f32 * ratio) as u32)
    } else {
        let ratio = width as f32 / height as f32;
        ((THUMBNAIL_SIZE as f32 * ratio) as u32, THUMBNAIL_SIZE)
    };

    // Resize the image
    let thumbnail = img.resize(thumb_width, thumb_height, FilterType::Lanczos3);

    // Ensure thumbnails directory exists
    let thumbnails_dir = library_path.join(".inspo").join("thumbnails");
    fs::create_dir_all(&thumbnails_dir).map_err(|e| e.to_string())?;

    // Save as WebP for better compression
    let thumbnail_filename = format!("{}.webp", item_id);
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);

    // Use image crate to save as WebP (if feature enabled) or PNG as fallback
    // Since we are seeing panic with webp crate, let's use standard image crate saving
    // The previous implementation was manually using webp crate which panicked on buffer size
    thumbnail.save(&thumbnail_path).map_err(|e| e.to_string())?;

    // Return relative path
    Ok(format!(".inspo/thumbnails/{}", thumbnail_filename))
}

/// Regenerate thumbnail for an existing item
pub fn regenerate_thumbnail(
    library_path: &Path,
    item_id: &str,
    file_path: &str,
) -> Result<String, String> {
    let full_path = library_path.join(file_path);
    generate_thumbnail(library_path, &full_path, item_id)
}

/// Get the full path to a thumbnail
pub fn get_thumbnail_path(library_path: &Path, thumbnail_relative_path: &str) -> PathBuf {
    library_path.join(thumbnail_relative_path)
}

/// Delete a thumbnail
pub fn delete_thumbnail(library_path: &Path, thumbnail_relative_path: &str) -> Result<(), String> {
    let full_path = library_path.join(thumbnail_relative_path);
    if full_path.exists() {
        fs::remove_file(full_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
