# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS (user's explicit choice). No build step, no framework, no npm install — the deliverable must open by double-click and deploy to any static host. Motion via GSAP/ScrollTrigger from CDN and/or native CSS scroll-driven animations.

## Users

Two audiences, in this order of importance:

1. **The real audience — the prospective client the site is shown to.** A developer/real-estate business owner or marketing lead evaluating whether this studio can build them a site. They scroll it once, on a laptop, probably in a meeting or from a link. Their job: decide in under a minute whether this level of craft is real and whether it is worth a conversation. Every design decision serves this judgment.
2. **The depicted audience — the site's in-fiction visitor.** A buyer choosing an apartment in a new-build residential complex: comparing layouts, floors, stages of construction, prices, and completion dates; usually returning several times before contacting a sales office.

## Product Purpose

A portfolio demonstration site for a residential developer / new-build sales agency. It exists to prove capability, not to sell apartments. Success = the viewer's reaction is "who built this, and what would it cost me", not "nice template".

## Positioning

Demonstration piece. Its differentiator is execution quality — motion choreography, typographic authority, and the fidelity of the buying-journey model — not features a competitor could list.

## Operating Context

The in-fiction product covers the new-build buying journey: browse residential complexes → pick a building/section → filter available apartments by rooms, floor, area, price → inspect a floor plan → view construction progress by quarter → book a viewing or reserve a unit. Sales offices, construction stage reports, and payment/instalment plans are factual parts of this market.

## Capabilities and Constraints

- Ukrainian-language interface (confirmed).
- Segment: new-build residential development (confirmed).
- Static delivery: any "filtering", "availability", or "3D" behaviour must be implemented client-side against local data, or be an honest visual demonstration. No backend.
- Must work as a self-contained folder; assets local or CDN-only.
- Reference material: the user is supplying a design reference separately. The visual world is NOT decided in this file.

## Brand Commitments

None inherited. The client is under NDA, so the demo carries a **fictional brand** and must be visibly labelled as a concept/demo piece rather than passed off as a live business. Brand name and identity are an open decision, to be made with the visual world.

## Evidence on Hand

None. There are no real customers, sold-unit counts, awards, press, prices, completion dates, or testimonials. All figures, complex names, addresses, and quotes in the demo are invented and must be presented as demonstration content — never dressed up as verified fact, and never attributed to a real company or person.

## Product Principles

1. **The craft is the argument.** The site's job is to be evidence of skill; anything that does not raise perceived quality is cut.
2. **Model the real buying journey.** A developer recognises their own funnel or the demo reads as decoration.
3. **Invented content stays legibly invented.** Fictional brand, fictional numbers, plainly marked — no fake credibility.
4. **No build step, ever.** The client must be able to open it, host it, and hand it to anyone without tooling.
5. **Motion carries meaning.** Every animation expresses progression through the journey; spectacle that says nothing gets cut.

## Accessibility & Inclusion

No product-specific requirement established. Baseline still applies: keyboard operability, 4.5:1 text contrast, and a working `prefers-reduced-motion` path — a heavily animated site that ignores it is a defect a discerning client will notice.
