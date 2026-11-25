# Interactive Pain Location Tool

An interactive 3D human avatar that lets users click on a body location to explore possible causes of pain in that area.

**[Live Demo →](https://3d-avatar-pain-locator.vercel.app)**

## About

This project maps user-selected points on a 3D human model to structured information about potential causes of pain at that location, combining an interactive interface with underlying medical/anatomical logic.

It was built independently, end-to-end, using AI-assisted development with **Claude Code** — from initial architecture through deployment.

## How It Works

1. The user rotates and clicks on a location on the 3D avatar
2. The click coordinates map to a specific body region
3. The app returns structured information about possible causes of pain associated with that region

## Tech Stack

- **React** + **TypeScript**
- **Vite** for build tooling
- 3D rendering for the interactive avatar
- Deployed on **Vercel**

## Motivation

Built out of a personal interest in combining a life sciences background (B.S., Molecular, Cellular, and Developmental Biology, UCLA) with hands-on software development, and as a way to explore AI-assisted development tools in a real, shipped project rather than a tutorial exercise.

## Running Locally

\`\`\`bash
git clone https://github.com/ianniehoff/3d-avatar-pain-locator.git
cd 3d-avatar-pain-locator
npm install
npm run dev
\`\`\`

## Body Models & Region Map

The app ships two small, compressed body models (male and female) built from the original asset (`assets/source/HumanModels.glb`, not served) by this pipeline:

1. `scripts/extract_landmarks.mjs`: reads both skeletons and writes their joint positions, in each high-poly mesh's own coordinates, to `scripts/landmarks.json`.
2. `scripts/build_body_mesh.py --body male|female` (Blender, via `pip install bpy`): welds the body into one closed surface and fixes face orientation.
3. `scripts/build_regions.py` (numpy + scipy): assigns every vertex to an anatomical region (~200 per body). The rules are written in the male body's coordinates; other bodies are first mapped onto the male body bone by bone (and torso slice by slice) using both skeletons, so the same rules apply. The female body also gets breast regions. Edges crossing a region border are split until about 1 cm long and stray fragments are merged, so each region is one clean patch. Also writes `src/data/regionMap.generated.ts`.
4. `scripts/pack_models.mjs` (gltf-transform): writes `public/models/body-male.glb` (~340 KB) and `body-female.glb` (~230 KB) with the region index baked in per vertex, quantized and meshopt-compressed.

```bash
node scripts/extract_landmarks.mjs
python3 scripts/build_body_mesh.py --body male
python3 scripts/build_body_mesh.py --body female
python3 scripts/build_regions.py [--preview]   # --preview renders region PNGs (needs matplotlib)
node scripts/pack_models.mjs
```

The educational content for each region lives in `src/data/regionContent.ts`, with optional left/right and male/female overrides.

## Status

This is a working prototype that I'm actively iterating on — feedback and suggestions welcome.
