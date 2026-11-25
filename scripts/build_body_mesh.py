#!/usr/bin/env python3
"""
Step 1 of the model pipeline: prepare a smooth body mesh in Blender.

Takes the "Man (HighPoly)" mesh from the source file, welds its vertices into
one connected surface, makes all faces point outward, applies one level of
Catmull-Clark subdivision for a smoother silhouette and shading, triangulates,
and writes the result (in glTF axes, the mesh's own local coordinates) to
scripts/.cache/body_l<levels>.npz for scripts/build_regions.py.

Needs Blender's Python module:  pip install bpy   (Python 3.13 for bpy 5.x)

Run:  python3 scripts/build_body_mesh.py --levels 0   (welded, "standard")
      python3 scripts/build_body_mesh.py --levels 1   (welded + smoothed)
"""
import sys
from pathlib import Path

import bpy  # must come before bmesh
import bmesh
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/source/HumanModels.glb"
MESH_NAME = "Man (HighPoly)"
WELD_DISTANCE = 1e-4

levels = int(sys.argv[sys.argv.index("--levels") + 1]) if "--levels" in sys.argv else 1
OUT = ROOT / f"scripts/.cache/body_l{levels}.npz"


def blender_to_gltf(v):
    # Blender's glTF importer converts Y-up to Z-up: (x, y, z)gltf -> (x, -z, y)blender
    return np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
obj = bpy.data.objects[MESH_NAME]
mesh = obj.data

bm = bmesh.new()
bm.from_mesh(mesh)
before = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=WELD_DISTANCE)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
boundary = sum(1 for e in bm.edges if e.is_boundary)
print(f"welded {before} -> {len(bm.verts)} vertices, {boundary} open boundary edges")
bm.to_mesh(mesh)
bm.free()

for p in mesh.polygons:
    p.use_smooth = True

if levels > 0:
    mod = obj.modifiers.new("Subdivision", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    mod.subdivision_type = "CATMULL_CLARK"
    mod.boundary_smooth = "PRESERVE_CORNERS"
tri = obj.modifiers.new("Triangulate", "TRIANGULATE")
tri.keep_custom_normals = True

deps = bpy.context.evaluated_depsgraph_get()
eval_obj = obj.evaluated_get(deps)
m = eval_obj.to_mesh()
m.calc_loop_triangles()

n_v = len(m.vertices)
co = np.empty(n_v * 3, np.float32)
m.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
nrm = np.empty(n_v * 3, np.float32)
m.vertices.foreach_get("normal", nrm)
nrm = nrm.reshape(-1, 3)
tris = np.empty(len(m.loop_triangles) * 3, np.int32)
m.loop_triangles.foreach_get("vertices", tris)
tris = tris.reshape(-1, 3)

pos = blender_to_gltf(co).astype(np.float32)
nor = blender_to_gltf(nrm).astype(np.float32)
print(f"subdivision level {levels}: {len(pos)} vertices, {len(tris)} triangles")
print("bounds", pos.min(0).round(3), pos.max(0).round(3))

OUT.parent.mkdir(parents=True, exist_ok=True)
np.savez_compressed(OUT, positions=pos, normals=nor, triangles=tris)
print("wrote", OUT.relative_to(ROOT))
