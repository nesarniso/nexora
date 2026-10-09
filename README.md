# Nexora

Nexora is a large-scale social networking platform built as a Laravel modular monolith with Inertia.js, React, TypeScript, Tailwind CSS, Redis, Horizon, Reverb, and S3-compatible object storage.

This repository is the foundation for developing the product according to the architecture and feature specification in the project document. The goal is to build a Facebook-like social platform with original branding, architecture, moderation policy, privacy controls, and trust & safety systems.

## 1. Product vision

Nexora should support:

- Personal profiles
- Friends and followers
- Posts, photos, albums, videos, reels and stories
- Comments, reactions, shares and messaging
- Groups, pages and events
- Marketplace and creator tools
- Search, notifications and feed personalization
- Admin control plane, moderation and trust & safety
- Privacy and security operations
- Monetization and ad infrastructure

The platform is designed to start as a modular monolith and only extract services when traffic and operational needs justify it.

## 2. Architecture principle

Use a Laravel modular monolith as the default architecture.

Do not start with a large microservice fleet. Instead, structure the app by business domain:

```text
Laravel Application
├── Auth
├── Users
├── Profiles
├── Social Graph
├── Posts
├── Comments
├── Reactions
├── Feed
├── Stories
├── Reels
├── Videos
├── Live
├── Groups
├── Pages
├── Events
├── Marketplace
├── Messaging
├── Notifications
├── Search
├── Ads
├── Monetization
├── Trust & Safety
├── Security Operations
├── Privacy
├── Analytics
├── AI
├── Admin Control Plane
└── Shared Infrastructure
```

Future extraction should be selective and only for workloads such as:

- Video processing
- Search
- Messaging
- Recommendation engine
- AI inference
- Notification service
- Feed generation

## 3. Recommended stack

### Backend
- Laravel 13+
- PHP 8.3+
- MySQL 8+ or PostgreSQL
- Redis for cache and queue
- Laravel Horizon for queues
- Laravel Reverb + Echo for realtime communication

### Frontend
- Inertia.js
- React
- TypeScript
- Tailwind CSS

### Mobile
- Flutter
- REST API / WebSocket based integration

### Storage and delivery
- S3-compatible object storage
- CDN (Cloudflare or equivalent)
- Temporary, private, public, quarantine and moderated storage zones

### Search and AI
- Database search initially
- OpenSearch / Elasticsearch at scale
- Dedicated AI services where business logic requires them

### Infrastructure
- Linux + Docker
- CI/CD pipeline
- WAF / security layer

## 4. Domain modules to build

The project should be developed by feature domain, not by arbitrary controller grouping.

### Core user and identity
- Registration and login
- Email / phone verification
- OTP and password recovery
- 2FA and backup codes
- Session/device management
- Account recovery and takeover protection
- Account security investigation

### Profiles and relationship graph
- Profile creation and editing
- Friends, followers and follow state machines
- Relationship safety and abuse prevention
- Privacy controls per field

### Content and media
- Posts, images, videos, stories, reels
- Media validation, moderation and storage pipeline
- Thumbnail generation, transcoding and CDN delivery
- Reactions, comments, sharing and saves

### Social features
- Feed generation
- Search and discovery
- Groups, pages, events and marketplace
- Creator tools and monetization features

### Trust & safety
- Moderation workflows
- Reporting pipelines
- AI safety checks
- Automated abuse detection
- Admin review and enforcement actions

### Administration
- User administration
- Content moderation tools
- Security event review
- Analytics and platform management

The admin content queue separates personal and group posts into a compact, filterable table. It supports author/text/ID search, media and date filters, bounded 25/50/100-row pages, and stable cursor navigation instead of loading both full feeds or relying on deep offset pages. MySQL and PostgreSQL use database full-text indexes for post text; SQLite uses a substring-search fallback for local development. Chronological indexes support queue ordering and date filtering.

## 5. Key product principles

### Security first
- Harden authentication and session management
- Rate limit abusive behaviors
- Use device trust and suspicious-login detection
- Protect account recovery and credential changes
- Centralize permission and privacy decisions

### Privacy by design
- Privacy should be configurable for profile, content and relationship fields
- Content visibility must be centralized and consistent
- Policy checks should not be duplicated across controllers

### Abuse resistance
- Protect against mass follows, friend requests, fake engagement and manipulation
- Use behavioral risk analysis and escalation flows
- Apply trust and safety checks before content publishes

### Scalability without premature service extraction
- Keep a modular monolith first
- Extract only the domains that become true bottlenecks

## 6. Frontend architecture

The web application should feel like a modern SPA while keeping Laravel as the backend orchestration engine.

Recommended frontend structure:

```text
resources/js/
├── components/
├── layouts/
├── pages/
├── features/
│   ├── auth/
│   ├── profile/
│   ├── posts/
│   ├── feed/
│   ├── stories/
│   ├── reels/
│   ├── groups/
│   ├── pages/
│   ├── marketplace/
│   ├── messaging/
│   ├── notifications/
│   ├── settings/
│   └── admin/
├── hooks/
├── lib/
├── types/
├── services/
└── app.jsx
```

## 7. Suggested engineering rules

These rules should guide implementation:

1. Build by domain module, not by generic folder dumping.
2. Keep business logic near the feature boundary.
3. Centralize privacy checks in a service layer.
4. Use state machines for relationship states like follow/friend statuses.
5. Keep media workflows safe, validated and reviewable.
6. Prefer reusable shared services for analytics, moderation and notifications.
7. Keep the application deployable and testable from day one.
8. Only extract services after domain load proves it is necessary.

Example privacy policy pattern:

```php
PrivacyService::canViewPost($user, $post);
```

This prevents duplicated visibility logic across controllers and actions.

## 8. Current repository status

This is a Laravel + Inertia starter project configured for the Nexora social platform foundation:

- Laravel framework installed
- Inertia + React + Vite + Tailwind configured
- Horizon, Reverb and Sanctum available
- Redis support enabled in dependencies
- Current active phase: Phase 5 — Trust & safety and admin
- Group MVP foundations are in place; the admin control plane includes protected access, platform overview, user search, account suspension, post/group management, a global group-report queue, and admin audit history
- Profile privacy settings control who can see a user's location, profile photos/videos section, and friends list (everyone, friends, or only me); post visibility continues to govern media attached to timeline posts
- Phase 5 admin controls include security event review for failed and rate-limited logins, analytics, site-level branding (logo and browser icon), registration and announcement settings, and streamed CSV audit export

### Phase 4: Content & media foundation

This phase adds the basic media attachment layer for posts so the platform can support image and video content safely and consistently. The foundation includes:

- media asset model and storage metadata
- upload validation for common image and video types
- route-level attachment flow for a post
- relationship mapping from posts and users to media assets

### Phase 5: Social interactions

This phase adds the primary engagement primitives that make a social feed interactive and community-driven. The foundation includes:

- comments on posts
- reactions with a toggle-based state model
- relationship mapping from posts and users to comments and reactions
- validation and access checks for public social interactions

## 9. Local development setup

### Requirements
- PHP 8.3+
- Composer 2+
- Node.js 18+
- NPM
- MySQL or PostgreSQL
- Redis

### Install dependencies

```bash
composer install
npm install
```

### Environment setup

```bash
cp .env.example .env
php artisan key:generate
```

Update database, cache and queue configuration in `.env` for your local environment.

### Run database migrations

```bash
php artisan migrate
```

### Start the application

```bash
composer run dev
```

or use separate processes:

```bash
php artisan serve
npm run dev
```

### Production build

```bash
npm run build
```

## 10. Development roadmap

### Phase 1: Foundations
- Authentication and user accounts
- Roles and permission base
- Profile and settings
- Basic feed and post creation

### Phase 2: Social graph
- Friends, follows and relationship states
- Privacy enforcement
- Notifications base

### Phase 3: Media and content
- Photos, videos and stories
- Upload pipeline and moderation hooks
- Post reactions and comments

### Phase 4: Discovery and engagement
- Search
- Recommendations
- Events and groups
- Marketplace basics

### Phase 5: Trust & safety and admin
- Reporting
- Moderation queue
- AI-assisted content review
- Admin dashboards and audit trails

### Phase 6: Scale and optimization
- Queue and async workloads
- Search indexing
- Background media processing
- Service extraction based on measured bottlenecks

## 11. Suggested folder structure for implementation

```text
app/
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   └── Requests/
├── Modules/
│   ├── Auth/
│   ├── Users/
│   ├── Profiles/
│   ├── SocialGraph/
│   ├── Posts/
│   ├── Messaging/
│   ├── Notifications/
│   ├── TrustSafety/
│   └── Admin/
├── Services/
├── Policies/
├── Models/
├── Enums/
└── Support/
```

This structure keeps the app aligned with the modular monolith strategy defined in the product specification.

## 12. Contribution expectations

When working on this project:

- Keep scope aligned to one domain at a time
- Add tests for business-critical behavior
- Document domain contracts and rules clearly
- Avoid premature microservice splitting
- Keep security and privacy logic centralized
- Favor clean, reviewable code over ad hoc shortcuts

## 13. License

This project is intended to remain under the repository's existing license configuration unless otherwise specified by the project owner.

## 14. Summary

Nexora should be built as a secure, scalable, privacy-aware social platform using Laravel as the backbone and a modular domain-driven structure. The key success factor is not speed of first release alone, but disciplined architecture, privacy controls, trust & safety, and modular growth over time.
