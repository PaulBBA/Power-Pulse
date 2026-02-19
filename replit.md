# BBA Energy Manager

## Overview

BBA Energy Manager is a web-based energy monitoring and reporting system designed to help organizations analyze energy usage and reduce costs. The application follows a hierarchical 3-level data structure: **Groups → Sites → Data Sets (Meters)**. It supports multiple utility types including Electricity, Gas, Water, Oil, and Solid Fuel with capabilities for invoice data management and meter readings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a page-based structure with shared layout components. Pages include Dashboard, Groups, Sites, Meters, Import, Admin, and Authentication.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Style**: RESTful JSON endpoints under `/api/*`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Connection**: Neon serverless PostgreSQL driver

The server handles API routes and serves the built frontend in production. Development mode uses Vite's dev server with HMR.

### Data Model
The core hierarchy consists of:
1. **Groups** - Organizational groupings for sites
2. **Sites** - Physical locations/buildings with address, coordinates, contact info
3. **Data Sets** - Individual meters/utility accounts within sites (with utility-specific fields for electricity, gas, water)
4. **Contracts** - Supply contracts linked to meters (dataSetId), with rates, kWh splits, reactive power, VAT, and flags from old EMSQL Contracts table
5. **Contract Charges** - Additional charge lines linked to contracts, with charge type, rate, and tolerance fields
6. **Data Records** - Unified table for all utility billing records (electricity/gas/water) with 100+ fields covering meter readings, costs, splits, reactive power, DUOS/TUOS, and utility-specific charges
7. **Data Profiles** - Half-hourly interval data (48 intervals per day) for electricity meters, with day totals and type flags

8. **SFTP Configs** - SFTP connection configurations for automated profile data downloads from external data collectors
9. **SFTP Download Logs** - Tracks files downloaded via SFTP with links to import logs

10. **User Groups** - Junction table (user_groups) linking users to groups for role-based access control

Supporting lookup tables include site status, utilities, suppliers, and charge types.

### Authentication & Role-Based Access Control (RBAC)
- **Authentication**: Passport.js with local strategy, session-based auth
- **Three access levels**:
  - **Viewer** (default): Read-only access to assigned groups, sites, and meters. Cannot access Admin or Import pages.
  - **Editor**: Can edit sites and meters within assigned groups. Can import data. Cannot access Admin page.
  - **Admin**: Full unrestricted access to all groups, sites, meters, and admin functions.
- **Group-based filtering**: Non-admin users are assigned specific groups via the `user_groups` table. API routes filter data (groups, sites, meters, data sets) to only return items within the user's assigned groups.
- **Middleware**: `requireAuth`, `requireAdmin`, `requireEditorOrAdmin` middleware functions protect API routes server-side.
- **Frontend protection**: `ProtectedRoute` component with `allowedRoles` prop gates route access. Layout nav hides Admin/Import for unauthorized roles.

Future considerations:
- Parent-child hierarchy (parentId on sites, data_sets, groups) for sub-sites and sub-meters — to be added later

### Build and Development
- Development: `npm run dev` starts the Express server with Vite middleware
- Production: `npm run build` compiles both client (Vite) and server (esbuild) to `dist/`
- Database migrations: `npm run db:push` uses Drizzle Kit

## External Dependencies

### Database
- **PostgreSQL** via Neon serverless - connection string from `DATABASE_URL` environment variable
- **Drizzle ORM** for type-safe database operations and schema management

### Frontend Libraries
- **@tanstack/react-query** - Data fetching and caching
- **@radix-ui/** components - Accessible UI primitives
- **recharts** - Charting library
- **xlsx** - Excel file export functionality
- **date-fns** - Date formatting utilities

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** - Error display in development
- **@replit/vite-plugin-cartographer** - Development tooling (dev only)
- **@replit/vite-plugin-dev-banner** - Development banner (dev only)