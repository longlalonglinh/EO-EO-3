/**
 * Image URL Resolution and Normalization Utilities
 * Automatically converts Google Drive sharing URLs to direct high-resolution image thumbnails,
 * bypassing hotlink blocking, cookie restrictions, and CORS errors.
 */

export function normalizeGoogleDriveImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Extract FILE_ID from common Google Drive link formats
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{25,})/;
  const match = trimmed.match(driveRegex);

  if (match && match[1]) {
    const fileId = match[1];
    // Return high-resolution thumbnail endpoint (prevents CORS and hotlinking blocks)
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return trimmed;
}
