/**
 * Cleanup Script for Test Videos
 *
 * Keeps only the most recent 20 video files in the test-videos directory,
 * deleting older recordings to save disk space.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_VIDEOS_DIR = path.join(__dirname, '..', 'public', 'test-videos');
const MAX_VIDEOS_TO_KEEP = 20;

interface VideoFile {
  name: string;
  path: string;
  mtime: Date;
}

async function cleanupOldVideos() {
  try {
    // Check if directory exists
    try {
      await fs.access(TEST_VIDEOS_DIR);
    } catch {
      console.log('Test videos directory does not exist, skipping cleanup');
      return;
    }

    // Get all files in the directory
    const files = await fs.readdir(TEST_VIDEOS_DIR);

    // Filter for video files and get their stats
    const videoFiles: VideoFile[] = [];

    for (const file of files) {
      // Skip index.html and non-video files
      if (file === 'index.html' || !file.endsWith('.webm')) {
        continue;
      }

      const filePath = path.join(TEST_VIDEOS_DIR, file);
      const stats = await fs.stat(filePath);

      videoFiles.push({
        name: file,
        path: filePath,
        mtime: stats.mtime,
      });
    }

    // Sort by modification time (newest first)
    videoFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    console.log(`Found ${videoFiles.length} video files in test-videos directory`);

    // If we have more than MAX_VIDEOS_TO_KEEP, delete the oldest ones
    if (videoFiles.length > MAX_VIDEOS_TO_KEEP) {
      const videosToDelete = videoFiles.slice(MAX_VIDEOS_TO_KEEP);

      console.log(`Deleting ${videosToDelete.length} old video files (keeping ${MAX_VIDEOS_TO_KEEP} most recent):`);

      for (const video of videosToDelete) {
        console.log(`  - Deleting: ${video.name}`);
        await fs.unlink(video.path);
      }

      console.log(`✓ Cleanup complete. ${MAX_VIDEOS_TO_KEEP} most recent videos retained.`);
    } else {
      console.log(`No cleanup needed. Only ${videoFiles.length} video(s) found (max: ${MAX_VIDEOS_TO_KEEP})`);
    }
  } catch (error) {
    console.error('Error during video cleanup:', error);
    // Don't throw - we don't want cleanup failures to break tests
  }
}

// Run cleanup if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  cleanupOldVideos();
}

export default cleanupOldVideos;
