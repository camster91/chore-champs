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
- [x] Setup CI/CD pipeline via GitHub Actions
- [x] Add analytics (Google Analytics or PostHog)

## Phase 3: Launch
- [ ] Prepare app store assets (if mobile) or social media graphics
- [ ] Submit to app stores (if applicable)
- [ ] Write launch post (Product Hunt, Twitter, LinkedIn)
- [ ] Monitor logs and feedback post-launch
