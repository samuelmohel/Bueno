/**
 * Driver GPS broadcasting hook.
 * Buffers locations when offline and flushes when reconnected.
 * Critical for Nigerian rail network with patchy 4G coverage.
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';
const LOCATION_TASK = 'bueno-background-location';

interface LocationBuffer {
  locoId: string;
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

// ── Background task registration ───────────────────────────────────────────────
TaskManager.defineTask(LOCATION_TASK, ({ data, error }: any) => {
  if (error) return;
  const locations = data?.locations ?? [];
  locations.forEach((loc: any) => {
    // Emit via WebSocket — accessed through global ref
    (global as any).__buenoSocket?.emit('driver:location', {
      locoId: (global as any).__buenoLocoId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speed: loc.coords.speed,
      heading: loc.coords.heading,
      timestamp: loc.timestamp,
    });
  });
});

export function useDriverLocation(locoId: string | null, enabled: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const bufferRef = useRef<LocationBuffer[]>([]);
  const connectedRef = useRef(false);

  // Flush offline buffer when reconnected
  const flushBuffer = useCallback(() => {
    if (!connectedRef.current || !socketRef.current) return;
    const buffered = [...bufferRef.current];
    bufferRef.current = [];
    buffered.forEach(loc => socketRef.current?.emit('driver:location', loc));
    if (buffered.length > 0) console.log(`Flushed ${buffered.length} buffered GPS points`);
  }, []);

  useEffect(() => {
    if (!enabled || !locoId) return;

    (global as any).__buenoLocoId = locoId;

    const socket = io(`${WS_URL}/tracking`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;
    (global as any).__buenoSocket = socket;

    socket.on('connect', () => {
      connectedRef.current = true;
      flushBuffer();
    });

    socket.on('disconnect', () => {
      connectedRef.current = false;
    });

    // Request permissions and start watching
    (async () => {
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required for GPS tracking.');
        return;
      }

      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      const hasBackground = bg === 'granted';

      if (hasBackground) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20,
          timeInterval: 8000,
          foregroundService: {
            notificationTitle: 'Bueno GPS Active',
            notificationBody: 'Broadcasting your location for active shipment',
          },
        });
      } else {
        // Foreground only
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: 8000 },
          (loc) => {
            const payload: LocationBuffer = {
              locoId,
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              speed: loc.coords.speed,
              heading: loc.coords.heading,
              timestamp: loc.timestamp,
            };
            if (connectedRef.current) {
              socket.emit('driver:location', payload);
            } else {
              // Buffer while offline (max 200 points)
              if (bufferRef.current.length < 200) bufferRef.current.push(payload);
            }
          }
        );
      }
    })();

    return () => {
      socket.disconnect();
      (global as any).__buenoSocket = null;
      Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
    };
  }, [locoId, enabled]);
}
