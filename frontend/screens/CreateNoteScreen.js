import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { useLocation } from '../contexts/LocationContext';
import { notesApi } from '../lib/api';

export default function CreateNoteScreen({ onClose, onCreated }) {
  const { location } = useLocation();
  const [type, setType] = useState('text');
  const [content, setContent] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);
      
      intervalRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    clearInterval(intervalRef.current);
    setIsRecording(false);
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordingUri(uri);
    setRecording(null);
  };

  const clearRecording = () => {
    setRecordingUri(null);
    setDuration(0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    if (type === 'text' && !content.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    if (type === 'voice' && !recordingUri) {
      Alert.alert('Error', 'Please record a voice note');
      return;
    }

    setSubmitting(true);
    
    try {
      const noteData = {
        type,
        latitude: location.latitude,
        longitude: location.longitude
      };

      if (type === 'text') {
        noteData.content = content.trim();
      } else {
        noteData.audio = { uri: recordingUri };
      }

      await notesApi.create(noteData);
      onCreated();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Note</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
          <Text style={[styles.postButton, submitting && styles.postButtonDisabled]}>
            {submitting ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeTab, type === 'text' && styles.typeTabActive]}
          onPress={() => setType('text')}
        >
          <Text style={[styles.typeTabText, type === 'text' && styles.typeTabTextActive]}>
            💬 Text
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeTab, type === 'voice' && styles.typeTabActive]}
          onPress={() => setType('voice')}
        >
          <Text style={[styles.typeTabText, type === 'voice' && styles.typeTabTextActive]}>
            🎤 Voice
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {type === 'text' ? (
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#555"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            autoFocus
          />
        ) : (
          <View style={styles.voiceContainer}>
            {recordingUri ? (
              <View style={styles.recordedContainer}>
                <Text style={styles.recordedIcon}>✓</Text>
                <Text style={styles.recordedText}>Recording saved</Text>
                <Text style={styles.recordedDuration}>{formatDuration(duration)}</Text>
                <TouchableOpacity style={styles.clearButton} onPress={clearRecording}>
                  <Text style={styles.clearButtonText}>Re-record</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.recordContainer}>
                <TouchableOpacity
                  style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <View style={[styles.recordDot, isRecording && styles.recordDotActive]} />
                </TouchableOpacity>
                <Text style={styles.recordText}>
                  {isRecording ? formatDuration(duration) : 'Tap to record'}
                </Text>
                {isRecording && (
                  <Text style={styles.recordHint}>Tap again to stop</Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 Will be visible within 0.2 miles • Expires in 24h
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
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
  closeButton: {
    color: '#888',
    fontSize: 16
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  postButton: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600'
  },
  postButtonDisabled: {
    opacity: 0.5
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  typeTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#151515',
    alignItems: 'center'
  },
  typeTabActive: {
    backgroundColor: '#1a2f2d'
  },
  typeTabText: {
    color: '#666',
    fontSize: 15
  },
  typeTabTextActive: {
    color: '#4ecdc4'
  },
  content: {
    flex: 1,
    padding: 15
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    textAlignVertical: 'top',
    lineHeight: 26
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  recordContainer: {
    alignItems: 'center'
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#333'
  },
  recordButtonActive: {
    borderColor: '#ff6b6b'
  },
  recordDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b'
  },
  recordDotActive: {
    borderRadius: 8,
    width: 30,
    height: 30
  },
  recordText: {
    color: '#888',
    fontSize: 16,
    marginTop: 20
  },
  recordHint: {
    color: '#555',
    fontSize: 14,
    marginTop: 8
  },
  recordedContainer: {
    alignItems: 'center'
  },
  recordedIcon: {
    fontSize: 48,
    color: '#4ecdc4',
    marginBottom: 15
  },
  recordedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  recordedDuration: {
    color: '#666',
    fontSize: 14,
    marginTop: 5
  },
  clearButton: {
    marginTop: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 8
  },
  clearButtonText: {
    color: '#888',
    fontSize: 14
  },
  locationInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a'
  },
  locationText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center'
  }
});




