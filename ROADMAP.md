# Roadmap

Where the 3D Pain Locator goes next. Phases are roughly in order of payoff for effort. Every change ships to `master` and deploys to [the live site](https://3d-avatar-pain-locator.vercel.app) so it can be tested right away.

**Done so far**
- [x] Anatomical body map: every triangle of the model assigned to one of 197 regions built from the model's skeleton (`scripts/build_regions.py`)
- [x] Crisp whole-region hover highlight, persistent tint on the selected region
- [x] Content for all 108 region types, with left/right differences and red flags
- [x] Searchable list grouped by body area, searchable by condition

---

## Phase 1: Polish

Make it feel like a finished product.

- [ ] Fix lighting and skin material (currently dark and flat)
- [ ] Mobile: tap to preview, tap again to select, bottom-sheet info panel
- [ ] Compress the 6.4 MB model (Draco/meshopt, target ~1 MB) and code-split the bundle
- [ ] "Fly to": selecting an area from the list rotates and zooms the camera to it
- [ ] Shareable deep links, e.g. `?region=lateral_elbow_L`
- [ ] Smooth the remaining jagged region borders (torso, fingers)

## Phase 2: Female body

The model file already contains a detailed female mesh that isn't used yet.

- [ ] Run the region mapping on the female mesh with its own joint landmarks
- [ ] Male / female toggle
- [ ] Sex-specific content where it matters (pelvic, lower abdominal, chest)

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
