# Revurb Frontend

## Setup

1. Copy `.env` and add your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Install dependencies (already done):
```bash
npm install
```

3. Run:
```bash
npx expo start
```

Press `a` for Android emulator or scan QR code with Expo Go.

## Structure

- `App.js` - Main app with auth routing
- `lib/supabase.js` - Supabase client
- `contexts/AuthContext.js` - Auth state management
- `screens/LoginScreen.js` - Google sign-in
- `screens/HomeScreen.js` - Hello World after login
- `components/LoadingScreen.js` - Loading state



