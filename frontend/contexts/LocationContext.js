import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';
const LocationContext = createContext({});

let locationSubscribers = [];

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      locationSubscribers.forEach(callback => callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }));
    }
  }
});

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [tracking, setTracking] = useState('foreground');
  const [permissionStatus, setPermissionStatus] = useState(null);
  const foregroundSubscription = useRef(null);

  useEffect(() => {
    loadSettings();
    return () => stopTracking();
  }, []);

  const loadSettings = async () => {
    const saved = await AsyncStorage.getItem('location_tracking');
    if (saved) setTracking(saved);
  };

  const requestPermissions = async () => {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') {
      setPermissionStatus('denied');
      return false;
    }
    
    if (tracking === 'background') {
      const { status: background } = await Location.requestBackgroundPermissionsAsync();
      if (background !== 'granted') {
        setPermissionStatus('foreground-only');
        return true;
      }
    }
    
    setPermissionStatus('granted');
    return true;
  };

  const startTracking = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // Get initial location
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    });

    if (tracking === 'background') {
      await startBackgroundTracking();
    } else {
      await startForegroundTracking();
    }
  };

  const startForegroundTracking = async () => {
    foregroundSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        timeInterval: 10000
      },
      (loc) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
      }
    );
  };

  const startBackgroundTracking = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Revurb',
          notificationBody: 'Tracking location for nearby notes'
        }
      });
    }
    
    locationSubscribers.push(setLocation);
  };

  const stopTracking = async () => {
    if (foregroundSubscription.current) {
      foregroundSubscription.current.remove();
      foregroundSubscription.current = null;
    }
    
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    
    locationSubscribers = locationSubscribers.filter(cb => cb !== setLocation);
  };

  const setTrackingMode = async (mode) => {
    await stopTracking();
    setTracking(mode);
    await AsyncStorage.setItem('location_tracking', mode);
    await startTracking();
  };

  return (
    <LocationContext.Provider value={{
      location,
      tracking,
      permissionStatus,
      startTracking,
      stopTracking,
      setTrackingMode,
      requestPermissions
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};




