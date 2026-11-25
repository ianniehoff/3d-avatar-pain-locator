#!/usr/bin/env node
/**
 * Step 3 of the model pipeline: turn the arrays written by
 * scripts/build_regions.py into small, compressed public/models/body-<body>.glb files.
 *
 * Each output holds one mesh ("Body") with
 *   POSITION, NORMAL          quantized (KHR_mesh_quantization)
 *   _REGION                   float, per-vertex index into REGION_ORDER
 * plus the original "Skin" material, compressed with EXT_meshopt_compression.
 *
 * Run:  node scripts/pack_models.mjs
 */
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, quantize, reorder } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "assets/source/HumanModels.glb");
const CACHE = join(ROOT, "scripts/.cache");
const VARIANTS = ["male", "female"];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const source = await io.read(SOURCE);
const skin = source.getRoot().listMaterials().find((m) => m.getName() === "Skin");

function load(variant, name, Type) {
  const buf = readFileSync(join(CACHE, `regions_${variant}`, `${name}.bin`));
  return new Type(buf.buffer, buf.byteOffset, buf.byteLength / Type.BYTES_PER_ELEMENT).slice();
}

for (const variant of VARIANTS) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

  const material = doc
    .createMaterial("Skin")
    .setBaseColorFactor(skin.getBaseColorFactor())
    .setRoughnessFactor(skin.getRoughnessFactor())
    .setMetallicFactor(skin.getMetallicFactor())
    .setDoubleSided(skin.getDoubleSided());

  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", acc("VEC3", load(variant, "positions", Float32Array)))
    .setAttribute("NORMAL", acc("VEC3", load(variant, "normals", Float32Array)))
    .setAttribute("_REGION", acc("SCALAR", load(variant, "region", Float32Array)))
    .setIndices(acc("SCALAR", load(variant, "indices", Uint32Array)))
    .setMaterial(material);

  const mesh = doc.createMesh("Body").addPrimitive(prim);
  const node = doc.createNode("Body").setMesh(mesh);
  doc.createScene("Scene").addChild(node);

  await doc.transform(
    reorder({ encoder: MeshoptEncoder }),
    // Only quantize the standard attributes: _REGION must stay an exact index.
    quantize({ pattern: /^(POSITION|NORMAL)$/ }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );

  const out = join(ROOT, `public/models/body-${variant}.glb`);
  await io.write(out, doc);
  const kb = (statSync(out).size / 1024).toFixed(0);
  console.log(`${variant}: ${prim.getIndices().getCount() / 3} triangles -> ${out.replace(ROOT + "/", "")} (${kb} KB)`);
}
