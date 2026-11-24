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

## Body Region Map

Every triangle of the 3D model is assigned to one of ~200 anatomical regions (e.g. "Left Outer Elbow", "Right SI Joint", "Left Arch of Foot"). The map is precomputed by `scripts/build_regions.py`, which uses joint landmarks from the model's own skeleton plus hand-tuned geometric rules, and writes:

- `public/models/regionMap.bin` (one region index per triangle)
- `src/data/regionMap.generated.ts` (region order and label anchors)

The educational content for each region lives in `src/data/regionContent.ts`. To change region boundaries, edit the rules and rerun:

```bash
python3 scripts/build_regions.py            # needs numpy
python3 scripts/build_regions.py --preview  # also renders PNG previews (needs matplotlib)
```

## Status

This is a working prototype that I'm actively iterating on — feedback and suggestions welcome.
