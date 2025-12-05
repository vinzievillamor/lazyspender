## Project Overview

LazySpender is a mobile application for tracking financial activities, built with React Native (Expo) for the frontend and Spring Boot for the backend, using Google Firestore as the database.

## Architecture

### Frontend (Mobile App)
- **Framework**: React Native 0.81.5 with React 19.1.0
- **Platform**: Expo SDK ~54.0 with New Architecture enabled
- **Language**: TypeScript ~5.9 (strict mode)

### Backend (API Server)
- **Framework**: Spring Boot 4.0.0
- **Language**: Java 25
- **Build Tool**: Gradle
- **Dependencies**: Spring Web MVC, Lombok, Spring DevTools

### Database
- **Database**: Google Firestore (NoSQL document database)
- **Local Development**: Firestore Emulator via Docker
- **Emulator Port**: 8081
- **Project ID**: lazyspender-local

---

## Getting Started

### Prerequisites
- Node.js and npm (for frontend)
- Java 25 (for backend)
- Docker and Docker Compose (for Firestore emulator)
- Expo CLI
- Android Studio or Xcode (for mobile development)

### Starting the Development Environment

#### 1. Start Database (Firestore Emulator)
```bash
docker-compose up -d
```

The Firestore emulator will be available at `http://localhost:8081`.

#### 2. Start Backend Server
```bash
cd backend
./gradlew bootRun         # Unix/Mac
# or
gradlew.bat bootRun       # Windows
```

#### 3. Start Frontend Development Server
```bash
cd frontend
npm start                 # Start with tunnel mode (default)
npm run android           # Start and open on Android emulator
npm run ios              # Start and open on iOS simulator
npm run web              # Start and open in web browser
```

Note: The default `npm start` uses `--tunnel` mode for easier mobile device testing.

### Stopping Services
```bash
docker-compose down       # Stop Firestore emulator
```

---

## Frontend Development

### Key Technologies
- **React Native 0.81.5** with **React 19.1.0**
- **Expo SDK ~54.0** with New Architecture enabled
- **Expo Router ~6.0** for navigation and routing
- **TypeScript ~5.9** with strict mode enabled
- **React Native Reanimated ~4.1** for animations
- **React Native Gesture Handler ~2.28** for gestures
- **@shopify/flash-list 2.0.2** for performant lists
- **@react-navigation/*** for navigation components

### Code Quality
```bash
cd frontend
npm run lint             # Run ESLint
```

### Project Structure
```
frontend/
├── app/                 # File-based routing screens
├── components/          # Reusable React components
├── types/              # TypeScript type definitions
├── assets/             # Images, fonts, and static files
└── scripts/            # Build and utility scripts
```

### React Best Practices (MANDATORY)

#### Component Organization
- **ALWAYS create separate component files** instead of putting everything in a single file
- Keep components small and focused on a single responsibility
- Use the `components/` directory for all reusable components
- Group related components in subdirectories (e.g., `components/forms/`, `components/cards/`)

**Example: Good Structure**
```
components/
├── common/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── records/
│   ├── RecordList.tsx
│   ├── RecordItem.tsx
│   └── RecordForm.tsx
└── dashboard/
    ├── DashboardHeader.tsx
    └── DashboardStats.tsx
```

#### Separation of Concerns
- **Domain Models**: Define data models and types in `types/` directory
- **Business Logic**: Create custom hooks in `hooks/` directory (create if needed)
- **API Calls**: Create service files in `services/` directory (create if needed)
- **Constants**: Store constants in `constants/` directory (create if needed)
- **Utilities**: Put helper functions in `utils/` directory (create if needed)

#### TypeScript Best Practices
- **Always define prop types** for all components
- Use **interfaces** for props and data models
- Avoid using `any` type - use proper typing or `unknown`
- Create shared types in `types/` directory
- Use **generic types** where applicable

#### Code Style
- Use **meaningful variable and function names**
- Keep functions small and focused
- Add **JSDoc comments** for complex functions
- Follow **consistent naming conventions**:
  - Components: PascalCase (e.g., `RecordList.tsx`)
  - Hooks: camelCase with 'use' prefix (e.g., `useAuth.ts`)
  - Utilities: camelCase (e.g., `formatCurrency.ts`)
  - Types: PascalCase (e.g., `UserType`, `RecordInterface`)

#### File Naming Conventions
- Component files: `ComponentName.tsx`
- Hook files: `useHookName.ts`
- Type files: `modelName.types.ts` or `types.ts`
- Service files: `serviceName.service.ts`
- Utility files: `utilityName.util.ts`

#### Component Library Usage
- **ALWAYS check if a component library is installed** before implementing custom components
- Prefer using existing components from installed libraries:
  - `@expo/vector-icons` for icons
  - `@react-navigation/*` for navigation components
  - Check `package.json` for available libraries
- Only create custom components when necessary

### Development Notes
- The app uses **file-based routing** - add new screens by creating files in the `app/` directory
- Assets (images, fonts) should be placed in `assets/` directory
- The project uses Expo's automatic icon and splash screen generation
- Dark mode support is configured automatically (`userInterfaceStyle: "automatic"`)
- Use **Expo modules** where possible for better compatibility

---

## Backend Development

### Project Structure
```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/lazyspender/backend/
│   │   │   ├── controller/    # REST API controllers
│   │   │   ├── service/       # Business logic
│   │   │   ├── model/         # Domain models
│   │   │   ├── repository/    # Data access layer
│   │   │   ├── config/        # Configuration classes
│   │   │   └── BackendApplication.java
│   │   └── resources/
│   │       └── application.properties
│   └── test/
└── build.gradle

```

### Running Backend Commands
```bash
cd backend

# Run the application
./gradlew bootRun

# Build the project
./gradlew build

# Run tests
./gradlew test

# Clean build
./gradlew clean build
```

### Backend Best Practices
- Use **Lombok** annotations to reduce boilerplate (`@Data`, `@Builder`, etc.)
- Implement proper **exception handling** with `@ControllerAdvice`
- Use **DTOs** (Data Transfer Objects) for API requests/responses
- Implement **validation** with Bean Validation annotations
- Follow **REST API conventions** for endpoints
- Use **service layer** for business logic (keep controllers thin)
- Implement **logging** with SLF4J
- Use **Spring Boot DevTools** for hot reload during development

---

## Database

### Firestore Setup
The project uses **Google Cloud Firestore**, a NoSQL document database. For local development, we use the Firestore Emulator.

#### Connecting to Firestore
- **Production**: Configure Firestore credentials in backend
- **Local Development**: Firestore Emulator runs on `localhost:8081`
- **Project ID**: `lazyspender-local` (for emulator)

#### Data Persistence
- Emulator data is persisted in Docker volume `firestore-data`
- To reset data: `docker-compose down -v` (removes volumes)

### Firestore Best Practices
- Design denormalized data structures (NoSQL pattern)
- Use subcollections for nested data
- Implement proper indexing for queries
- Use batch operations for multiple writes
- Implement security rules (for production)

---

## Deployment

### Backend Deployment
- Build JAR: `./gradlew build`
- JAR location: `backend/build/libs/backend-0.0.1-SNAPSHOT.jar`
- Run JAR: `java -jar backend-0.0.1-SNAPSHOT.jar`

### Frontend Deployment
- Build for production: `npm run build` (when configured)
- Expo builds: Use EAS (Expo Application Services)
- Configure environment variables for production API endpoints

---

## Environment Variables

### Frontend
Create `.env` file in `frontend/` directory:
```
API_BASE_URL=http://localhost:8080
FIRESTORE_EMULATOR_HOST=localhost:8081
```

---

## Troubleshooting

### Firestore Emulator Issues
- Check if Docker is running: `docker ps`
- View emulator logs: `docker logs firestore-emulator`
- Restart emulator: `docker-compose restart firestore`

### Backend Issues
- Check Java version: `java -version` (should be 25)
- Clean build: `./gradlew clean build`
- Check port 8080 is available

### Frontend Issues
- Clear Expo cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Metro bundler is running

---

### Code Quality Tools
- ESLint for frontend code quality
- Consider adding Prettier for code formatting
- Consider adding Husky for Git hooks
- Consider adding Jest for testing