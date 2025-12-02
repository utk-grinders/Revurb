import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import LoginScreen from './screens/LoginScreen';
import LoadingScreen from './components/LoadingScreen';
import NotesListScreen from './screens/NotesListScreen';
import CreateNoteScreen from './screens/CreateNoteScreen';
import NoteDetailScreen from './screens/NoteDetailScreen';
import MyNotesScreen from './screens/MyNotesScreen';
import SettingsScreen from './screens/SettingsScreen';
import BottomNav from './components/BottomNav';

function MainApp() {
  const [screen, setScreen] = useState('notes');
  const [selectedNote, setSelectedNote] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNotePress = (note) => {
    setSelectedNote(note);
    setScreen('noteDetail');
  };

  const handleNoteCreated = () => {
    setScreen('notes');
    setRefreshKey(k => k + 1);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'notes':
        return (
          <NotesListScreen
            key={refreshKey}
            onNotePress={handleNotePress}
            onCreatePress={() => setScreen('create')}
          />
        );
      case 'create':
        return (
          <CreateNoteScreen
            onClose={() => setScreen('notes')}
            onCreated={handleNoteCreated}
          />
        );
      case 'noteDetail':
        return (
          <NoteDetailScreen
            note={selectedNote}
            onClose={() => setScreen('notes')}
          />
        );
      case 'myNotes':
        return <MyNotesScreen onClose={() => setScreen('notes')} />;
      case 'settings':
        return <SettingsScreen onClose={() => setScreen('notes')} />;
      default:
        return null;
    }
  };

  const showBottomNav = ['notes', 'myNotes', 'settings'].includes(screen);

  return (
    <View style={styles.container}>
      {renderScreen()}
      {showBottomNav && (
        <BottomNav
          activeScreen={screen}
          onNavigate={setScreen}
        />
      )}
    </View>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <LocationProvider>
      <MainApp />
    </LocationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a'
  }
});
