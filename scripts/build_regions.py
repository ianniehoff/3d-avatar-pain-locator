#!/usr/bin/env python3
"""
Precompute the body-region map for the 3D avatar.

Step 2 of the model pipeline. Every triangle of each prepared body mesh
(scripts/.cache/body_l*.npz from scripts/build_body_mesh.py) is assigned to
exactly one anatomical region, using hand-tuned geometric rules built on top of
real joint landmarks taken from the model's own skeleton (the rigged "Man" in
the source file, shifted onto the HighPoly mesh).

Vertices are split along region borders so each triangle carries one region
id, and every vertex gets its distance to the edge of its region (used to
feather the highlight). Step 3 (scripts/pack_models.mjs) turns the results
into compressed GLBs.

Outputs
  scripts/.cache/regions_<variant>/*.bin  positions, normals, region, border, indices (raw LE arrays)
  src/data/regionMap.generated.ts        REGION_ORDER + per-region label anchor point

Coordinates are the mesh's own local units (body ~3.5 tall, feet at y=0,
facing +z, the model's LEFT side is +x). The app scales the mesh by
1.75/3.495, and the anchors are written out already scaled to match.

Run:  python3 scripts/build_regions.py           (needs numpy + scipy)
      python3 scripts/build_regions.py --preview (also writes preview PNGs, needs matplotlib)
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
GLB = ROOT / "assets/source/HumanModels.glb"
CACHE = ROOT / "scripts/.cache"
VARIANTS = {"standard": "body_l0.npz", "smooth": "body_l1.npz"}
OUT_TS = ROOT / "src/data/regionMap.generated.ts"
MESH_NODE = "Man (HighPoly)"
APP_SCALE = 1.75 / 3.495

# ---------------------------------------------------------------- landmarks
# Model's LEFT side (+x); the right side is the mirror image (x -> -x).
SHOULDER = np.array([0.305, 2.794, -0.041])  # humeral head
ELBOW = np.array([0.616, 2.314, 0.000])  # re-centred on the arm cross-section
WRIST = np.array([0.839, 1.971, 0.151])  # re-centred
HIP = np.array([0.199, 1.834, 0.056])        # femoral head
KNEE = np.array([0.304, 0.882, 0.005])
ANKLE = np.array([0.337, 0.123, 0.016])
TOE_BASE = np.array([0.390, 0.043, 0.207])   # ball of foot / MTP joints

# Finger chains (left hand). Tip = last joint + last bone vector.
FINGERS = {
    "thumb": [[0.853, 1.864, 0.189], [0.822, 1.812, 0.240], [0.792, 1.765, 0.262]],
    "index": [[0.913, 1.720, 0.261], [0.919, 1.655, 0.283], [0.925, 1.596, 0.301]],
    "middle": [[0.953, 1.769, 0.201], [0.950, 1.700, 0.216], [0.932, 1.632, 0.231]],
    "ring": [[0.961, 1.759, 0.161], [0.958, 1.700, 0.165], [0.945, 1.640, 0.168]],
    "pinky": [[0.961, 1.746, 0.120], [0.945, 1.705, 0.124], [0.928, 1.664, 0.127]],
}


def load_mesh():
    data = GLB.read_bytes()
    json_len = struct.unpack("<I", data[12:16])[0]
    gltf = json.loads(data[20 : 20 + json_len])
    bin_start = 20 + json_len + 8
    blob = data[bin_start:]

    def accessor(i, dtype_map={5126: np.float32, 5125: np.uint32, 5123: np.uint16}):
        a = gltf["accessors"][i]
        bv = gltf["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        dt = dtype_map[a["componentType"]]
        off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        arr = np.frombuffer(blob, dt, a["count"] * n, off)
        return arr.reshape(a["count"], n) if n > 1 else arr

    node = next(n for n in gltf["nodes"] if n.get("name") == MESH_NODE)
    prim = gltf["meshes"][node["mesh"]]["primitives"][0]
    pos = accessor(prim["attributes"]["POSITION"]).astype(np.float64)
    idx = accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
    return pos, idx


# ---------------------------------------------------------------- helpers
def seg_param(p, a, b):
    """Return (t along a->b, perpendicular vector from axis) for points p."""
    d = b - a
    L2 = d @ d
    t = ((p - a) @ d) / L2
    proj = a + np.outer(t, d)
    return t, p - proj


def frame_angles(perp, axis, forward=np.array([0, 0, 1.0]), lateral=np.array([1.0, 0, 0])):
    """Angle (deg) of the perpendicular offset around a limb axis.
    0 = forward (+z), +90 = lateral (+x), +-180 = back, -90 = medial."""
    axis = axis / np.linalg.norm(axis)
    f = forward - (forward @ axis) * axis
    f /= np.linalg.norm(f)
    l = np.cross(axis, f)
    if l @ lateral < 0:
        l = -l
    return np.degrees(np.arctan2(perp @ l, perp @ f))


def dist_to_seg(p, a, b):
    t, perp = seg_param(p, a, b)
    t = np.clip(t, 0, 1)
    return np.linalg.norm(p - (a + np.outer(t, b - a)), axis=1)


def between(v, lo, hi):
    return (v >= lo) & (v < hi)


# ---------------------------------------------------------------- classifier
def classify(C):
    """C: (n,3) triangle centroids. Returns array of region id strings."""
    n = len(C)
    side = np.where(C[:, 0] >= 0, "L", "R")
    p = C.copy()
    p[:, 0] = np.abs(p[:, 0])  # work in left-side coordinates
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    out = np.array([""] * n, dtype=object)

    def put(mask, name, bilateral=True):
        m = mask & (out == "")
        if bilateral:
            out[m] = [f"{name}_{s}" for s in side[m]]
        else:
            out[m] = name

    # ---- coarse parts
    head_cut = 3.10 - 0.30 * (z + 0.05)            # under the jaw -> base of skull
    is_head = y > head_cut
    arm_line = 0.32 - 0.206 * (y - 2.54)           # armpit -> top of shoulder
    is_arm = (x > arm_line) & (y > 1.45) & ~is_head
    hand_t, _ = seg_param(p, ELBOW, WRIST)
    # Leg vs trunk: inguinal crease in front, gluteal fold behind.
    crotch_front = 1.60 + 0.65 * np.clip(x - 0.02, 0, None)
    leg_cut = np.where(z > 0.03, np.minimum(crotch_front, 1.80), 1.53 + 0.1 * np.clip(x - 0.05, 0, None))
    is_leg = (y < leg_cut) & ~is_arm
    is_neck = ~is_head & ~is_arm & (y > 2.86 - 0.25 * np.clip(x - 0.05, 0, None))
    is_trunk = ~is_head & ~is_arm & ~is_leg & ~is_neck

    # ================================================================ HEAD
    h = is_head
    # face is the front of the head
    put(h & (x < 0.035) & between(y, 3.17, 3.30) & (z > 0.25), "nose", False)
    put(h & between(x, 0.025, 0.11) & between(y, 3.255, 3.325) & (z > 0.19), "eye")
    put(h & (x > 0.125) & between(z, -0.04, 0.15) & between(y, 3.15, 3.33), "ear")
    put(h & between(x, 0.10, 0.16) & between(y, 3.17, 3.26) & between(z, 0.13, 0.21), "jaw_tmj")
    put(h & (x < 0.055) & between(y, 3.11, 3.18) & (z > 0.24), "mouth", False)
    put(h & (x < 0.05) & (y < 3.11) & (z > 0.18), "chin", False)
    put(h & (y < 3.17) & (z > 0.02), "jaw")
    put(h & between(x, 0.03, 0.13) & between(y, 3.15, 3.27) & (z > 0.17), "cheek_sinus")
    put(h & (x < 0.075) & between(y, 3.325, 3.43) & (z > 0.16), "forehead", False)
    put(h & between(y, 3.26, 3.39) & between(z, 0.10, 0.24) & (x > 0.075), "temple")
    put(h & (x > 0.10) & between(y, 3.15, 3.43) & (z >= -0.02), "side_of_head")
    put(h & (z < 0.03) & (y < 3.20), "base_of_skull", False)
    put(h & (z < 0.03), "back_of_head", False)
    put(h, "top_of_head", False)

    # ================================================================ NECK
    nk = is_neck
    put(nk & (x > 0.09) & (y < 2.95), "upper_trap")
    put(nk & (z > 0.06) & (x < 0.05), "throat", False)
    put(nk & (z < -0.01) & (x < 0.04), "cervical_spine", False)
    put(nk & (z < 0.01), "back_of_neck")
    put(nk, "side_of_neck")

    # ================================================================ ARM
    a = is_arm
    t_up, perp_up = seg_param(p, SHOULDER, ELBOW)
    ang_up = frame_angles(perp_up, ELBOW - SHOULDER)
    t_fo, perp_fo = seg_param(p, ELBOW, WRIST)
    ang_fo = frame_angles(perp_fo, WRIST - ELBOW)
    d_sh = np.linalg.norm(p - SHOULDER, axis=1)

    # hand: past the wrist crease
    hand = a & (t_fo > 1.08)
    wrist = a & between(t_fo, 0.88, 1.08)
    t_el, _ = seg_param(p, ELBOW, ELBOW + (WRIST - ELBOW) / np.linalg.norm(WRIST - ELBOW))
    elbow = a & (np.abs(t_el) < 0.065) & (np.linalg.norm(p - ELBOW, axis=1) < 0.13)
    shoulder = a & (t_up < 0.26)

    # -- hand: nearest finger bone vs palm
    best = np.full(n, np.inf)
    which = np.array([""] * n, dtype=object)
    for f, chain in FINGERS.items():
        c = np.array(chain)
        tip = c[-1] + (c[-1] - c[-2])
        pts = [c[0], c[1], c[2], tip]
        for i in range(3):
            d = dist_to_seg(p, pts[i], pts[i + 1])
            # first segment of the thumb is the thumb base (CMC), others are the digit
            label = "thumb_base" if (f == "thumb" and i == 0) else f
            upd = d < best
            best[upd] = d[upd]
            which[upd] = label
    palm_center = np.array([0.905, 1.83, 0.17])
    d_palm = np.linalg.norm(p - palm_center, axis=1) - 0.055
    finger_won = hand & (best < d_palm) & (best < 0.04)
    for label in ["thumb_base", "thumb", "index", "middle", "ring", "pinky"]:
        name = {"thumb_base": "thumb_base", "thumb": "thumb"}.get(label, f"{label}_finger")
        put(finger_won & (which == label), name)
    # palm faces the thigh (-x on the left hand); back of hand faces outward
    # plane fitted (PCA, thumb excluded) to the hand: normal points out of the back of the hand
    hand_plane_c = np.array([0.915, 1.697, 0.201])
    hand_normal = -np.array([0.916, 0.284, 0.284])
    side_val = (p - hand_plane_c) @ hand_normal
    put(hand & (side_val > 0), "palm")
    put(hand, "back_of_hand")

    # -- wrist (thumb side is forward, pinky side back in this pose)
    put(wrist & between(ang_fo, -45, 45), "wrist_thumb_side")
    put(wrist & (np.abs(ang_fo) > 135), "wrist_pinky_side")
    put(wrist & (ang_fo < 0), "wrist_palm_side")
    put(wrist, "wrist_back")

    # -- elbow
    put(elbow & between(ang_fo, -50, 50), "elbow_crease")
    put(elbow & (np.abs(ang_fo) > 130), "elbow_tip")
    put(elbow & (ang_fo > 0), "lateral_elbow")
    put(elbow, "medial_elbow")

    # -- shoulder cap
    put(shoulder & (y > 2.80) & (x < 0.29) & (z > -0.10), "ac_joint")
    put(shoulder & between(ang_up, -60, 35), "front_shoulder")
    put(shoulder & (np.abs(ang_up) > 125), "back_shoulder")
    put(shoulder & (ang_up > 0), "outer_shoulder")
    put(shoulder & (y > 2.6), "armpit")
    put(shoulder, "inner_upper_arm")

    # -- upper arm
    upper = a & (t_up < 1.0) & ~hand
    put(upper & between(ang_up, -50, 55), "biceps")
    put(upper & (np.abs(ang_up) > 125), "triceps")
    put(upper & (ang_up > 0), "outer_upper_arm")
    put(upper, "inner_upper_arm")

    # -- forearm (thumb side forward, palm side faces the body)
    fore = a
    prox = t_fo < 0.45
    put(fore & between(ang_fo, -30, 60) & ~prox, "forearm_thumb_side")
    put(fore & (ang_fo > 0) & prox, "upper_forearm_back")
    put(fore & (ang_fo <= 0) & prox, "upper_forearm_palm")
    put(fore & (ang_fo > 0), "lower_forearm_back")
    put(fore, "lower_forearm_palm")

    # ================================================================ LEG
    lg = is_leg
    t_th, perp_th = seg_param(p, HIP, KNEE)
    ang_th = frame_angles(perp_th, KNEE - HIP)
    t_sh, perp_sh = seg_param(p, KNEE, ANKLE)
    ang_sh = frame_angles(perp_sh, ANKLE - KNEE)

    foot = lg & (y < 0.16) & ~((z < -0.02) & (y > 0.09))
    ankle = lg & (y < 0.22) & ~foot
    knee = lg & between(y, KNEE[1] - 0.10, KNEE[1] + 0.09)

    # -- foot
    put(foot & (z < 0.0) & (y < 0.06), "heel")
    put(foot & (z < -0.03), "back_of_heel")
    put(foot & (y < 0.03) & between(z, 0.0, 0.17), "arch")
    put(foot & (y < 0.04) & between(z, 0.17, 0.27), "ball_of_foot")
    toes = foot & (z > 0.25)
    put(toes & (x < 0.36), "big_toe")
    put(toes, "small_toes")
    put(foot & (x > 0.39) & (z < 0.22), "outer_foot")
    put(foot & (x < 0.30) & (z < 0.22) & (y < 0.07), "arch")
    put(foot, "top_of_foot")

    # -- ankle
    put(ankle & (z < -0.025), "achilles")
    put(ankle & (x < ANKLE[0] - 0.02) & (z < 0.06), "inner_ankle")
    put(ankle & (x > ANKLE[0] + 0.02) & (z < 0.06), "outer_ankle")
    put(ankle, "front_of_ankle")

    # -- lower leg (shin / calf)
    shin = lg & (y < KNEE[1] - 0.10) & ~foot & ~ankle
    put(shin & (t_sh > 0.72) & (np.abs(ang_sh) > 140), "achilles")
    put(shin & between(ang_sh, -15, 50), "front_shin")
    put(shin & between(ang_sh, -75, -15), "inner_shin")
    put(shin & between(ang_sh, 50, 120), "outer_lower_leg")
    put(shin & (t_sh < 0.5) & (np.abs(ang_sh) > 90), "upper_calf")
    put(shin & (np.abs(ang_sh) > 90), "lower_calf")
    put(shin & (ang_sh < 0), "inner_shin")
    put(shin, "outer_lower_leg")

    # -- knee
    kn = knee
    kt = (KNEE[1] + 0.09 - y) / 0.19 * 0.26 + 0.86  # ~0.86 top of band .. 1.12 bottom
    put(kn & (np.abs(ang_th) > 120), "back_of_knee")
    put(kn & between(ang_th, -35, 35) & between(kt, 0.90, 1.02), "kneecap")
    put(kn & between(ang_th, -35, 35) & (kt >= 1.02), "below_kneecap")
    put(kn & between(ang_th, -35, 35), "above_kneecap")
    put(kn & (ang_th < 0) & (kt >= 1.02), "pes_anserine")
    put(kn & (ang_th < 0), "inner_knee")
    put(kn, "outer_knee")

    # -- thigh / hip
    th = lg
    put(th & (t_th < 0.22) & between(ang_th, 55, 140) & (x > 0.24), "outer_hip")
    put(th & (t_th < 0.22) & between(ang_th, -40, 55), "hip_flexor")
    put(th & (t_th < 0.25) & (np.abs(ang_th) > 120), "sit_bone")
    put(th & (t_th < 0.3) & (ang_th < -40), "inner_groin")
    put(th & between(ang_th, -40, 60), "front_thigh")
    put(th & (np.abs(ang_th) > 120), "hamstring")
    put(th & (ang_th > 0), "outer_thigh")
    put(th, "inner_thigh")

    # ================================================================ TRUNK
    tr = is_trunk
    zc = np.interp(y, [1.6, 1.8, 2.0, 2.2, 2.5, 2.7, 2.9], [0.05, 0.03, 0.07, 0.08, 0.04, 0.01, 0.0])
    ang = np.degrees(np.arctan2(x, z - zc))  # 0 front, 90 side, 180 back
    front = tr & (ang < 62)
    back = tr & (ang > 115)
    sides = tr & ~front & ~back

    # front
    put(front & (y > 2.76) & (x < 0.055), "sternoclavicular")
    put(front & (y > 2.74), "collarbone")
    put(front & (x < 0.05) & (y > 2.42), "sternum", False)
    put(front & (y > 2.47), "chest")
    put(front & (y > 2.36) & (x > 0.11), "lower_ribs_front")
    put(front & (y > 2.22) & (x < 0.075), "epigastric", False)
    put(front & (y > 2.13), "upper_abdomen")
    put(front & (y > 2.02) & (x < 0.07), "navel", False)
    put(front & (y > 1.80) & (x < 0.085), "lower_abdomen_center", False)
    put(front & (y > 1.88), "lower_abdomen")
    put(front & (x < 0.06), "pubic", False)
    put(front, "groin")

    # sides
    put(sides & (y > 2.38), "side_ribs")
    put(sides & (y > 2.0), "flank")
    put(sides & (y > 1.86), "hip_crest")
    put(sides, "outer_hip")

    # back
    spine = back & (x < 0.04)
    put(spine & (y > 2.45), "thoracic_spine", False)
    put(spine & (y > 2.17), "mid_spine", False)
    put(spine & (y > 1.95), "lumbar_spine", False)
    put(spine & (y > 1.80), "sacrum", False)
    put(back & (x < 0.06) & (y <= 1.80), "tailbone", False)
    put(back & (y > 2.80), "upper_trap")
    put(back & (y > 2.47) & (x < 0.11), "rhomboid")
    put(back & (y > 2.47), "shoulder_blade")
    put(back & (y > 2.30), "mid_back")
    put(back & (y > 2.15), "kidney_area")
    put(back & (y > 1.96), "lower_back")
    put(back & (y > 1.82) & (x < 0.12), "si_joint")
    put(back & (y > 1.86) & (x > 0.15), "upper_outer_buttock")
    put(back & between(x, 0.07, 0.19) & between(y, 1.70, 1.84), "piriformis")
    put(back, "buttock")

    assert (out != "").all(), "unclassified triangles"
    return out


def smooth(labels, idx, iterations=2):
    """Majority filter over edge-adjacent triangles to clean ragged borders.
    A triangle switches to a label that at least two of its neighbours share."""
    n = len(idx)
    e = np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]])
    f = np.tile(np.arange(n), 3)
    key = np.minimum(e[:, 0], e[:, 1]).astype(np.int64) * (idx.max() + 1) + np.maximum(e[:, 0], e[:, 1])
    order = np.argsort(key, kind="stable")
    k, ff = key[order], f[order]
    same = k[1:] == k[:-1]
    a, b = ff[:-1][same], ff[1:][same]
    # up to 3 edge neighbours per triangle (closed manifold -> exactly 3)
    nb = np.full((n, 3), -1)
    cnt = np.zeros(n, int)
    for x, y in ((a, b), (b, a)):
        for i in range(len(x)):
            if cnt[x[i]] < 3:
                nb[x[i], cnt[x[i]]] = y[i]
                cnt[x[i]] += 1
    lab = labels.copy()
    for _ in range(iterations):
        L = np.where(nb >= 0, lab[np.maximum(nb, 0)], -1)
        cand = np.where((L[:, 0] == L[:, 1]) & (L[:, 0] >= 0), L[:, 0],
               np.where((L[:, 1] == L[:, 2]) & (L[:, 1] >= 0), L[:, 1],
               np.where((L[:, 0] == L[:, 2]) & (L[:, 0] >= 0), L[:, 0], -1)))
        lab = np.where(cand >= 0, cand, lab)
    return lab


def split_and_feather(pos, nrm, idx, labels):
    """Duplicate vertices along region borders and compute, for every vertex,
    its distance to the edge of its own region."""
    from scipy.spatial import cKDTree

    corner_v = idx.reshape(-1)
    corner_l = np.repeat(labels, 3)
    key = corner_v.astype(np.int64) * 4096 + corner_l
    uniq, inv = np.unique(key, return_inverse=True)
    src_v = uniq // 4096
    region = (uniq % 4096).astype(np.float32)
    new_idx = inv.reshape(-1, 3).astype(np.uint32)

    # border vertices: original vertices used by more than one region
    n_regions_at_v = np.bincount(src_v, minlength=len(pos))
    is_border_src = n_regions_at_v > 1
    border = np.zeros(len(uniq), np.float32)
    for r in np.unique(labels):
        mine = region == r
        b_pts = pos[src_v[mine & is_border_src[src_v]]]
        if len(b_pts) == 0:
            border[mine] = 1.0
            continue
        d, _ = cKDTree(b_pts).query(pos[src_v[mine]])
        border[mine] = d
    return pos[src_v], nrm[src_v], region, border, new_idx


def main():
    variants = {}
    all_names = set()
    for name, fname in VARIANTS.items():
        d = np.load(CACHE / fname)
        pos, nrm, idx = d["positions"].astype(np.float64), d["normals"], d["triangles"].astype(np.int64)
        C = pos[idx].mean(axis=1)
        names = classify(C)
        all_names |= set(names)
        variants[name] = (pos, nrm, idx, C, names)

    order = sorted(all_names)
    lut = {k: i for i, k in enumerate(order)}
    anchors = {}
    for name, (pos, nrm, idx, C, names) in variants.items():
        raw = np.array([lut[s] for s in names], dtype=np.int64)
        # finer meshes need more passes for the same physical smoothing
        iters = 2 if len(idx) < 60000 else 5
        labels = smooth(raw, idx, iterations=iters)
        P, N, R, B, I = split_and_feather(pos.astype(np.float32), nrm, idx, labels)
        out = CACHE / f"regions_{name}"
        out.mkdir(parents=True, exist_ok=True)
        for fname, arr, dt in (("positions", P, "<f4"), ("normals", N, "<f4"), ("region", R, "<f4"),
                               ("border", B, "<f4"), ("indices", I, "<u4")):
            (out / f"{fname}.bin").write_bytes(np.ascontiguousarray(arr, dtype=dt).tobytes())
        print(f"{name}: {len(order)} regions, {len(idx)} triangles, {len(P)} vertices after border split")
        if name == "standard":
            for i, k in enumerate(order):
                m = labels == i
                if not m.any():
                    m = raw == i
                if not m.any():
                    continue
                pts = C[m]
                c = pts.mean(axis=0)
                best = pts[np.argmin(np.linalg.norm(pts - c, axis=1))]
                anchors[k] = [round(float(v) * APP_SCALE, 4) for v in best]
        if "--preview" in sys.argv:
            preview(C, labels, order, pos, idx, out_dir=ROOT / f"scripts/preview/{name}")

    missing = [k for k in order if k not in anchors]
    assert not missing, f"regions without an anchor: {missing}"
    lines = [
        "// AUTO-GENERATED by scripts/build_regions.py. Do not edit by hand.",
        "// Index in REGION_ORDER == the _REGION vertex attribute baked into",
        "// public/models/body-*.glb.",
        "",
        f"export const REGION_ORDER = {json.dumps(order)} as const;",
        "",
        "export const REGION_ANCHORS: Record<string, [number, number, number]> = {",
    ]
    lines += [f"  {json.dumps(k)}: {json.dumps(anchors[k])}," for k in order]
    lines += ["};", ""]
    OUT_TS.write_text("\n".join(lines))


def preview(C, labels, order, pos, idx, out_dir=ROOT / "scripts/preview"):
    """Render shaded, region-coloured triangles from four directions per crop."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import PolyCollection

    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(11)
    cols = rng.random((len(order), 3)) * 0.75 + 0.25
    tri = pos[idx]
    nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    nrm /= -(np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12)  # mesh winds clockwise
    # (screen-x axis, view direction toward camera)
    views = {
        "front": (np.array([1, 0, 0.0]), np.array([0, 0, 1.0])),
        "back": (np.array([-1, 0, 0.0]), np.array([0, 0, -1.0])),
        "from model's left": (np.array([0, 0, -1.0]), np.array([1, 0, 0.0])),
        "from model's right": (np.array([0, 0, 1.0]), np.array([-1, 0, 0.0])),
    }
    x, y = C[:, 0], C[:, 1]
    crops = {
        "full": np.ones(len(C), bool),
        "head": y > 2.85,
        "torso": (np.abs(x) < 0.42) & (y > 1.45) & (y < 2.98),
        "arm": (x > 0.33 - 0.206 * (y - 2.54)) & (y > 1.85) & (x > 0.12),
        "hand": (x > 0.7) & (y < 2.05),
        "leg": (x > 0) & (y < 1.95) & (x < 0.5),
        "foot": (x > 0) & (y < 0.3),
    }
    for crop, mask in crops.items():
        fig, axes = plt.subplots(1, 4, figsize=(28, 12))
        for ax, (v, (sx, vd)) in zip(axes, views.items()):
            facing = mask & (C @ vd > np.percentile((C @ vd)[mask], 15))
            depth = C @ vd
            o = np.where(facing)[0]
            o = o[np.argsort(depth[o])]
            X = tri[o] @ sx
            Y = tri[o][:, :, 1]
            shade = 0.5 + 0.5 * np.abs(nrm[o] @ vd)
            fc = cols[labels[o]] * shade[:, None]
            ax.add_collection(PolyCollection(np.stack([X, Y], -1), facecolors=fc, edgecolors="none"))
            ax.set_xlim(X.min() - 0.02, X.max() + 0.02)
            ax.set_ylim(Y.min() - 0.02, Y.max() + 0.02)
            ax.set_aspect("equal")
            ax.set_title(v)
            cx = C @ sx
            vis = facing & (depth > np.percentile(depth[facing], 45))
            for i, k in enumerate(order):
                m = (labels == i) & vis
                if m.sum() < 4:
                    continue
                ax.text(cx[m].mean(), C[m, 1].mean(), k, fontsize=6 if crop == "full" else 8,
                        ha="center", va="center",
                        bbox=dict(boxstyle="round,pad=0.1", fc="white", alpha=0.65, lw=0))
            ax.axis("off")
        plt.tight_layout()
        plt.savefig(out_dir / f"{crop}.png", dpi=60)
        plt.close()


if __name__ == "__main__":
    main()
