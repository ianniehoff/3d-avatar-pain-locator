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

## Body Model & Region Map

The app ships small, compressed body models built from the original asset (`assets/source/HumanModels.glb`, not served) by a three-step pipeline:

1. `scripts/build_body_mesh.py` (Blender, via `pip install bpy`): welds the high-poly body into one closed surface, fixes face orientation, and optionally applies one level of subdivision smoothing.
2. `scripts/build_regions.py` (numpy + scipy): assigns every triangle to one of ~200 anatomical regions using joint landmarks from the model's skeleton plus hand-tuned geometric rules, splits vertices along region borders, and computes each vertex's distance to its region's edge (used to feather highlights). Also writes `src/data/regionMap.generated.ts`.
3. `scripts/pack_models.mjs` (gltf-transform): writes `public/models/body-standard.glb` and `body-smooth.glb` with the region data baked in as vertex attributes, quantized and meshopt-compressed.

```bash
python3 scripts/build_body_mesh.py --levels 0   # standard (welded)
python3 scripts/build_body_mesh.py --levels 1   # smooth (welded + subdivided)
python3 scripts/build_regions.py [--preview]     # --preview renders region PNGs (needs matplotlib)
node scripts/pack_models.mjs
```

The educational content for each region lives in `src/data/regionContent.ts`.

## Status

This is a working prototype that I'm actively iterating on — feedback and suggestions welcome.
