export const getHighAccuracyLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    let watchId: number;
    let timeoutId: NodeJS.Timeout;
    let bestPosition: GeolocationPosition | null = null;
    let readings = 0;

    const clearWatch = () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      clearWatch();
      if (bestPosition) {
        resolve(bestPosition);
      } else {
        reject(new Error('Timeout waiting for location'));
      }
    }, 20000); // 20 seconds timeout

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        readings++;
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        
        // Require at least 3 readings to let GPS settle, or very high accuracy (<15m)
        if ((position.coords.accuracy <= 15) || (position.coords.accuracy <= 30 && readings >= 3)) {
          clearWatch();
          resolve(bestPosition);
        }
      },
      (error) => {
        if (bestPosition) {
          clearWatch();
          resolve(bestPosition);
        } else {
          clearWatch();
          reject(error);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  });
};
