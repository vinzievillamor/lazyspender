## Project Overview

This is a mobile application for tracking financial activities, built with React Native and Expo.

### Starting the Development Server

```bash
cd frontend
npm start              # Start with tunnel mode (default)
npm run android        # Start and open on Android emulator
npm run ios           # Start and open on iOS simulator
npm run web           # Start and open in web browser
```

Note: The default `npm start` uses `--tunnel` mode for easier mobile device testing.

### Code Quality

```bash
npm run lint          # Run ESLint
```

### Key Technologies

- **React Native 0.81.5** with **React 19.1.0**
- **Expo SDK ~54.0** with New Architecture enabled
- **Expo Router ~6.0** for navigation and routing
- **TypeScript ~5.9** with strict mode enabled
- **React Native Reanimated ~4.1** for animations
- **React Native Gesture Handler ~2.28** for gestures

## Development Notes

- The app uses file-based routing - add new screens by creating files in the `app/` directory
- Assets (images, fonts) should be placed in `assets/` directory
- The project uses Expo's automatic icon and splash screen generation
- Dark mode support is configured automatically (`userInterfaceStyle: "automatic"`)
- For frontend application, check if the component library being used is installed in the project first, before writing the implementation.