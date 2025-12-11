/**
 * Background Upload Service (Issue #191)
 *
 * Handles background image uploads for scenarios:
 * - File storage configuration (multer)
 * - File validation (MIME types, size)
 * - Upload processing with old file cleanup
 * - File deletion
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { diskStorage, StorageEngine } from 'multer';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import { extname, resolve } from 'path';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { config } from '../config/env.config';
import { PrismaService } from './prisma.service';

import { randomUUID } from 'crypto';

/**
 * Static multer configuration for use in decorators (scenario-specific uploads)
 * This needs to be evaluated at module load time, before DI is available
 */
export const backgroundUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: config.uploads.backgroundsDir,
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const scenarioId = req.params.id;
      const timestamp = Date.now();
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `scenario-${scenarioId}-${timestamp}${ext}`);
    },
  }),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Only image files (${config.uploads.allowedMimeTypes.join(', ')}) are allowed`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
  },
};

/**
 * Static multer configuration for standalone uploads (no scenarioId required)
 * Uses UUID for unique filenames
 */
export const standaloneBackgroundUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: config.uploads.backgroundsDir,
    filename: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      const uuid = randomUUID();
      const timestamp = Date.now();
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `background-${uuid}-${timestamp}${ext}`);
    },
  }),
  fileFilter: (
    req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Only image files (${config.uploads.allowedMimeTypes.join(', ')}) are allowed`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
  },
};

export interface UploadResult {
  success: boolean;
  url: string;
  filename: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
}

@Injectable()
export class BackgroundUploadService {
  private readonly backgroundsDir: string;
  private readonly maxFileSizeBytes: number;
  private readonly allowedMimeTypes: string[];

  constructor(private readonly prisma: PrismaService) {
    this.backgroundsDir = config.uploads.backgroundsDir;
    this.maxFileSizeBytes = config.uploads.maxFileSizeMb * 1024 * 1024;
    this.allowedMimeTypes = config.uploads.allowedMimeTypes;

    // Ensure backgrounds directory exists
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the backgrounds directory exists
   */
  private ensureDirectoryExists(): void {
    if (!existsSync(this.backgroundsDir)) {
      try {
        mkdirSync(this.backgroundsDir, { recursive: true });
      } catch (error) {
        console.error(
          `Failed to create backgrounds directory: ${this.backgroundsDir}`,
          error,
        );
      }
    }
  }

  /**
   * Get multer storage configuration
   */
  getStorageConfig(): StorageEngine {
    return diskStorage({
      destination: this.backgroundsDir,
      filename: (
        req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, filename: string) => void,
      ) => {
        const scenarioId = req.params.id;
        const timestamp = Date.now();
        const ext = extname(file.originalname).toLowerCase();
        callback(null, `scenario-${scenarioId}-${timestamp}${ext}`);
      },
    });
  }

  /**
   * Get file filter function for multer
   */
  getFileFilter(): (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => void {
    const allowedMimes = this.allowedMimeTypes;

    return (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(
          new BadRequestException(
            `Only image files (${allowedMimes.join(', ')}) are allowed`,
          ),
          false,
        );
      }
    };
  }

  /**
   * Get max file size in bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSizeBytes;
  }

  /**
   * Process a background upload for a scenario
   */
  async uploadBackground(
    scenarioId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    // Get existing scenario to check for old background
    const existing = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
    });

    if (!existing) {
      // Clean up uploaded file since scenario doesn't exist
      this.cleanupFile(file.path);
      throw new BadRequestException(`Scenario with id ${scenarioId} not found`);
    }

    // Clean up old background if it exists
    if (existing.backgroundImageUrl) {
      this.cleanupOldBackground(existing.backgroundImageUrl);
    }

    // Generate URL path for the uploaded file
    const url = `/backgrounds/${file.filename}`;

    // Update scenario with new background URL
    await this.prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        backgroundImageUrl: url,
      },
    });

    return {
      success: true,
      url,
      filename: file.filename,
    };
  }

  /**
   * Upload a standalone background image (not tied to a scenario yet)
   * Used when creating new scenarios before they have an ID
   */
  uploadStandaloneBackground(file: Express.Multer.File): UploadResult {
    // File is already saved by multer, just return the URL
    const url = `/backgrounds/${file.filename}`;

    return {
      success: true,
      url,
      filename: file.filename,
    };
  }

  /**
   * Delete background image for a scenario
   */
  async deleteBackground(scenarioId: string): Promise<DeleteResult> {
    const existing = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
    });

    if (!existing) {
      throw new BadRequestException(`Scenario with id ${scenarioId} not found`);
    }

    // Delete the background file if it exists
    if (existing.backgroundImageUrl) {
      this.cleanupOldBackground(existing.backgroundImageUrl);
    }

    // Clear background fields in database
    await this.prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        backgroundImageUrl: null,
        backgroundOpacity: 1.0,
        backgroundOffsetX: 0,
        backgroundOffsetY: 0,
        backgroundScale: 1.0,
      },
    });

    return {
      success: true,
      message: 'Background removed',
    };
  }

  /**
   * Clean up an old background file given its URL path
   */
  private cleanupOldBackground(backgroundUrl: string): void {
    // URL is like /backgrounds/filename.png - need to get just the filename
    const filename = backgroundUrl.replace(/^\/backgrounds\//, '');
    const filePath = resolve(this.backgroundsDir, filename);

    this.cleanupFile(filePath);
  }

  /**
   * Clean up a file at the given path
   */
  private cleanupFile(filePath: string): void {
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    }
  }

  /**
   * Resolve a background URL to a filesystem path
   */
  resolveBackgroundPath(backgroundUrl: string): string {
    const filename = backgroundUrl.replace(/^\/backgrounds\//, '');
    return resolve(this.backgroundsDir, filename);
  }
}
