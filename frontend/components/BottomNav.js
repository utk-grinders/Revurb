import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BottomNav({ activeScreen, onNavigate }) {
  const tabs = [
    { id: 'notes', icon: '🎧', label: 'Nearby' },
    { id: 'myNotes', icon: '📝', label: 'My Notes' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onNavigate(tab.id)}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[
            styles.label,
            activeScreen === tab.id && styles.labelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingBottom: 25,
    paddingTop: 10
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  icon: {
    fontSize: 22,
    marginBottom: 4
  },
  label: {
    fontSize: 11,
    color: '#555'
  },
  labelActive: {
    color: '#4ecdc4'
  }
});




