import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl
} from 'react-native';
import { Audio } from 'expo-av';
import { notesApi } from '../lib/api';

export default function MyNotesScreen({ onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    fetchMyNotes();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const fetchMyNotes = async () => {
    try {
      const data = await notesApi.getMine();
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notesApi.delete(noteId);
              setNotes(notes.filter(n => n.id !== noteId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          }
        }
      ]
    );
  };

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
        if (status.didJustFinish) setPlayingId(null);
      });
      
      await newSound.playAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const formatTimeRemaining = (expiresAt) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const renderNote = ({ item }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <View style={styles.typeIndicator}>
          <Text style={styles.typeIcon}>{item.type === 'voice' ? '🎤' : '💬'}</Text>
        </View>
        <Text style={styles.expires}>{formatTimeRemaining(item.expires_at)}</Text>
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
            {playingId === item.id ? 'Playing...' : 'Play'}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Notes</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchMyNotes} />
        }
        contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No active notes</Text>
              <Text style={styles.emptySubtext}>Your notes appear here for 24 hours</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a'
  },
  backButton: {
    color: '#4ecdc4',
    fontSize: 16
  },
  title: {
    color: '#fff',
    fontSize: 18,
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
  loadingText: {
    color: '#888'
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
    justifyContent: 'space-between',
    marginBottom: 10
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center'
  },
  typeIcon: {
    fontSize: 16
  },
  expires: {
    color: '#ff9f43',
    fontSize: 13,
    fontWeight: '500'
  },
  noteContent: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  playIcon: {
    fontSize: 18,
    marginRight: 10
  },
  playText: {
    color: '#888',
    fontSize: 14
  },
  deleteButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 6
  },
  deleteText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500'
  }
});




