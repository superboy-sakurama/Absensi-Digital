export const getOnlineTime = async (): Promise<Date> => {
  try {
    const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta');
    const data = await response.json();
    // timeapi.io returns dateTime in ISO 8601 format
    return new Date(data.dateTime);
  } catch (error) {
    console.error('Failed to fetch online time, falling back to local time:', error);
    return new Date();
  }
};
