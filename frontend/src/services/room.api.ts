import { getApiUrl } from '../config/api';
import { getPlayerUUID } from '../utils/storage';
import { loggingService } from './logging.service';

export const fetchActiveRooms = async () => {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/rooms`;
  loggingService.log('API', 'Fetching active rooms from:', url);
  try {
    const response = await fetch(url);
    loggingService.log('API', 'Active rooms response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    if (response.ok) {
      const data = await response.json();
      return data.rooms || [];
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch active rooms: ${response.status} ${response.statusText} - ${errorText}`);
  } catch (err: unknown) {
    const error = err as Error;
    loggingService.error('API', 'Fetch active rooms error:', {
      url,
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw err;
  }
};

export const fetchMyRooms = async () => {
  const uuid = getPlayerUUID();
  if (!uuid) return [];
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/rooms/my-rooms/${uuid}`;
  loggingService.log('API', 'Fetching my rooms from:', url);
  try {
    const response = await fetch(url);
    loggingService.log('API', 'My rooms response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    if (response.ok) {
      const data = await response.json();
      return data.rooms || [];
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch my rooms: ${response.status} ${response.statusText} - ${errorText}`);
  } catch (err: unknown) {
    const error = err as Error;
    loggingService.error('API', 'Fetch my rooms error:', {
      url,
      error: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw err;
  }
};
