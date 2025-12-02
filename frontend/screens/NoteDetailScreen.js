import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { notesApi } from '../lib/api';

export default function NoteDetailScreen({ note, onClose }) {
  const [noteDetail, setNoteDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    fetchNoteDetail();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, []);

  const fetchNoteDetail = async () => {
    try {
      const data = await notesApi.getOne(note.id);
      setNoteDetail(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load note');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (audioUrl, id) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingId === id) {
          setPlayingId(null);
          return;
        }
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setSound(newSound);
      setPlayingId(id);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlayingId(null);
      });
      
      await newSound.playAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    setSubmitting(true);
    try {
      await notesApi.createReply(note.id, {
        type: 'text',
        content: replyText.trim()
      });
      setReplyText('');
      fetchNoteDetail();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${hours}h ago`;
  };

  const renderReply = ({ item, index }) => (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <Text style={styles.replyNumber}>#{index + 1}</Text>
        <Text style={styles.replyTime}>{formatTime(item.created_at)}</Text>
      </View>
      {item.type === 'text' ? (
        <Text style={styles.replyContent}>{item.content}</Text>
      ) : (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playAudio(item.audio_url, item.id)}
        >
          <Text style={styles.playIcon}>{playingId === item.id ? '⏸️' : '▶️'}</Text>
          <Text style={styles.playText}>
            {playingId === item.id ? 'Playing...' : 'Play reply'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thread</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={noteDetail?.replies || []}
        keyExtractor={(item) => item.id}
        renderItem={renderReply}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.originalNote}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteType}>
                {noteDetail?.type === 'voice' ? '🎤 Voice' : '💬 Text'}
              </Text>
              <Text style={styles.noteTime}>{formatTime(noteDetail?.created_at)}</Text>
            </View>
            {noteDetail?.type === 'text' ? (
              <Text style={styles.noteContent}>{noteDetail?.content}</Text>
            ) : (
              <TouchableOpacity
                style={styles.playButtonLarge}
                onPress={() => playAudio(noteDetail?.audio_url, 'main')}
              >
                <Text style={styles.playIconLarge}>
                  {playingId === 'main' ? '⏸️' : '▶️'}
                </Text>
                <Text style={styles.playTextLarge}>
                  {playingId === 'main' ? 'Playing...' : 'Play Voice Note'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.divider}>
              <Text style={styles.dividerText}>
                {noteDetail?.replies?.length || 0} replies
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyReplies}>
            <Text style={styles.emptyText}>No replies yet</Text>
            <Text style={styles.emptySubtext}>Be the first to respond</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a reply..."
          placeholderTextColor="#555"
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
          onPress={handleReply}
          disabled={!replyText.trim() || submitting}
        >
          <Text style={styles.sendButtonText}>{submitting ? '...' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  loadingText: {
    color: '#888'
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
  originalNote: {
    backgroundColor: '#151515',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4ecdc4'
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  noteType: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600'
  },
  noteTime: {
    color: '#666',
    fontSize: 12
  },
  noteContent: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 24
  },
  playButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8
  },
  playIconLarge: {
    fontSize: 24,
    marginRight: 12
  },
  playTextLarge: {
    color: '#888',
    fontSize: 16
  },
  divider: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#222'
  },
  dividerText: {
    color: '#666',
    fontSize: 13
  },
  replyCard: {
    backgroundColor: '#151515',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  replyNumber: {
    color: '#555',
    fontSize: 12
  },
  replyTime: {
    color: '#555',
    fontSize: 12
  },
  replyContent: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 6
  },
  playIcon: {
    fontSize: 16,
    marginRight: 8
  },
  playText: {
    color: '#888',
    fontSize: 14
  },
  emptyReplies: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#666',
    fontSize: 16
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 5
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#333'
  },
  sendButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700'
  }
});




