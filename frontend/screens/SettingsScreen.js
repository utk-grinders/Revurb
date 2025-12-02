import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { settingsApi } from '../lib/api';

export default function SettingsScreen({ onClose }) {
  const { signOut, user } = useAuth();
  const { tracking, setTrackingMode } = useLocation();
  const [backgroundTracking, setBackgroundTracking] = useState(tracking === 'background');
  const [saving, setSaving] = useState(false);

  const handleTrackingToggle = async (value) => {
    const mode = value ? 'background' : 'foreground';
    setBackgroundTracking(value);
    setSaving(true);
    
    try {
      await setTrackingMode(mode);
      await settingsApi.update({ location_tracking: mode });
    } catch (error) {
      setBackgroundTracking(!value);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Background Tracking</Text>
              <Text style={styles.settingDescription}>
                Get notified when you're near notes, even when app is closed
              </Text>
            </View>
            <Switch
              value={backgroundTracking}
              onValueChange={handleTrackingToggle}
              trackColor={{ false: '#333', true: '#4ecdc4' }}
              thumbColor={backgroundTracking ? '#fff' : '#888'}
              disabled={saving}
            />
          </View>
          <Text style={styles.settingNote}>
            {backgroundTracking 
              ? '📍 Location is tracked in background' 
              : '📍 Location only tracked when app is open'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountInfo}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Note Radius</Text>
            <Text style={styles.aboutValue}>0.2 miles</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Note Duration</Text>
            <Text style={styles.aboutValue}>24 hours</Text>
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 35
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151515',
    padding: 15,
    borderRadius: 12
  },
  settingInfo: {
    flex: 1,
    marginRight: 15
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },
  settingDescription: {
    color: '#666',
    fontSize: 13,
    marginTop: 4
  },
  settingNote: {
    color: '#555',
    fontSize: 12,
    marginTop: 10,
    marginLeft: 5
  },
  accountInfo: {
    backgroundColor: '#151515',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12
  },
  email: {
    color: '#fff',
    fontSize: 15
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  signOutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600'
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#151515',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8
  },
  aboutLabel: {
    color: '#888',
    fontSize: 15
  },
  aboutValue: {
    color: '#fff',
    fontSize: 15
  }
});




