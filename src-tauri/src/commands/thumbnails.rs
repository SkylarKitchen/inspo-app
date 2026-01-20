use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView};
use std::fs;
use std::path::{Path, PathBuf};

const THUMBNAIL_SIZE: u32 = 256;

/// Generate a thumbnail for an image (opens file from disk)
pub fn generate_thumbnail(
    library_path: &Path,
    image_path: &Path,
    item_id: &str,
) -> Result<String, String> {
    let img = image::open(image_path).map_err(|e| format!("Failed to open image: {}", e))?;
    generate_thumbnail_from_image(library_path, &img, item_id)
}

/// Generate a thumbnail from an already-loaded DynamicImage
/// This avoids re-decoding the image when it's already in memory
pub fn generate_thumbnail_from_image(
    library_path: &Path,
    img: &DynamicImage,
    item_id: &str,
) -> Result<String, String> {
    let (width, height) = img.dimensions();

    // Calculate thumbnail dimensions maintaining aspect ratio
    let (thumb_width, thumb_height) = if width > height {
        let ratio = height as f32 / width as f32;
        (THUMBNAIL_SIZE, (THUMBNAIL_SIZE as f32 * ratio) as u32)
    } else {
        let ratio = width as f32 / height as f32;
        ((THUMBNAIL_SIZE as f32 * ratio) as u32, THUMBNAIL_SIZE)
    };

    // Resize the image using Triangle filter (2-3x faster than Lanczos3, good enough for thumbnails)
    let thumbnail = img.resize(thumb_width, thumb_height, FilterType::Triangle);

    // Ensure thumbnails directory exists
    let thumbnails_dir = library_path.join(".inspo").join("thumbnails");
    fs::create_dir_all(&thumbnails_dir).map_err(|e| e.to_string())?;

    // Save as WebP for better compression
    let thumbnail_filename = format!("{}.webp", item_id);
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);

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
