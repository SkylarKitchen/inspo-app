import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { convertFileSrc } from "@tauri-apps/api/core";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

/**
 * Converts a local file path to a URL that can be loaded by the webview.
 * Uses Tauri's official convertFileSrc for proper platform handling.
 */
export function convertToLocalSrc(filePath: string): string {
  try {
    const url = convertFileSrc(filePath);
    console.log('convertFileSrc result:', { filePath, url });
    return url;
  } catch (e) {
    // Fallback for non-Tauri context or errors
    console.warn('convertFileSrc failed, using fallback:', e);
    const path = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `http://asset.localhost${path}`;
  }
}
