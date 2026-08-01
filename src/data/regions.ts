// Curated anatomical landmark database — the "content" half of the app.
//
// Each region is anchored to a single WORLD-SPACE point on the detailed body
// mesh (see scene/HumanMesh.tsx). Click/tap selection raycasts the mesh
// directly and picks whichever region's anchor is nearest the hit point
// (see lib/regionMatch.ts) — there's no per-segment partitioning, since the
// mesh is one continuous surface and "nearest anchor, globally" is both
// simpler and immune to the mesh/hitbox misalignment that a segmented
// approach would risk.
//
// Anchor coordinates were captured by clicking the actual rendered mesh in
// a live browser session (not invented), so they sit on real anatomical
// landmarks rather than approximated primitive shapes.
//
// Content is intentionally educational/non-diagnostic: names + plain-language
// descriptions + "commonly associated with" possible causes, never a claim
// of diagnosis. `redFlags`, where present, surface a short urgent-care note.

export type RegionCategory =
  | "bone"
  | "joint"
  | "tendon"
  | "ligament"
  | "muscle"
  | "nerve"
  | "region";

export interface RegionDef {
  id: string;
  name: string;
  /** World-space anchor point [x, y, z], in the same coordinates as the rendered mesh. */
  anchor: [number, number, number];
  category: RegionCategory;
  description: string;
  possibleCauses: string[];
  redFlags?: string[];
}

/**
 * Author a bilateral landmark once (for the left side) and mirror it to the
 * right by negating X — the mesh is bilaterally symmetric about X=0, so a
 * landmark anchored the same way anatomically on both sides always has
 * exactly opposite X and identical Y/Z.
 */
function bilateralRegion(
  idBase: string,
  nameBase: string,
  anchorLeft: [number, number, number],
  category: RegionCategory,
  description: string,
  possibleCauses: string[],
  redFlags?: string[],
): [RegionDef, RegionDef] {
  const [x, y, z] = anchorLeft;
  const base = { category, description, possibleCauses, redFlags };
  return [
    { ...base, id: `${idBase}_L`, name: `Left ${nameBase}`, anchor: [x, y, z] },
    { ...base, id: `${idBase}_R`, name: `Right ${nameBase}`, anchor: [-x, y, z] },
  ];
}

const central: RegionDef[] = [
  {
    id: "back_of_neck",
    name: "Back of Neck",
    anchor: [0, 1.555, -0.023],
    category: "muscle",
    description: "The muscles and upper spine at the back of the neck, below the base of the skull.",
    possibleCauses: [
      "Muscle tension or strain",
      "Poor posture (\"tech neck\")",
      "Cervical strain",
      "Pinched nerve (cervical radiculopathy)",
    ],
  },
  {
    id: "chest_center",
    name: "Center of Chest",
    anchor: [0, 1.329, 0.102],
    category: "region",
    description: "The front-center of the chest, over the breastbone (sternum) and rib cartilage.",
    possibleCauses: [
      "Muscle strain",
      "Costochondritis (inflammation of rib cartilage)",
      "Acid reflux (GERD)",
      "Anxiety",
    ],
    redFlags: [
      "Sudden severe chest pain — especially with shortness of breath, pain radiating to the arm/jaw, sweating, or nausea — can be a sign of a heart attack. Call emergency services immediately.",
    ],
  },
  {
    id: "upper_back",
    name: "Upper Back",
    anchor: [0, 1.363, -0.083],
    category: "muscle",
    description: "The muscles between the shoulder blades, over the upper (thoracic) spine.",
    possibleCauses: ["Muscle strain", "Poor posture", "Thoracic spine dysfunction"],
  },
  {
    id: "upper_abdomen_center",
    name: "Upper Abdomen (Epigastric)",
    anchor: [0, 1.195, 0.127],
    category: "region",
    description: "The upper-center of the abdomen, just below the breastbone.",
    possibleCauses: ["Indigestion or acid reflux", "Gastritis", "Peptic ulcer"],
    redFlags: [
      "Severe, persistent upper abdominal pain can indicate a serious condition (e.g. pancreatitis or gallbladder disease) — seek prompt medical evaluation.",
    ],
  },
  {
    id: "lower_back_lumbar",
    name: "Lower Back (Lumbar)",
    anchor: [0, 1.126, -0.052],
    category: "region",
    description: "The lower spine and surrounding muscles, above the pelvis.",
    possibleCauses: ["Muscle strain", "Herniated disc", "Sciatica", "Degenerative disc disease"],
    redFlags: [
      "Sudden severe back pain with numbness, weakness, or loss of bladder/bowel control needs urgent medical evaluation.",
    ],
  },
  {
    id: "lower_abdomen_right",
    name: "Lower Right Abdomen",
    anchor: [0.074, 1.088, 0.118],
    category: "region",
    description: "The lower-right quadrant of the abdomen.",
    possibleCauses: ["Constipation", "Ovarian cyst (in women)", "Kidney stone", "Appendicitis"],
    redFlags: [
      "Sudden, severe right-lower-abdominal pain — especially with fever, nausea, or vomiting — can indicate appendicitis. Seek urgent medical care.",
    ],
  },
  {
    id: "lower_abdomen_left",
    name: "Lower Left Abdomen",
    anchor: [-0.088, 1.088, 0.114],
    category: "region",
    description: "The lower-left quadrant of the abdomen.",
    possibleCauses: ["Constipation", "Diverticulitis", "Ovarian cyst (in women)", "Kidney stone"],
    redFlags: [
      "Sudden, severe left-lower-abdominal pain with fever can indicate diverticulitis. Seek prompt medical care.",
    ],
  },
  {
    id: "tailbone_coccyx",
    name: "Tailbone (Coccyx)",
    anchor: [0, 0.95, -0.06],
    category: "bone",
    description: "The small bone at the very base of the spine.",
    possibleCauses: ["Coccydynia (tailbone pain)", "Fall or direct trauma", "Prolonged sitting"],
  },
];

const paired: RegionDef[] = [
  ...bilateralRegion(
    "temple",
    "Temple",
    [-0.054, 1.687, 0.102],
    "muscle",
    "The flattened area on the side of the head, between the eye and ear.",
    ["Tension headache", "Migraine", "TMJ dysfunction", "Temporal arteritis (rare, more common in older adults)"],
  ),
  ...bilateralRegion(
    "jaw_tmj",
    "Jaw / TMJ",
    [-0.043, 1.601, 0.120],
    "joint",
    "The jaw joint, just in front of the ear, where the jawbone meets the skull.",
    ["TMJ disorder", "Teeth grinding (bruxism)", "Dental issues", "Ear infection"],
  ),
  ...bilateralRegion(
    "shoulder_top",
    "Shoulder (Rotator Cuff Area)",
    [-0.206, 1.387, 0.044],
    "joint",
    "The top and outer part of the shoulder, over the rotator cuff tendons.",
    ["Rotator cuff strain or tear", "Shoulder impingement syndrome", "Bursitis", "Frozen shoulder (adhesive capsulitis)"],
  ),
  ...bilateralRegion(
    "ac_joint",
    "AC Joint",
    [-0.260, 1.269, 0.044],
    "joint",
    "The joint at the top of the shoulder where the collarbone meets the shoulder blade.",
    ["AC joint sprain", "Osteoarthritis of the AC joint", "Fall onto the shoulder (shoulder separation)"],
  ),
  ...bilateralRegion(
    "pec",
    "Chest (Pec)",
    [-0.1274, 1.363, 0.0856],
    "muscle",
    "The chest muscle (pectoralis), to the side of the breastbone.",
    ["Muscle strain", "Costochondritis", "Pectoral muscle strain or tear (more common in weightlifting)"],
  ),
  ...bilateralRegion(
    "shoulder_blade",
    "Shoulder Blade",
    [-0.1277, 1.347, -0.0787],
    "bone",
    "The shoulder blade (scapula) and surrounding muscles, on the upper back.",
    ["Muscle strain (rhomboid strain)", "Poor posture", "Snapping scapula syndrome"],
  ),
  ...bilateralRegion(
    "upper_arm",
    "Upper Arm",
    [-0.3053, 1.2133, 0.0334],
    "muscle",
    "The biceps/triceps area between the shoulder and elbow.",
    ["Muscle strain", "Biceps or triceps tendinitis", "Overuse injury"],
  ),
  ...bilateralRegion(
    "lateral_epicondyle",
    "Outer Elbow",
    [-0.358, 1.153, 0.0365],
    "bone",
    "The bony bump on the outer side of the elbow.",
    ["Lateral epicondylitis (\"tennis elbow\")", "Radial tunnel syndrome"],
  ),
  ...bilateralRegion(
    "medial_epicondyle",
    "Inner Elbow",
    [-0.318, 1.153, 0.0365],
    "bone",
    "The bony bump on the inner side of the elbow.",
    ["Medial epicondylitis (\"golfer's elbow\")", "Ulnar nerve irritation"],
  ),
  ...bilateralRegion(
    "forearm",
    "Forearm",
    [-0.4128, 1.0181, 0.0676],
    "muscle",
    "The muscles of the forearm, between the elbow and wrist.",
    ["Muscle strain", "Forearm tendinitis", "Overuse injury (e.g. from repetitive gripping)"],
  ),
  ...bilateralRegion(
    "carpal_tunnel_area",
    "Wrist (Palm Side)",
    [-0.4086, 0.9236, 0.1081],
    "nerve",
    "The underside of the wrist, over the carpal tunnel.",
    ["Carpal tunnel syndrome", "Wrist sprain", "Tendinitis"],
  ),
  ...bilateralRegion(
    "thumb_base",
    "Base of Thumb",
    [-0.4079, 0.8944, 0.1274],
    "joint",
    "The joint at the base of the thumb, near the wrist.",
    ["De Quervain's tenosynovitis", "Thumb carpometacarpal (CMC) osteoarthritis"],
  ),
  ...bilateralRegion(
    "hip_lateral",
    "Outer Hip",
    [-0.116, 0.796, 0.106],
    "bone",
    "The bony point on the outer side of the hip (greater trochanter).",
    ["Greater trochanteric bursitis", "Hip osteoarthritis", "IT band syndrome"],
  ),
  ...bilateralRegion(
    "groin",
    "Groin",
    [-0.054, 0.951, 0.112],
    "region",
    "The inner-thigh/pelvic crease area where the leg meets the torso.",
    ["Groin strain (adductor strain)", "Hip flexor strain", "Inguinal hernia"],
  ),
  ...bilateralRegion(
    "oblique",
    "Side of Abdomen (Oblique)",
    [-0.1281, 1.1451, 0.0774],
    "muscle",
    "The oblique muscles along the side of the abdomen, between the ribs and hip.",
    ["Muscle strain (oblique strain)", "Intercostal muscle strain", "Rib injury"],
  ),
  ...bilateralRegion(
    "glute",
    "Buttock (Glute)",
    [-0.098, 0.9586, -0.0556],
    "muscle",
    "The gluteal muscles of the buttock.",
    ["Muscle strain", "Sciatica (pain radiating from the lower back)", "Piriformis syndrome"],
  ),
  ...bilateralRegion(
    "thigh_front",
    "Thigh",
    [-0.13, 0.68, 0.09],
    "muscle",
    "The quadriceps muscle at the front of the thigh.",
    ["Muscle strain (quad strain)", "Contusion (bruise)", "Overuse injury"],
  ),
  ...bilateralRegion(
    "kneecap_patella",
    "Kneecap",
    [-0.12, 0.57, 0.10],
    "bone",
    "The kneecap (patella) at the front of the knee.",
    ["Patellofemoral pain syndrome", "Patellar tendinitis (\"jumper's knee\")", "Chondromalacia patellae"],
  ),
  ...bilateralRegion(
    "knee_joint_line_medial",
    "Inner Knee",
    [-0.098, 0.567, 0.064],
    "joint",
    "The joint line on the inner side of the knee.",
    ["Medial meniscus tear", "MCL sprain", "Osteoarthritis"],
  ),
  ...bilateralRegion(
    "knee_joint_line_lateral",
    "Outer Knee",
    [-0.143, 0.570, 0.085],
    "joint",
    "The joint line on the outer side of the knee.",
    ["Lateral meniscus tear", "LCL sprain", "IT band syndrome"],
  ),
  ...bilateralRegion(
    "back_of_knee",
    "Back of Knee",
    [-0.120, 0.562, -0.022],
    "region",
    "The hollow area behind the knee.",
    ["Baker's cyst", "Hamstring tendinitis", "Deep vein thrombosis (less common, but important to rule out)"],
    [
      "Sudden swelling, warmth, and pain behind one knee/calf can indicate a blood clot (DVT) — seek prompt medical evaluation, especially after recent surgery, immobility, or long travel.",
    ],
  ),
  ...bilateralRegion(
    "shin_front",
    "Shin",
    [-0.171, 0.376, 0.044],
    "bone",
    "The front of the lower leg, along the shin bone (tibia).",
    ["Shin splints (medial tibial stress syndrome)", "Stress fracture", "Exertional compartment syndrome"],
  ),
  ...bilateralRegion(
    "calf",
    "Calf",
    [-0.156, 0.399, -0.057],
    "muscle",
    "The muscle at the back of the lower leg, below the knee.",
    ["Muscle strain (calf strain)", "Cramp", "Achilles tendon-related tightness"],
  ),
  ...bilateralRegion(
    "medial_malleolus",
    "Inner Ankle Bone",
    [-0.140, 0.072, 0.063],
    "bone",
    "The bony bump on the inner side of the ankle.",
    ["Ankle sprain (deltoid ligament)", "Fracture (if the injury was severe)", "Posterior tibial tendinitis"],
  ),
  ...bilateralRegion(
    "lateral_malleolus",
    "Outer Ankle Bone",
    [-0.177, 0.072, 0.063],
    "bone",
    "The bony bump on the outer side of the ankle.",
    ["Ankle sprain (most common ankle injury, usually the outer ligaments)", "Fracture (if the injury was severe)"],
  ),
  ...bilateralRegion(
    "achilles_tendon",
    "Achilles Tendon",
    [-0.171, 0.073, -0.038],
    "tendon",
    "The thick tendon running from the calf muscle to the heel, just above and behind the ankle bone.",
    ["Achilles tendinitis", "Insertional Achilles tendinopathy", "Achilles tendon tear or rupture (if sudden and severe)"],
    [
      "A sudden \"pop\" with inability to push off or walk on tiptoe can indicate a ruptured Achilles tendon — seek prompt medical care.",
    ],
  ),
  ...bilateralRegion(
    "heel_plantar",
    "Heel (Bottom)",
    [-0.170, 0.040, -0.044],
    "ligament",
    "The underside of the heel.",
    ["Plantar fasciitis", "Heel spur", "Fat pad atrophy"],
  ),
  ...bilateralRegion(
    "arch_of_foot",
    "Arch of Foot",
    [-0.180, 0.020, 0.070],
    "ligament",
    "The underside of the foot, along the arch.",
    ["Plantar fasciitis", "Flat feet (fallen arches)", "Posterior tibial tendon dysfunction"],
  ),
  ...bilateralRegion(
    "big_toe_joint",
    "Big Toe Joint",
    [-0.184, 0.013, 0.195],
    "joint",
    "The joint at the base of the big toe.",
    ["Bunion (hallux valgus)", "Gout", "Turf toe", "Osteoarthritis"],
  ),
];

export const REGIONS: RegionDef[] = [...central, ...paired];

export const REGIONS_BY_ID: Record<string, RegionDef> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
);
