import { getApiUrl } from '../config/api';
import { getPlayerUUID } from '../utils/storage';

export const fetchActiveRooms = async () => {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/rooms`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.rooms || [];
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch active rooms: ${response.status} ${response.statusText} - ${errorText}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API] Fetch active rooms error:', error.message);
    throw err;
  }
};

export const fetchMyRooms = async () => {
  const uuid = getPlayerUUID();
  if (!uuid) return [];
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/rooms/my-rooms/${uuid}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data.rooms || [];
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch my rooms: ${response.status} ${response.statusText} - ${errorText}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API] Fetch my rooms error:', error.message);
    throw err;
  }
};
