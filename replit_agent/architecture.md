# SyncFit Architecture

## Overview

SyncFit is a fitness scheduling application that helps users find optimal workout times based on their calendar availability. The application leverages Google Calendar integration and machine learning to recommend time slots that fit users' schedules and preferences. The system includes features such as intelligent scheduling, workout tracking, and calendar synchronization.

The application is built as a full-stack web application with a React frontend and a Node.js backend, using Firebase for authentication and Firestore for data storage. It also integrates with Google Calendar for scheduling workouts.

## System Architecture

SyncFit follows a client-server architecture with the following high-level components:

1. **Frontend**: React-based single-page application with TypeScript
2. **Backend**: Express.js server with TypeScript
3. **Database**: PostgreSQL with Drizzle ORM and Firestore for different types of data
4. **Authentication**: Firebase Authentication with Google provider
5. **External APIs**: Google Calendar API for calendar integration

The system is designed to be deployed on Replit, with specific configuration for both development and production environments.

### Architecture Diagram

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│               │      │               │      │               │
│   Frontend    │──────│    Backend    │──────│  PostgreSQL   │
│   (React)     │      │  (Express.js) │      │   (Drizzle)   │
│               │      │               │      │               │
└───────┬───────┘      └───────┬───────┘      └───────────────┘
        │                      │                      
        │                      │                      
┌───────▼───────┐      ┌───────▼───────┐      ┌───────────────┐
│               │      │               │      │               │
│    Firebase   │      │   Firestore   │      │Google Calendar│
│ Authentication│      │    Database   │      │      API      │
│               │      │               │      │               │
└───────────────┘      └───────────────┘      └───────────────┘
```

## Key Components

### Frontend (Client)

The frontend is built with React and TypeScript, utilizing modern React patterns and libraries:

- **UI Framework**: Custom UI components built with Tailwind CSS and Radix UI primitives (shadcn/ui)
- **State Management**: React Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **API Communication**: Fetch API with custom wrapper for API requests
- **Authentication**: Firebase Authentication integration
- **Charts/Data Visualization**: Recharts for statistical data visualization

Key frontend components include:
- Dashboard (workout overview and scheduling)
- Calendar integration and visualization
- Workout exploration and scheduling
- Statistics and progress tracking
- User profile and preferences

### Backend (Server)

The backend is built with Express.js and TypeScript:

- **API Server**: Express.js for RESTful API endpoints
- **Database Access**: Drizzle ORM for PostgreSQL and Firebase Admin SDK for Firestore
- **Authentication**: Firebase Admin SDK for verifying authentication
- **External APIs**: Google Calendar API integration for workout scheduling

The server provides APIs for:
- User management
- Workout scheduling and management
- Calendar integration and availability checking
- Learning mode for intelligent time slot recommendations
- User preferences and settings

### Database

The system uses a dual database approach:

1. **PostgreSQL with Drizzle ORM**:
   - User profiles
   - Workout definitions
   - Workout categories
   - Scheduled workouts
   - User preferences

2. **Firestore**:
   - Calendar event synchronization
   - Learning mode statistics
   - Real-time data that benefits from Firestore's real-time capabilities

The database schema includes tables for users, workouts, workout categories, scheduled workouts, and more, with relationships between them.

### Authentication and Authorization

Authentication is handled through Firebase Authentication:

- Google Sign-In for user authentication
- Firebase Auth tokens for API authorization
- Session management for maintaining user state
- Server-side validation of Firebase ID tokens

The system includes configuration for securely deploying Firebase authentication in production environments.

### Learning Mode System

A key architectural component is the "Learning Mode" system:

- Tracks user workout patterns and completion rates
- Analyzes optimal time slots based on historical data
- Recommends time slots with highest probability of completion
- Provides a learning feedback loop to improve recommendations over time

## Data Flow

### Authentication Flow

1. User initiates Google Sign-In via Firebase Authentication
2. Firebase returns authentication token
3. Client sends token to server for validation
4. Server verifies token with Firebase Admin SDK
5. Server creates or updates user record in database
6. Server establishes session for authenticated user
7. Client stores authentication state for subsequent requests

### Workout Scheduling Flow

1. User selects workout and preferred time slot
2. Client validates time slot freshness (timestamp validation)
3. Request is sent to server with workout details and time slot
4. Server verifies user authentication and slot availability
5. Server creates scheduled workout in database
6. Server attempts to create event in Google Calendar
7. Server stores synchronization status in Firestore
8. Client receives confirmation and updates UI

### Intelligent Scheduling Flow

1. System analyzes user's calendar to find available time slots
2. Learning mode evaluates historical workout patterns and completion rates
3. Available slots are ranked based on probability of completion
4. Time slots are presented to user with recommendations
5. User selects preferred slot, which feeds back into the learning system
6. Completion/cancellation data is recorded to improve future recommendations

## External Dependencies

### Google Calendar API
- Used for fetching user's calendar data
- Creating and managing workout events
- Checking availability for scheduling

### Firebase
- Authentication via Google Sign-In
- Firestore for real-time data storage
- Firebase Admin SDK for server-side operations

### Cloud Infrastructure
- Replit for hosting and deployment
- PostgreSQL database (via Replit database integration)

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:

1. **Development Environment**:
   - Vite for frontend development with hot module reloading
   - Concurrent backend and frontend development

2. **Production Build**:
   - Frontend built with Vite
   - Backend compiled with esbuild
   - Static assets served by Express.js

3. **Deployment Configuration**:
   - Environment variables for Firebase and database configuration
   - Specific build and run commands for Replit
   - Custom domain configuration for Firebase Authentication

4. **Reliability Mechanisms**:
   - Timestamp validation to prevent conflicts in scheduling
   - Retry mechanisms for Google Calendar API operations
   - Error handling for calendar synchronization

The deployment process includes specific steps for setting up Firebase authentication domains and environment variables, as documented in the DEPLOYMENT.md file.

## Technical Debt and Future Improvements

1. **Offline Support**: Currently, the application requires an active internet connection. Adding offline capabilities would improve user experience.

2. **Test Coverage**: The test suite focuses on reliability layer and scheduling features. Expanding test coverage would improve reliability.

3. **Performance Optimization**: The application could benefit from further optimization of data fetching and rendering.

4. **Enhanced Learning Algorithms**: The learning mode system could be improved with more sophisticated algorithms for recommendations.