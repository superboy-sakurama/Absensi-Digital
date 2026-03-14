export const getHighAccuracyLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    let watchId: number;
    let timeoutId: NodeJS.Timeout;
    let bestPosition: GeolocationPosition | null = null;

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
    }, 15000); // 15 seconds timeout

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        
        // If accuracy is good enough (e.g., less than 30 meters), resolve immediately
        if (position.coords.accuracy <= 30) {
          clearWatch();
          resolve(position);
        }
      },
      (error) => {
        clearWatch();
        reject(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  });
};
