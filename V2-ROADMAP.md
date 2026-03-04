# Morjane Site V2 - Roadmap

## 1) V2 goals
- Improve first load speed and mobile UX.
- Keep strong artistic direction while making updates easier.
- Increase conversion actions: `Spotify`, `EPK download`, `booking contact`.

## 2) Recommended architecture
- Framework: `Astro` (static-first, very fast, simple deploy).
- Styling: keep custom CSS direction, add design tokens (`:root` variables).
- Content: markdown/json files first; optional CMS later.
- Hosting: static CDN (Netlify/Vercel/Cloudflare Pages).

Why this choice:
- Better performance baseline than ad-hoc static HTML growth.
- Component structure without forcing heavy JS.
- Easy progressive migration from current pages.

## 3) Information architecture
- `/` Home (story + latest track + social proof).
- `/epk` Pro page for bookers/media.
- `/music` Releases + streaming links.
- `/live` Videos + dates/events.
- `/contact` Booking form + direct email.

## 4) Design system baseline
- Define tokens for color, spacing, typography, motion.
- Keep existing DA (clair-obscur + warm highlights).
- Reusable components: `Header`, `Hero`, `Timeline`, `VideoCard`, `SocialLinks`, `ContactForm`.
- Motion rule: default subtle, full fallback for reduced motion.

## 5) Performance targets
- `LCP < 2.5s` on mobile 4G.
- `INP < 200ms`.
- `CLS < 0.1`.
- Web fonts: local preload + limited weights.
- Media strategy: responsive images (`srcset`), modern formats, lazy loading below fold.

## 6) SEO/content targets
- One canonical + complete metadata per page.
- Structured data on home + EPK.
- Sitemap/robots maintained on each release.
- Editorial pass: one clear value proposition per page.
- Strong CTA hierarchy (`Ecouter`, `Telecharger EPK`, `Booking`).

## 7) Tracking plan
- Keep GA4.
- Events: `click_streaming`, `download_epk`, `submit_contact`, `play_video`.
- Build a monthly dashboard: traffic, CTA CTR, contact conversion.

## 8) Delivery plan (4 iterations)
- Iteration 1: foundation (Astro setup, routing, layout, tokens).
- Iteration 2: migrate Home + shared components.
- Iteration 3: migrate EPK + analytics events + SEO QA.
- Iteration 4: polish, accessibility audit, perf budget, launch.

## 9) Migration strategy from V1
- Keep V1 live.
- Build V2 in parallel branch/repo.
- Migrate page by page.
- QA checklist per page: visual parity, links, tracking, mobile, Lighthouse.

## 10) Launch checklist
- 404 and redirects validated.
- Metadata and social cards validated.
- Analytics events receiving data.
- Cross-device check: iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari.
- Post-launch monitoring for 7 days.
