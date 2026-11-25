#!/usr/bin/env node
/**
 * Extract skeleton landmarks for each body and express them in that body's
 * HighPoly mesh coordinates (the space scripts/build_regions.py works in).
 *
 * The rigged mesh and the HighPoly mesh are the same body at different spots
 * in the source scene, so we map rig space onto HighPoly space by matching the
 * two meshes' bounding boxes (per-axis scale + offset).
 *
 * Writes scripts/landmarks.json.   Run:  node scripts/extract_landmarks.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mat4, vec3 } from "gl-matrix";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(join(ROOT, "assets/source/HumanModels.glb"));
const nodes = Object.fromEntries(doc.getRoot().listNodes().map((n) => [n.getName(), n]));

const BODIES = {
  male: { rigged: "Man", highpoly: "Man (HighPoly)" },
  female: { rigged: "Woman", highpoly: "Woman (HighPoly)" },
};

function bbox(points) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return { min, max };
}

function positions(node) {
  const a = node.getMesh().listPrimitives()[0].getAttribute("POSITION");
  const out = [];
  for (let i = 0; i < a.getCount(); i++) out.push(a.getElement(i, []));
  return out;
}

const result = {};
for (const [body, { rigged, highpoly }] of Object.entries(BODIES)) {
  const skinNode = nodes[rigged];
  const skin = skinNode.getSkin();
  const joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices();
  // Bind-pose world position of a skinned vertex = jointWorld * inverseBind * v (same for every joint in bind pose).
  const j0 = joints[0];
  const M = mat4.multiply(mat4.create(), j0.getWorldMatrix(), ibm.getElement(0, []));
  const rigPts = positions(skinNode).map((p) => Array.from(vec3.transformMat4(vec3.create(), p, M)));
  const hpPts = positions(nodes[highpoly]);
  const a = bbox(rigPts), b = bbox(hpPts);
  const scale = [0, 1, 2].map((i) => (b.max[i] - b.min[i]) / (a.max[i] - a.min[i]));
  const toHP = (p) => [0, 1, 2].map((i) => b.min[i] + (p[i] - a.min[i]) * scale[i]);

  const lm = {};
  for (const j of joints) {
    const w = j.getWorldMatrix();
    lm[j.getName()] = toHP([w[12], w[13], w[14]]).map((v) => +v.toFixed(4));
  }
  result[body] = { scaleRigToHighPoly: scale.map((v) => +v.toFixed(4)), highpolyBounds: b, joints: lm };
  console.log(body, "rig->highpoly scale", scale.map((v) => v.toFixed(3)).join(", "), "joints", joints.length);
}
writeFileSync(join(ROOT, "scripts/landmarks.json"), JSON.stringify(result, null, 1));
console.log("wrote scripts/landmarks.json");
