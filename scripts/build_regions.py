#!/usr/bin/env python3
"""
Precompute the body-region map for the 3D avatar.

Step 2 of the model pipeline. Every triangle of each prepared body mesh
(scripts/.cache/body_l*.npz from scripts/build_body_mesh.py) is assigned to
exactly one anatomical region, using hand-tuned geometric rules built on top of
real joint landmarks taken from the model's own skeleton (the rigged "Man" in
the source file, shifted onto the HighPoly mesh).

Every vertex gets one region id; edges that cross a region border are
refined until short, so the app can draw each border as a smooth line through
the triangles between differently-labelled vertices. Step 3 (scripts/pack_models.mjs) turns the results
into compressed GLBs.

Outputs
  scripts/.cache/regions_<variant>/*.bin  positions, normals, region, indices (raw LE arrays)
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
BODIES = {"male": "body_male_l0.npz", "female": "body_female_l0.npz"}
MAX_BORDER_EDGE = 0.02  # split edges that cross a region border until shorter than this (~1 cm)
MAX_REFINE_ROUNDS = 8
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
def coarse_parts(p):
    """Split points (left-side folded, canonical male coordinates) into
    head / arm / leg / neck / trunk."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    head_cut = 3.10 - 0.30 * (z + 0.05)            # under the jaw -> base of skull
    is_head = y > head_cut
    arm_line = 0.32 - 0.206 * (y - 2.54)           # armpit -> top of shoulder
    is_arm = (x > arm_line) & (y > 1.45) & ~is_head
    # Leg vs trunk: inguinal crease in front, gluteal fold behind.
    crotch_front = 1.60 + 0.65 * np.clip(x - 0.02, 0, None)
    leg_cut = np.where(z > 0.03, np.minimum(crotch_front, 1.80), 1.53 + 0.1 * np.clip(x - 0.05, 0, None))
    is_leg = (y < leg_cut) & ~is_arm
    is_neck = ~is_head & ~is_arm & (y > 2.86 - 0.25 * np.clip(x - 0.05, 0, None))
    is_trunk = ~is_head & ~is_arm & ~is_leg & ~is_neck
    return is_head, is_arm, is_leg, is_neck, is_trunk


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
    is_head, is_arm, is_leg, is_neck, is_trunk = coarse_parts(p)

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
    put(front & (y > 2.36) & (x >= 0.075), "lower_ribs_front")
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


# ---------------------------------------------------------------- other bodies
# The rules above are written in the male body's coordinates ("canonical").
# Any other body is classified by first mapping each of its points onto the
# matching spot of the male body, bone by bone, using both skeletons' joints
# (scripts/landmarks.json, from scripts/extract_landmarks.mjs):
#   arms / legs   rigid-plus-scale transform of each bone (upper arm, forearm,
#                 hand, thigh, shin, foot), blended smoothly across joints
#   torso / neck  heights matched piecewise between joints, width scaled
#                 between the hip and shoulder joints
#   head          uniform scale about the chin
# The male body maps to itself, so its regions are unaffected.
LANDMARKS = json.loads((ROOT / "scripts/landmarks.json").read_text())


def _frame(axis, secondary):
    e1 = axis / np.linalg.norm(axis)
    e2 = secondary - (secondary @ e1) * e1
    e2 /= np.linalg.norm(e2)
    return np.stack([e1, e2, np.cross(e1, e2)], axis=1)


def _bone_map(a_src, b_src, sec_src, a_dst, b_dst, sec_dst):
    """Similarity transform taking bone a_src->b_src onto a_dst->b_dst."""
    R = _frame(b_dst - a_dst, sec_dst) @ _frame(b_src - a_src, sec_src).T
    s = np.linalg.norm(b_dst - a_dst) / np.linalg.norm(b_src - a_src)
    return lambda q: a_dst + s * (q - a_src) @ R.T


def _recentre(joint, a, b, pts, r):
    """Move a joint to the centre of its limb's cross-section (rig joints sit
    off-centre in this model)."""
    d = (b - a) / np.linalg.norm(b - a)
    m = (np.abs((pts - joint) @ d) < 0.012) & (np.linalg.norm(pts - joint, axis=1) < r)
    return pts[m].mean(axis=0) if m.sum() > 5 else joint


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def make_canonical_mapper(body, mesh_pos):
    """Return f(points) -> points in canonical (male) coordinates."""
    if body == "male":
        return lambda P: P
    J = {k: np.array(v, float) for k, v in LANDMARKS[body]["joints"].items()}
    M = {k: np.array(v, float) for k, v in LANDMARKS["male"]["joints"].items()}
    top_src = LANDMARKS[body]["highpolyBounds"]["max"][1]
    top_dst = LANDMARKS["male"]["highpolyBounds"]["max"][1]
    left = mesh_pos[mesh_pos[:, 0] > 0]

    # source joints (left side), elbow/wrist re-centred like the male constants
    sh, el, wr = J["upper_arm.L"], J["forearm.L"], J["hand.L"]
    el = _recentre(el, sh, el, left, 0.12)
    wr = _recentre(wr, el, wr, left, 0.09)
    hip, kn, an, toe = J["thigh.L"], J["shin.L"], J["foot.L"], J["toe.L"]
    across_src = J["f_index.01.L"] - J["f_pinky.01.L"]
    across_dst = np.array(FINGERS["index"][0]) - np.array(FINGERS["pinky"][0])
    knuckle_src, knuckle_dst = J["f_middle.01.L"], np.array(FINGERS["middle"][0])
    fwd = np.array([0, 0, 1.0])
    up = np.array([0, 1.0, 0])

    upper = _bone_map(sh, el, across_src, SHOULDER, ELBOW, across_dst)
    fore = _bone_map(el, wr, across_src, ELBOW, WRIST, across_dst)
    hand = _bone_map(wr, knuckle_src, across_src, WRIST, knuckle_dst, across_dst)
    thigh = _bone_map(hip, kn, fwd, HIP, KNEE, fwd)
    shin = _bone_map(kn, an, fwd, KNEE, ANKLE, fwd)
    foot = _bone_map(an, toe, up, ANKLE, TOE_BASE, up)

    chin_src = np.array([0.0, J["chin"][1], J["chin"][2]])
    chin_dst = np.array([0.0, M["chin"][1], M["chin"][2]])
    head_s = (top_dst - chin_dst[1]) / (top_src - chin_src[1])

    ys_src = [0.0, an[1], kn[1], hip[1], J["spine"][1], J["spine.004"][1], chin_src[1], top_src]
    ys_dst = [0.0, ANKLE[1], KNEE[1], HIP[1], M["spine"][1], M["spine.004"][1], chin_dst[1], top_dst]
    zs_off = [0.0, 0.0, 0.0, 0.0, M["spine"][2] - J["spine"][2], M["spine.004"][2] - J["spine.004"][2],
              chin_dst[2] - chin_src[2], chin_dst[2] - chin_src[2]]
    sx_hip, sx_sh = HIP[0] / hip[0], SHOULDER[0] / sh[0]

    def trunk_rough(q):
        y_dst = np.interp(q[:, 1], ys_src, ys_dst)
        sx = np.interp(y_dst, [HIP[1], SHOULDER[1]], [sx_hip, sx_sh])
        return np.stack([q[:, 0] * sx, y_dst, q[:, 2] + np.interp(q[:, 1], ys_src, zs_off)], axis=1)

    # Refine the torso/neck mapping with measured cross-sections: at every
    # (canonical) height, match this body's torso half-width and front/back
    # extent to the male torso's, so front/side/back rules line up.
    bins = np.arange(1.50, 3.02, 0.03)

    def profile(pts_own, pts_canon_y, mask):
        w, zlo, zhi = [], [], []
        for y0 in bins:
            m = mask & (np.abs(pts_canon_y - y0) < 0.03)
            if m.sum() < 8:
                w.append(np.nan); zlo.append(np.nan); zhi.append(np.nan)
                continue
            w.append(np.percentile(np.abs(pts_own[m, 0]), 97))
            zlo.append(np.percentile(pts_own[m, 2], 2))
            zhi.append(np.percentile(pts_own[m, 2], 98))
        out = []
        for arr in (w, zlo, zhi):
            arr = np.array(arr)
            ok = ~np.isnan(arr)
            arr = np.interp(bins, bins[ok], arr[ok])
            out.append(np.convolve(np.pad(arr, 2, mode="edge"), np.ones(5) / 5, mode="valid"))
        return out

    male_pos = np.load(CACHE / BODIES["male"])["positions"].astype(float)
    mp = male_pos.copy(); mp[:, 0] = np.abs(mp[:, 0])
    _, m_arm, m_leg, _, _ = coarse_parts(mp)
    Wm, ZLm, ZHm = profile(mp, mp[:, 1], ~m_arm & ~m_leg)
    sp = mesh_pos.copy(); sp[:, 0] = np.abs(sp[:, 0])
    rough = trunk_rough(sp)
    _, s_arm, s_leg, _, _ = coarse_parts(rough)
    Ws, ZLs, ZHs = profile(sp, rough[:, 1], ~s_arm & ~s_leg)

    def trunk(q):
        y_dst = np.interp(q[:, 1], ys_src, ys_dst)
        sx = np.interp(y_dst, bins, Wm / Ws)
        zl_s, zh_s = np.interp(y_dst, bins, ZLs), np.interp(y_dst, bins, ZHs)
        zl_m, zh_m = np.interp(y_dst, bins, ZLm), np.interp(y_dst, bins, ZHm)
        z = zl_m + (q[:, 2] - zl_s) * (zh_m - zl_m) / (zh_s - zl_s)
        # below the torso profile (legs) keep the simple mapping
        below = y_dst < bins[0]
        rough_q = trunk_rough(q)
        x = np.where(below, rough_q[:, 0], q[:, 0] * sx)
        z = np.where(below, rough_q[:, 2], z)
        return np.stack([x, y_dst, z], axis=1)

    def mapper(P):
        sign = np.where(P[:, 0] >= 0, 1.0, -1.0)
        q = P.copy()
        q[:, 0] = np.abs(q[:, 0])
        T = trunk(q)
        is_head, is_arm, is_leg, _, _ = coarse_parts(T)
        out = T.copy()

        # head: uniform scale about the chin, blended in over the upper neck
        H = chin_dst + (q - chin_src) * head_s
        w = _smoothstep(chin_src[1] - 0.12, chin_src[1], q[:, 1])[:, None]
        hm = is_head | (w[:, 0] > 0) & ~is_arm
        out[hm] = (1 - w[hm]) * T[hm] + w[hm] * H[hm]

        # arms: upper arm -> forearm -> hand, blended across elbow and wrist
        if is_arm.any():
            a = q[is_arm]
            t_fo, _ = seg_param(a, el, wr)
            w_el = _smoothstep(-0.08, 0.08, t_fo)[:, None]
            w_wr = _smoothstep(0.94, 1.06, t_fo)[:, None]
            out[is_arm] = (1 - w_el) * upper(a) + w_el * ((1 - w_wr) * fore(a) + w_wr * hand(a))

        # legs: thigh -> shin -> foot
        if is_leg.any():
            g = q[is_leg]
            t_sh, _ = seg_param(g, kn, an)
            w_kn = _smoothstep(-0.06, 0.06, t_sh)[:, None]
            w_an = _smoothstep(0.95, 1.08, t_sh)[:, None]
            out[is_leg] = (1 - w_kn) * thigh(g) + w_kn * ((1 - w_an) * shin(g) + w_an * foot(g))

        out[:, 0] *= sign
        return out

    return mapper



def vertex_adjacency(idx, n):
    """Sparse vertex adjacency (CSR) from triangle edges."""
    from scipy.sparse import coo_matrix

    e = np.concatenate([idx[:, [0, 1]], idx[:, [1, 2]], idx[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    g = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    g.data[:] = 1
    return g


def smooth(labels, adj, iterations=2):
    """Majority filter over each vertex's neighbours: a vertex takes the label
    shared by more than half of its neighbours. Removes one-vertex zigzags."""
    lab = labels.copy()
    indptr, nbrs = adj.indptr, adj.indices
    for _ in range(iterations):
        new = lab.copy()
        for v in range(len(lab)):
            nb = lab[nbrs[indptr[v]:indptr[v + 1]]]
            if len(nb) == 0:
                continue
            vals, cnts = np.unique(nb, return_counts=True)
            k = cnts.argmax()
            if cnts[k] * 2 > len(nb) and vals[k] != lab[v]:
                new[v] = vals[k]
        lab = new
    return lab


def remove_islands(labels, adj, max_rounds=20):
    """Make every region one connected patch: any piece of a region other than
    its largest is relabelled to the label most common around it."""
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components

    lab = labels.copy()
    g = adj.tocoo()
    n = len(lab)
    for _ in range(max_rounds):
        same = lab[g.row] == lab[g.col]
        _, comp = connected_components(
            coo_matrix((np.ones(same.sum()), (g.row[same], g.col[same])), shape=(n, n)), directed=False)
        sizes = np.bincount(comp)
        comp_label = np.zeros(sizes.size, int)
        comp_label[comp] = lab
        best = {}
        for c in range(sizes.size):
            l = comp_label[c]
            if l not in best or sizes[c] > sizes[best[l]]:
                best[l] = c
        keep = np.zeros(sizes.size, bool)
        keep[list(best.values())] = True
        stray = np.flatnonzero(~keep)
        if len(stray) == 0:
            break
        for c in stray:
            vs = np.flatnonzero(comp == c)
            out = adj[vs].indices
            out = out[comp[out] != c]
            if len(out):
                vals, cnts = np.unique(lab[out], return_counts=True)
                lab[vs] = vals[cnts.argmax()]
    return lab


def refine_borders(pos, nrm, idx, labels, max_edge=MAX_BORDER_EDGE):
    """Split edges whose two ends are in different regions (and are longer than
    max_edge) at their midpoint; both triangles on the edge are split in two,
    so the mesh stays watertight and its shape is unchanged.
    Returns (pos, nrm, idx, new_vertex_count)."""
    a, b = idx[:, [0, 1, 2]].reshape(-1), idx[:, [1, 2, 0]].reshape(-1)
    sel = (labels[a] != labels[b]) & (np.linalg.norm(pos[a] - pos[b], axis=1) > max_edge)
    todo = {(min(u, v), max(u, v)) for u, v in zip(a[sel].tolist(), b[sel].tolist())}
    if not todo:
        return pos, nrm, idx, 0
    faces = [tuple(f) for f in idx.tolist()]
    alive = [True] * len(faces)
    edge_faces = {}
    for fi, (x, y, z) in enumerate(faces):
        for u, v in ((x, y), (y, z), (z, x)):
            edge_faces.setdefault((min(u, v), max(u, v)), []).append(fi)
    pos_l, nrm_l = [tuple(p) for p in pos], [tuple(q) for q in nrm]
    # split longest first so the new triangles stay well shaped
    for key in sorted(todo, key=lambda k: -np.linalg.norm(pos[k[0]] - pos[k[1]])):
        fs = [f for f in edge_faces.get(key, []) if alive[f]]
        if not fs:
            continue
        u, v = key
        m = len(pos_l)
        pos_l.append(tuple((np.array(pos_l[u]) + np.array(pos_l[v])) / 2))
        nn = np.array(nrm_l[u]) + np.array(nrm_l[v])
        nrm_l.append(tuple(nn / (np.linalg.norm(nn) + 1e-12)))
        del edge_faces[key]
        for f in fs:
            x, y, z = faces[f]
            for _ in range(3):
                if (min(x, y), max(x, y)) == key:
                    break
                x, y, z = y, z, x
            alive[f] = False
            for nf in ((x, m, z), (m, y, z)):
                faces.append(nf)
                alive.append(True)
                fi = len(faces) - 1
                p_, q_, r_ = nf
                for s_, t_ in ((p_, q_), (q_, r_), (r_, p_)):
                    edge_faces.setdefault((min(s_, t_), max(s_, t_)), []).append(fi)
    new_idx = np.array([f for f, ok in zip(faces, alive) if ok], dtype=np.int64)
    return np.array(pos_l), np.array(nrm_l, dtype=nrm.dtype), new_idx, len(pos_l) - len(pos)


def label_mesh(pos, nrm, idx, lut, classify_fn=None):
    classify_fn = classify_fn or classify
    """Label every vertex, refine edges that cross region borders until they
    are short, then clean up. The app draws each border as the smooth line
    halfway between differently-labelled vertices."""
    for _ in range(MAX_REFINE_ROUNDS):
        lab = np.array([lut[s] for s in classify_fn(pos)])
        pos, nrm, idx, added = refine_borders(pos, nrm, idx, smooth(lab, vertex_adjacency(idx, len(pos)), 1))
        if added == 0:
            break
    raw = np.array([lut[s] for s in classify_fn(pos)])
    adj = vertex_adjacency(idx, len(pos))
    lab = remove_islands(smooth(raw, adj, 2), adj)
    return pos, nrm, idx, raw, lab


def body_classifier(body, mesh_pos):
    """classify() for a given body: map to canonical coordinates first, then
    apply body-specific extra regions."""
    to_canon = make_canonical_mapper(body, mesh_pos)
    apexes = breast_apexes(mesh_pos, classify(to_canon(mesh_pos))) if body == "female" else None

    def fn(P):
        names = classify(to_canon(P))
        if apexes is not None:
            names = add_breast(P, names, apexes)
        return names

    return fn


BREAST_RADIUS = 0.15   # mesh units (~7.5 cm on the female body)
BREAST_DEPTH = 0.13    # how far back from the apex the region reaches


def breast_apexes(P, names):
    """Most forward point of the chest on each side."""
    out = {}
    for side, sign in (("L", 1), ("R", -1)):
        m = names == f"chest_{side}"
        pts = P[m]
        out[side] = pts[np.argmax(pts[:, 2])]
    return out


def add_breast(P, names, apexes):
    """Female only: the rounded area around each chest apex becomes the breast
    (taken from the chest and the adjoining rib regions)."""
    names = names.copy()
    for side, apex in apexes.items():
        donors = np.isin(names, [f"chest_{side}", f"side_ribs_{side}", f"lower_ribs_front_{side}"])
        near = (np.linalg.norm(P - apex, axis=1) < BREAST_RADIUS) & (P[:, 2] > apex[2] - BREAST_DEPTH)
        names[donors & near] = f"breast_{side}"
    return names


def main():
    meshes = {}
    for body, fname in BODIES.items():
        d = np.load(CACHE / fname)
        meshes[body] = (d["positions"].astype(np.float64), d["normals"], d["triangles"].astype(np.int64))
    classifiers = {b: body_classifier(b, m[0]) for b, m in meshes.items()}
    # Region order: every name any body can produce (male order is a stable prefix-free sort).
    all_names = set()
    for b, (pos, _, _) in meshes.items():
        all_names |= set(classifiers[b](pos))
    order = sorted(all_names)
    lut = {k: i for i, k in enumerate(order)}

    anchors = {}
    for body, (pos, nrm, idx) in meshes.items():
        n0 = len(idx)
        pos, nrm, idx, raw, labels = label_mesh(pos, nrm, idx, lut, classifiers[body])
        out = CACHE / f"regions_{body}"
        out.mkdir(parents=True, exist_ok=True)
        for f_ in out.glob("*.bin"):
            f_.unlink()
        for fname, arr, dt in (("positions", pos, "<f4"), ("normals", nrm, "<f4"),
                               ("region", labels, "<f4"), ("indices", idx, "<u4")):
            (out / f"{fname}.bin").write_bytes(np.ascontiguousarray(arr, dtype=dt).tobytes())
        present = sorted({order[i] for i in np.unique(labels)})
        print(f"{body}: {len(present)} regions, {n0} -> {len(idx)} triangles / {len(pos)} vertices after border refinement")
        anchors[body] = {}
        for k in present:
            m = labels == lut[k]
            pts = pos[m]
            c = pts.mean(axis=0)
            best = pts[np.argmin(np.linalg.norm(pts - c, axis=1))]
            anchors[body][k] = [round(float(v) * APP_SCALE, 4) for v in best]
        if "--preview" in sys.argv:
            face_lab = labels[idx[:, 0]]
            preview(pos[idx].mean(axis=1), face_lab, order, pos, idx, out_dir=ROOT / f"scripts/preview/{body}")

    lines = [
        "// AUTO-GENERATED by scripts/build_regions.py. Do not edit by hand.",
        "// Index in REGION_ORDER == the _REGION vertex attribute baked into",
        "// public/models/body-<body>.glb.",
        "",
        f"export const BODY_TYPES = {json.dumps(list(BODIES))} as const;",
        "export type BodyType = (typeof BODY_TYPES)[number];",
        "",
        f"export const REGION_ORDER = {json.dumps(order)} as const;",
        "",
        "/** Label anchor per region for each body; a region exists on a body iff it has an anchor. */",
        "export const REGION_ANCHORS: Record<BodyType, Record<string, [number, number, number]>> = {",
    ]
    for body, a in anchors.items():
        lines.append(f"  {body}: {{")
        lines += [f"    {json.dumps(k)}: {json.dumps(v)}," for k, v in a.items()]
        lines.append("  },")
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
