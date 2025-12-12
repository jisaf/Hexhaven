/**
 * Offline Queue Service (Issue #191)
 *
 * IndexedDB-based offline queue for scenario background uploads.
 * Stores failed uploads when offline and processes them when back online.
 *
 * Features:
 * - Persist pending uploads across browser sessions
 * - Automatic retry when online
 * - Session recovery with queue status
 */

const DB_NAME = 'hexhaven-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';

export interface PendingUpload {
  id: string;
  scenarioId: string;
  file: File;
  transforms: {
    opacity: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  };
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface UploadQueueStatus {
  pendingCount: number;
  oldestTimestamp?: number;
  isProcessing: boolean;
}

class OfflineQueueService {
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private onStatusChange?: (status: UploadQueueStatus) => void;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineQueue] Database initialized');

        // Listen for online events to process queue
        window.addEventListener('online', () => this.processQueue());

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the pending uploads store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('scenarioId', 'scenarioId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Add an upload to the offline queue
   */
  async addToQueue(upload: Omit<PendingUpload, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingUpload: PendingUpload = {
      ...upload,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(pendingUpload);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Upload added to queue:', id);
        this.notifyStatusChange();
        resolve(id);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to add upload:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending uploads
   */
  async getPendingUploads(): Promise<PendingUpload[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get pending uploads:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove an upload from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Upload removed from queue:', id);
        this.notifyStatusChange();
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to remove upload:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update retry count and error for a failed upload
   */
  async updateUpload(id: string, updates: Partial<PendingUpload>): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const upload = getRequest.result;
        if (!upload) {
          reject(new Error(`Upload ${id} not found`));
          return;
        }

        const updatedUpload = { ...upload, ...updates };
        const putRequest = store.put(updatedUpload);

        putRequest.onsuccess = () => {
          this.notifyStatusChange();
          resolve();
        };

        putRequest.onerror = () => {
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get the current queue status
   */
  async getStatus(): Promise<UploadQueueStatus> {
    const uploads = await this.getPendingUploads();

    return {
      pendingCount: uploads.length,
      oldestTimestamp: uploads.length > 0 ? uploads[0].timestamp : undefined,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Process the queue (called when online)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (!navigator.onLine) return;

    this.isProcessing = true;
    this.notifyStatusChange();

    try {
      const uploads = await this.getPendingUploads();
      console.log(`[OfflineQueue] Processing ${uploads.length} pending uploads`);

      for (const upload of uploads) {
        try {
          await this.processUpload(upload);
          await this.removeFromQueue(upload.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[OfflineQueue] Failed to process upload ${upload.id}:`, errorMessage);

          // Update retry count
          await this.updateUpload(upload.id, {
            retryCount: upload.retryCount + 1,
            lastError: errorMessage,
          });

          // If too many retries, remove from queue
          if (upload.retryCount >= 5) {
            console.warn(`[OfflineQueue] Upload ${upload.id} exceeded max retries, removing`);
            await this.removeFromQueue(upload.id);
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Process a single upload
   */
  private async processUpload(upload: PendingUpload): Promise<void> {
    const { getApiUrl } = await import('../config/api');
    const apiUrl = getApiUrl();

    // Upload the file
    const formData = new FormData();
    formData.append('image', upload.file);

    const uploadResponse = await fetch(`${apiUrl}/scenarios/${upload.scenarioId}/background`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();

    // Update the scenario with transforms
    const updateResponse = await fetch(`${apiUrl}/scenarios/${upload.scenarioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backgroundImageUrl: uploadData.url,
        backgroundOpacity: upload.transforms.opacity,
        backgroundOffsetX: upload.transforms.offsetX,
        backgroundOffsetY: upload.transforms.offsetY,
        backgroundScale: upload.transforms.scale,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${updateResponse.status}`);
    }

    console.log(`[OfflineQueue] Successfully processed upload ${upload.id}`);
  }

  /**
   * Set status change callback
   */
  onQueueStatusChange(callback: (status: UploadQueueStatus) => void): void {
    this.onStatusChange = callback;
  }

  /**
   * Notify listeners of status change
   */
  private async notifyStatusChange(): Promise<void> {
    if (this.onStatusChange) {
      const status = await this.getStatus();
      this.onStatusChange(status);
    }
  }

  /**
   * Clear all pending uploads
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Queue cleared');
        this.notifyStatusChange();
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to clear queue:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService();
