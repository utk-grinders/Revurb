import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { Audio } from 'expo-av';
import { useLocation } from '../contexts/LocationContext';
import { notesApi } from '../lib/api';

export default function NotesListScreen({ onNotePress, onCreatePress }) {
  const { location, startTracking, permissionStatus } = useLocation();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    startTracking();
  }, []);

  useEffect(() => {
    if (location) fetchNotes();
  }, [location]);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const fetchNotes = async () => {
    if (!location) return;
    
    try {
      const data = await notesApi.getNearby(location.latitude, location.longitude);
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [location]);

  const playAudio = async (audioUrl, noteId) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingId === noteId) {
          setPlayingId(null);
          return;
        }
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setSound(newSound);
      setPlayingId(noteId);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const formatDistance = (meters) => {
    if (meters < 100) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor(diff / (1000 * 60));
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
  };

  const renderNote = ({ item }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => onNotePress(item)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.typeIndicator}>
          <Text style={styles.typeIcon}>{item.type === 'voice' ? '🎤' : '💬'}</Text>
        </View>
        <View style={styles.noteMeta}>
          <Text style={styles.distance}>{formatDistance(item.distance_meters)}</Text>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
      
      {item.type === 'text' ? (
        <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
      ) : (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playAudio(item.audio_url, item.id)}
        >
          <Text style={styles.playIcon}>{playingId === item.id ? '⏸️' : '▶️'}</Text>
          <Text style={styles.playText}>
            {playingId === item.id ? 'Playing...' : 'Play Voice Note'}
          </Text>
        </TouchableOpacity>
      )}
      
      {item.reply_count > 0 && (
        <Text style={styles.replyCount}>{item.reply_count} replies</Text>
      )}
    </TouchableOpacity>
  );

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Location permission required</Text>
        <TouchableOpacity style={styles.retryButton} onPress={startTracking}>
          <Text style={styles.retryText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Notes</Text>
        {location && (
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔇</Text>
            <Text style={styles.emptyText}>No notes nearby</Text>
            <Text style={styles.emptySubtext}>Be the first to drop a note here!</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={onCreatePress}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff'
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  loadingText: {
    color: '#888',
    fontSize: 16
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontWeight: '600'
  },
  list: {
    padding: 15
  },
  emptyList: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600'
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 5
  },
  noteCard: {
    backgroundColor: '#151515',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222'
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  typeIcon: {
    fontSize: 16
  },
  noteMeta: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  distance: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600'
  },
  time: {
    color: '#666',
    fontSize: 12
  },
  noteContent: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8
  },
  playIcon: {
    fontSize: 18,
    marginRight: 10
  },
  playText: {
    color: '#888',
    fontSize: 14
  },
  replyCount: {
    color: '#666',
    fontSize: 12,
    marginTop: 10
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  fabIcon: {
    fontSize: 32,
    color: '#000',
    fontWeight: '300'
  }
});




