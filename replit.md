# Overview

DPO Fast is a comprehensive LGPD (Brazilian General Data Protection Law) compliance platform that enables businesses to assess their data protection readiness through interactive questionnaires, document management, and automated reporting. The platform provides compliance scoring, task management, and subscription-based access to premium features.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Authentication (OIDC) with session management
- **File Handling**: Multer for file uploads with configurable storage
- **API Design**: RESTful API with structured error handling and logging middleware

## Database Design
- **ORM**: Drizzle with PostgreSQL dialect for schema management and migrations
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Schema Structure**:
  - Users table with subscription status and Stripe integration fields
  - Questionnaire responses with compliance scoring
  - Document management with audit trails
  - Compliance tasks for tracking remediation items
  - Audit logs for security and compliance tracking

## Authentication & Authorization
- **Primary Auth**: Replit OIDC authentication with session-based state management
- **Session Management**: PostgreSQL-stored sessions with configurable TTL
- **Route Protection**: Middleware-based authentication checks for protected endpoints
- **User Context**: Persistent user state across application with automatic login redirection

## File Management
- **Upload Handling**: Multer with file type validation (PDF, DOCX, images)
- **File Constraints**: 10MB file size limit with extension-based filtering
- **Storage Strategy**: Local file system with unique filename generation

## API Structure
- **LGPD Questionnaire**: 10 predefined questions covering key LGPD compliance areas
- **Document Operations**: CRUD operations for compliance documents with user isolation
- **Dashboard Data**: Aggregated compliance metrics and task summaries
- **Compliance Tasks**: Automated task generation based on questionnaire responses

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Environment**: Requires DATABASE_URL environment variable for connection

## Payment Integration
- **Stripe**: Payment processing for subscription management (configured but not fully implemented)
- **Components**: React Stripe.js integration for checkout flows

## Development Tools
- **Replit Platform**: Development environment with specialized plugins for error overlay and cartographer
- **Build Tools**: ESBuild for server bundling, Vite for client-side development

## UI Component Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible components
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Server state management with caching and synchronization

## Validation & Type Safety
- **Zod**: Runtime type validation for API inputs and form data
- **TypeScript**: Full type safety across client and server with shared schema definitions

## Session & Security
- **OpenID Client**: OIDC authentication flow implementation
- **Passport**: Authentication middleware (configured for Replit auth)
- **Memoizee**: Caching for expensive operations like OIDC configuration