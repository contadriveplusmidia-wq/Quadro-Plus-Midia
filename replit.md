# DesignFlow Pro

## Overview

DesignFlow Pro is a design team productivity tracking system with role-based dashboards for designers and administrators. The application tracks design work sessions, demands, feedback, lessons, and generates comprehensive analytics. It features a React frontend with a Node.js/Express backend using PostgreSQL for data persistence.

The system enables designers to log their daily work (demands with multiple art types, quantities, and variations), while administrators can monitor team productivity, manage feedback, create educational content, and customize system settings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 19 with TypeScript
- React Router v7 for client-side routing (HashRouter)
- Recharts for data visualization
- Tailwind CSS for styling
- Lucide React for icons

**State Management:**
- Centralized AppContext (React Context API) managing all application state
- Single source of truth for users, art types, demands, work sessions, feedbacks, lessons, and system settings
- API calls abstracted through context methods

**Routing Structure:**
- Role-based private routes with authentication guards
- Designer routes: `/designer`, `/designer/feedbacks`, `/designer/lessons`
- Admin routes: `/admin`, `/admin/history`, `/admin/feedbacks`, `/admin/lessons`, `/admin/settings`
- Automatic redirection based on user role

**Key Design Patterns:**
- Component composition with Layout wrapper
- Custom hooks (useApp) for context access
- Protected routes with role validation
- Modal-based CRUD operations
- Real-time data filtering and aggregation

### Backend Architecture

**Technology Stack:**
- Node.js with Express 5 (single file architecture)
- TypeScript with tsx runtime
- PostgreSQL database with pg driver
- bcryptjs for password hashing
- CORS enabled for cross-origin requests

**API Design:**
- RESTful API structure at `/api/*` endpoints
- Single serverless function (`/api/index.ts`) for Vercel Hobby plan compatibility
- All routes in one Express app exported as Vercel handler
- Works both locally (Express server on port 3001) and on Vercel (serverless)

**API Endpoints:**
- `POST /api/auth/login` - User authentication
- `GET/POST /api/users` - User listing and creation
- `GET /api/users/designers` - List designers only
- `PUT/DELETE /api/users/:id` - User update and delete
- `GET/POST /api/art-types` - Art type management
- `PUT /api/art-types/reorder` - Reorder art types
- `PUT/DELETE /api/art-types/:id` - Art type update and delete
- `GET/POST /api/work-sessions` - Work session management
- `GET/POST /api/demands` - Demand submissions
- `DELETE /api/demands/:id` - Remove demand
- `GET/POST /api/feedbacks` - Feedback management
- `PUT /api/feedbacks/:id/view` - Mark feedback as viewed
- `DELETE /api/feedbacks/:id` - Remove feedback
- `GET/POST /api/lessons` - Lesson management
- `PUT/DELETE /api/lessons/:id` - Lesson update and delete
- `GET /api/lesson-progress/:designerId` - Get progress
- `POST /api/lesson-progress` - Save progress
- `GET/PUT /api/settings` - System settings
- `GET /api/health` - Health check

**Database Schema:**
- **users**: Stores designer and admin accounts with hashed passwords, avatar customization, and active status
- **art_types**: Configurable art categories with points and drag-drop ordering
- **demands**: Work submissions linking to users with timestamp tracking
- **demand_items**: Individual art items within demands (art type, quantity, variations)
- **work_sessions**: Daily clock-in records per designer
- **feedbacks**: Admin-to-designer feedback with images and viewed status
- **lessons**: Educational videos with metadata
- **lesson_progress**: Tracks which designers viewed which lessons
- **system_settings**: Branding, logo, variation points configuration

**Security & Authentication:**
- Password hashing using bcryptjs with salt rounds
- Session-based authentication (user data returned on login)
- Role-based authorization checks
- Active user filtering

### Data Flow

**Authentication Flow:**
1. User submits credentials via Login page
2. Backend validates against hashed passwords in PostgreSQL
3. Successful login returns user object (without password)
4. Frontend stores currentUser in context and redirects based on role

**Demand Creation Flow:**
1. Designer adds multiple art items (type, quantity, variations)
2. Frontend calculates total points using variation points from settings
3. Demand submitted to backend with all items
4. Backend atomically inserts demand and demand_items records
5. Context refreshes to show updated data

**Admin Filtering:**
- Time-based filters: today, yesterday, weekly, monthly, yearly, custom range
- Designer-specific filters for history and analytics
- Computed aggregations for dashboard metrics (total points, arts, sessions)

## Deployment

### Vercel Deployment

**Configuration (`vercel.json`):**
```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" }
  ],
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

**Database Setup:**
1. Create a Neon PostgreSQL database
2. Import `database_export.sql` schema
3. Add `DATABASE_URL` to Vercel environment variables

**Deploy Steps:**
1. Connect repository to Vercel
2. Configure environment variables (DATABASE_URL)
3. Deploy - Vercel auto-detects Vite and the single serverless function

### Local Development

Run `npm run dev` which starts:
1. Express API server on port 3001 (`api/index.ts`)
2. Vite dev server on port 5000 with proxy to API

## External Dependencies

### Third-Party Libraries

**Frontend:**
- `react` & `react-dom`: UI framework
- `react-router-dom`: Client-side routing with hash-based navigation
- `recharts`: Chart rendering (bar charts, pie charts for analytics)
- `lucide-react`: Icon library
- `tailwindcss`: Utility-first CSS framework (loaded via CDN in development)

**Backend:**
- `express`: Web framework
- `pg`: PostgreSQL client
- `bcryptjs`: Password hashing
- `cors`: Cross-origin resource sharing

**Development Tools:**
- `vite`: Build tool and dev server
- `tsx`: TypeScript execution for backend
- `concurrently`: Run multiple npm scripts simultaneously
- `wait-on`: Wait for server health check before starting frontend
- `typescript`: Type checking
- `@vitejs/plugin-react`: React fast refresh support

### Database

**PostgreSQL:**
- Primary data store for all application data
- Connection via `DATABASE_URL` environment variable
- SSL enabled for production (Neon/Vercel)
- Schema available in `database_export.sql`

### Asset Handling

**Image Storage:**
- Base64 encoding for logo and feedback images stored directly in database
- Avatar URLs use ui-avatars.com API for generated avatars with custom colors

### External APIs

**UI Avatars:**
- Service: `https://ui-avatars.com/api/`
- Purpose: Generate default user avatars with initials and custom background colors
- Used when users don't upload custom avatars

**YouTube Embeds:**
- Lessons support YouTube video URLs
- Frontend extracts video IDs and generates embed URLs
- Supports formats: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`

### Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string (with SSL for production)

## Recent Changes

- Consolidated all serverless functions into single `/api/index.ts` file
- Compatible with Vercel Hobby plan (max 12 functions limit)
- Updated `vercel.json` with rewrites to route all `/api/*` to single function
- Removed separate serverless function files
- Backend works both locally (Express server) and on Vercel (serverless)
- Added localStorage persistence for user session (prevents logout on refresh)
- Automatic work-session registration when designers log in
- Password change functionality in admin settings (Security tab)
- Unviewed feedback badge on designer menu
- Full-screen image modal with navigation in feedbacks
- **Dev-only admin login bypass**: In development (NODE_ENV !== 'production'), admin can login with plain-text password '123456'
- **Cascade DELETE for users**: Deleting a designer removes all related records (work_sessions, demands, demand_items, feedbacks, lesson_progress) in a transaction
