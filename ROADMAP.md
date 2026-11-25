# Roadmap

Where the 3D Pain Locator goes next. Phases are roughly in order of payoff for effort. Every change ships to `master` and deploys to [the live site](https://3d-avatar-pain-locator.vercel.app) so it can be tested right away.

**Done so far**
- [x] Anatomical body map: every triangle of the model assigned to one of 197 regions built from the model's skeleton (`scripts/build_regions.py`)
- [x] Crisp whole-region hover highlight, persistent tint on the selected region
- [x] Content for all 108 region types, with left/right differences and red flags
- [x] Searchable list grouped by body area, searchable by condition
- [x] Phase 1 (smoothing, mobile, load speed, region borders), shipped 2026-11-24
- [x] Phase 2 (female body, male/female switch, sex-specific content), shipped 2026-11-24

---

## Phase 1: Polish

Make it feel like a finished product.

- [x] Smooth out the body: welded the mesh into one surface in Blender, which removed the striped/faceted shading (color kept as is; subdivision tested and skipped as not worth 6x the triangles)
- [x] Mobile: phones get a full-screen model with a Maps-style bottom sheet (peek card, swipe up for details, list inside), tablets keep side-by-side with touch behavior, first-visit hint on all devices
- [x] Faster loading: body-only meshopt-compressed model (6.4 MB -> 340 KB), 3D viewer code-split into its own chunk, loading indicator
- [ ] "Fly to": selecting an area from the list rotates and zooms the camera to it (deferred)
- [ ] Shareable deep links, e.g. `?region=lateral_elbow_L` (deferred)
- [x] Clean region borders: per-vertex regions drawn as anti-aliased lines, border edges refined to ~1 cm, every region one connected patch

## Phase 2: Female body

The model file already contains a detailed female mesh that isn't used yet.

- [x] Region mapping on the female mesh: both skeletons' landmarks extracted, female body mapped onto the male rules bone by bone (male output verified unchanged), 201 areas incl. new breast regions
- [x] Male / Female switch: remembered across visits and in the URL (?body=), keeps the selected area when switching, only the chosen body downloads
- [x] Sex-specific content: ovarian, menstrual and pregnancy causes and warnings for the female body, prostate and testicular for the male body, new breast and armpit content

## Phase 3: Symptom tool

Turn it from a lookup into something useful to real people.

- [ ] Select multiple areas, each with a 0 to 10 pain score
- [ ] Short follow-up: pain quality (sharp, dull, burning, tingling), onset (injury, gradual, sudden), what makes it worse
- [ ] Rank possible causes using those answers instead of a flat list
- [ ] Structured urgency level (self-care, see a doctor, urgent care) instead of warnings in text
- [ ] Export a one-page pain diagram PDF to bring to an appointment

## Phase 4: Healthcare interoperability

- [ ] Tag each region with a SNOMED CT body-structure code and causes with ICD-10 codes
- [ ] Output answers as FHIR (QuestionnaireResponse / Observations)
- [ ] Package as a SMART on FHIR app, tested with the vendor-neutral [SMART Health IT launcher](https://launch.smarthealthit.org)
- [ ] Link each condition to an authoritative page via [MedlinePlus Connect](https://medlineplus.gov/medlineplus-connect/)

## Phase 5: Engineering maturity (ongoing)

- [ ] Tests: every region has content, region map length matches the mesh
- [ ] GitHub Actions: lint and build on every push
- [ ] Privacy-friendly analytics on which areas get clicked
- [ ] Accessibility pass, Spanish translation

## Stretch

- [ ] Anatomy layers (muscle / skeleton views), e.g. using an open anatomical model such as [Z-Anatomy](https://www.z-anatomy.com)
- [ ] AI follow-up chat limited to the region content, with strict safety guardrails (only after Phase 3)
