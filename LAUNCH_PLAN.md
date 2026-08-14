# Launch Plan & TODOs

## Phase 1: MVP & Prep
- [x] Audit existing codebase for bugs and incomplete features
- [x] Ensure mobile responsiveness and UI/UX consistency
- [x] Update README with accurate project details and setup instructions
- [x] Verify environment variables and dependencies
- [x] Fix TypeScript type safety (removed all explicit `any` casts)
- [x] Fix i18n exports (`initI18n`, `t`, `getLocalizedSampleData`)
- [x] Add rate limiting to auth and invite endpoints
- [x] Remove insecure NEXTAUTH_SECRET fallback
- [x] Generate PWA icons and OG image

## Phase 2: Deployment [DONE]
- [x] Set up hosting (Vercel/Netlify for frontend, Render/Railway for backend) - *Transitioned to self-hosted Coolify*
- [x] Configure custom domain (if applicable)
- [x] Set up VPS CI and deployment gate
- [ ] Add third-party analytics (optional; current telemetry is a development-only logging stub)

## Phase 3: Launch
- [x] Prepare draft app store screenshots and verify native app icons
- [ ] Submit to app stores (if applicable)
- [x] Draft launch post (`launch-announcement.md`); publication remains pending store approval
- [x] Configure scheduled production health monitoring
- [ ] Monitor logs and feedback post-launch after public launch
