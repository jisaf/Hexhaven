import { getApiUrl } from '../config/api';
import { getPlayerUUID } from '../utils/storage';

export const fetchActiveRooms = async () => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/rooms`);
  if (response.ok) {
    const data = await response.json();
    return data.rooms || [];
  }
  throw new Error('Failed to fetch active rooms');
};

export const fetchMyRooms = async () => {
  const uuid = getPlayerUUID();
  if (!uuid) return [];
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/rooms/my-rooms/${uuid}`);
  if (response.ok) {
    const data = await response.json();
    return data.rooms || [];
  }
  throw new Error('Failed to fetch my rooms');
};
