// Educational content for every region in the body map.
//
// Keys are the region "base" ids produced by scripts/build_regions.py. Paired
// regions (ids ending in _L / _R) share one entry here; `left` / `right` can
// override fields where the two sides genuinely differ (e.g. organs under the
// right vs left upper abdomen), and `male` / `female` where the two bodies do
// (e.g. ovarian vs testicular causes). Order: shared, side, body, body+side.
//
// Content is intentionally educational/non-diagnostic: plain-language
// descriptions plus conditions *commonly associated* with pain in the area.

export type RegionCategory =
  | "bone"
  | "joint"
  | "tendon"
  | "ligament"
  | "muscle"
  | "nerve"
  | "organ"
  | "region";

export type BodyGroup =
  | "Head & face"
  | "Neck"
  | "Shoulder & arm"
  | "Wrist & hand"
  | "Chest & abdomen"
  | "Back"
  | "Hip & pelvis"
  | "Thigh & knee"
  | "Lower leg, ankle & foot";

export type RegionFields = Pick<RegionContent, "name" | "category" | "group" | "description" | "possibleCauses" | "redFlags">;
type SideOverrides = { left?: Partial<RegionFields>; right?: Partial<RegionFields> };

export interface RegionContent {
  name: string;
  category: RegionCategory;
  group: BodyGroup;
  description: string;
  possibleCauses: string[];
  redFlags?: string[];
  left?: Partial<RegionFields>;
  right?: Partial<RegionFields>;
  /** Body-specific overrides (applied after left/right), which can themselves differ by side. */
  male?: Partial<RegionFields> & SideOverrides;
  female?: Partial<RegionFields> & SideOverrides;
}

const HEART_ATTACK =
  "Pain here together with chest pressure, shortness of breath, sweating, or nausea can be a sign of a heart attack. Call emergency services.";

export const REGION_CONTENT: Record<string, RegionContent> = {
  // ------------------------------------------------------------ Head & face
  top_of_head: {
    name: "Top of Head",
    category: "region",
    group: "Head & face",
    description: "The crown of the head, over the top of the skull and scalp.",
    possibleCauses: ["Tension-type headache", "Migraine", "Scalp tenderness or irritation", "Sinus headache"],
    redFlags: ["A sudden, severe \"worst headache of your life\" needs emergency care."],
  },
  forehead: {
    name: "Forehead",
    category: "region",
    group: "Head & face",
    description: "The front of the head above the eyebrows, over the frontal sinuses.",
    possibleCauses: ["Tension-type headache", "Frontal sinusitis", "Migraine", "Eye strain"],
    redFlags: ["Headache with fever, stiff neck, confusion, or a rash needs urgent medical care."],
  },
  temple: {
    name: "Temple",
    category: "muscle",
    group: "Head & face",
    description: "The flat area at the side of the forehead, between the eye and the ear, over the temporalis muscle.",
    possibleCauses: ["Tension-type headache", "Migraine", "Jaw clenching or teeth grinding", "Temporal arteritis (usually over 50)"],
    redFlags: ["New temple pain over age 50 with scalp tenderness, jaw pain when chewing, or vision changes needs same-day care."],
  },
  side_of_head: {
    name: "Side of Head",
    category: "region",
    group: "Head & face",
    description: "The side of the skull above and around the ear.",
    possibleCauses: ["Tension-type headache", "Migraine", "Jaw (TMJ) problems", "Occipital neuralgia"],
  },
  back_of_head: {
    name: "Back of Head",
    category: "region",
    group: "Head & face",
    description: "The back of the skull above the base of the neck.",
    possibleCauses: ["Tension-type headache", "Cervicogenic headache (from the neck)", "Occipital neuralgia", "Poor posture"],
    redFlags: ["A sudden, severe headache, or one after a head injury, needs emergency care."],
  },
  base_of_skull: {
    name: "Base of Skull",
    category: "nerve",
    group: "Head & face",
    description: "Where the skull meets the neck, home to the suboccipital muscles and occipital nerves.",
    possibleCauses: ["Suboccipital muscle tension", "Occipital neuralgia", "Cervicogenic headache", "Whiplash"],
    redFlags: ["Headache with a stiff neck and fever needs urgent medical care."],
  },
  eye: {
    name: "Eye Area",
    category: "region",
    group: "Head & face",
    description: "The eye and the bony socket around it.",
    possibleCauses: ["Eye strain", "Dry eye", "Sinus pressure", "Cluster headache", "Conjunctivitis"],
    redFlags: ["Eye pain with sudden vision loss, a very red eye, or halos around lights needs emergency care."],
  },
  ear: {
    name: "Ear",
    category: "region",
    group: "Head & face",
    description: "The outer ear and ear canal, near the jaw joint.",
    possibleCauses: ["Ear infection", "Swimmer's ear", "Referred pain from the jaw (TMJ)", "Earwax buildup"],
  },
  jaw_tmj: {
    name: "Jaw Joint (TMJ)",
    category: "joint",
    group: "Head & face",
    description: "The temporomandibular joint, just in front of the ear, where the jaw hinges on the skull.",
    possibleCauses: ["TMJ disorder", "Teeth grinding or clenching (bruxism)", "Jaw muscle strain", "Arthritis of the jaw joint"],
  },
  cheek_sinus: {
    name: "Cheek / Sinus",
    category: "region",
    group: "Head & face",
    description: "The cheek area under the eye, over the maxillary sinus and upper teeth.",
    possibleCauses: ["Sinusitis", "Dental problem in the upper teeth", "Trigeminal neuralgia", "Allergies"],
  },
  nose: {
    name: "Nose",
    category: "region",
    group: "Head & face",
    description: "The nose and the nasal passages behind it.",
    possibleCauses: ["Sinus congestion", "Nasal injury", "Skin irritation", "Nasal vestibulitis"],
  },
  mouth: {
    name: "Mouth & Lips",
    category: "region",
    group: "Head & face",
    description: "The lips, gums, and teeth of the front of the mouth.",
    possibleCauses: ["Dental problem", "Mouth ulcer (canker sore)", "Cold sore", "Gum inflammation"],
  },
  chin: {
    name: "Chin",
    category: "bone",
    group: "Head & face",
    description: "The front of the lower jaw bone (mandible).",
    possibleCauses: ["Dental problem in the lower front teeth", "Jaw injury", "Teeth grinding"],
  },
  jaw: {
    name: "Jaw",
    category: "bone",
    group: "Head & face",
    description: "The lower jaw (mandible) along the side of the face and the masseter chewing muscle.",
    possibleCauses: ["Jaw muscle tension from clenching", "Dental problem in the lower teeth", "TMJ disorder", "Swollen lymph nodes"],
    redFlags: [HEART_ATTACK],
  },

  // ------------------------------------------------------------ Neck
  throat: {
    name: "Front of Neck / Throat",
    category: "region",
    group: "Neck",
    description: "The front of the neck, over the windpipe, voice box, and thyroid.",
    possibleCauses: ["Sore throat (pharyngitis)", "Swollen lymph nodes", "Thyroid inflammation", "Muscle strain"],
    redFlags: ["Throat pain with trouble breathing, drooling, or inability to swallow needs emergency care."],
  },
  side_of_neck: {
    name: "Side of Neck",
    category: "muscle",
    group: "Neck",
    description: "The side of the neck, over the sternocleidomastoid and scalene muscles.",
    possibleCauses: ["Muscle strain or spasm", "Sleeping in an awkward position", "Swollen lymph nodes", "Pinched nerve"],
  },
  back_of_neck: {
    name: "Back of Neck",
    category: "muscle",
    group: "Neck",
    description: "The muscles beside the spine at the back of the neck.",
    possibleCauses: ["Muscle tension or strain", "Poor posture (\"tech neck\")", "Whiplash", "Cervical facet joint irritation"],
  },
  cervical_spine: {
    name: "Neck Spine (Cervical)",
    category: "bone",
    group: "Neck",
    description: "The center of the back of the neck, over the cervical vertebrae.",
    possibleCauses: ["Cervical strain", "Disc degeneration", "Pinched nerve (cervical radiculopathy)", "Arthritis"],
    redFlags: ["Neck pain with fever and a stiff neck, or with weakness or numbness in the arms, needs urgent care."],
  },
  upper_trap: {
    name: "Upper Trapezius",
    category: "muscle",
    group: "Neck",
    description: "The muscle running from the neck to the top of the shoulder, a very common spot for knots.",
    possibleCauses: ["Muscle tension and trigger points", "Stress", "Poor desk posture", "Carrying heavy bags on one shoulder"],
  },

  // ------------------------------------------------------------ Shoulder & arm
  ac_joint: {
    name: "AC Joint (Top of Shoulder)",
    category: "joint",
    group: "Shoulder & arm",
    description: "The acromioclavicular joint, where the collarbone meets the top of the shoulder blade.",
    possibleCauses: ["AC joint sprain (separated shoulder)", "AC joint arthritis", "Overuse from lifting or pressing"],
  },
  front_shoulder: {
    name: "Front of Shoulder",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The front of the shoulder joint, where the biceps tendon and front of the rotator cuff sit.",
    possibleCauses: ["Biceps tendinitis", "Rotator cuff (subscapularis) strain", "Shoulder impingement", "Anterior instability"],
  },
  outer_shoulder: {
    name: "Outer Shoulder",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The rounded outer shoulder over the deltoid muscle and the rotator cuff tendons beneath it.",
    possibleCauses: ["Rotator cuff tendinitis or tear", "Subacromial bursitis", "Shoulder impingement", "Frozen shoulder"],
  },
  back_shoulder: {
    name: "Back of Shoulder",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The back of the shoulder joint, over the rear deltoid and the infraspinatus/teres minor.",
    possibleCauses: ["Rotator cuff strain", "Posterior deltoid strain", "Shoulder impingement", "Referred pain from the neck"],
  },
  armpit: {
    name: "Armpit",
    category: "region",
    group: "Shoulder & arm",
    description: "The hollow under the shoulder (axilla), where lymph nodes, nerves, and blood vessels pass into the arm.",
    possibleCauses: ["Muscle strain (pectoral or latissimus)", "Swollen lymph nodes", "Ingrown hair or skin irritation", "Hidradenitis suppurativa"],
    redFlags: ["A hard, painless, or growing lump in the armpit should be checked by a doctor."],
    female: {
      possibleCauses: ["Muscle strain (pectoral or latissimus)", "Swollen lymph nodes", "Breast tissue extending into the armpit (cyclical pain)", "Ingrown hair or skin irritation"],
    },
  },
  biceps: {
    name: "Biceps",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The muscle on the front of the upper arm that bends the elbow.",
    possibleCauses: ["Muscle strain", "Delayed-onset muscle soreness", "Biceps tendinitis"],
  },
  triceps: {
    name: "Triceps",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The muscle on the back of the upper arm that straightens the elbow.",
    possibleCauses: ["Muscle strain", "Overuse from pushing exercises", "Triceps tendinitis"],
  },
  outer_upper_arm: {
    name: "Outer Upper Arm",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The outer side of the upper arm, where the deltoid attaches to the humerus.",
    possibleCauses: ["Referred pain from the rotator cuff", "Deltoid strain", "Pinched nerve in the neck (C5)"],
  },
  inner_upper_arm: {
    name: "Inner Upper Arm",
    category: "nerve",
    group: "Shoulder & arm",
    description: "The inner side of the upper arm, where major nerves and blood vessels run toward the elbow.",
    possibleCauses: ["Muscle strain", "Nerve irritation", "Swollen lymph nodes near the armpit"],
    left: { redFlags: [HEART_ATTACK] },
  },
  elbow_crease: {
    name: "Front of Elbow",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The crease at the front of the elbow, where the biceps tendon attaches.",
    possibleCauses: ["Distal biceps tendinitis", "Biceps tendon tear", "Strain from lifting"],
  },
  lateral_elbow: {
    name: "Outer Elbow",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The bony bump on the outside of the elbow (lateral epicondyle) where the wrist extensor tendons attach.",
    possibleCauses: ["Tennis elbow (lateral epicondylitis)", "Radial tunnel syndrome", "Overuse from gripping or typing"],
  },
  medial_elbow: {
    name: "Inner Elbow",
    category: "nerve",
    group: "Shoulder & arm",
    description: "The inside of the elbow (medial epicondyle), where the wrist flexors attach and the ulnar nerve (the \"funny bone\") passes.",
    possibleCauses: ["Golfer's elbow (medial epicondylitis)", "Ulnar nerve irritation (cubital tunnel)", "UCL sprain in throwers"],
  },
  elbow_tip: {
    name: "Tip of Elbow",
    category: "bone",
    group: "Shoulder & arm",
    description: "The pointy back of the elbow (olecranon), covered by a small fluid sac (bursa).",
    possibleCauses: ["Olecranon bursitis", "Triceps tendinitis", "Direct injury or fall"],
    redFlags: ["A hot, red, swollen elbow, especially with fever, can be an infection and needs prompt care."],
  },
  upper_forearm_back: {
    name: "Upper Forearm (Back)",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The back of the forearm just below the elbow, over the wrist and finger extensor muscles.",
    possibleCauses: ["Tennis elbow", "Forearm muscle strain", "Radial tunnel syndrome", "Repetitive strain"],
  },
  upper_forearm_palm: {
    name: "Upper Forearm (Palm Side)",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The palm side of the forearm just below the elbow, over the wrist and finger flexor muscles.",
    possibleCauses: ["Golfer's elbow", "Forearm muscle strain", "Overuse from gripping"],
  },
  lower_forearm_back: {
    name: "Lower Forearm (Back)",
    category: "muscle",
    group: "Shoulder & arm",
    description: "The back of the forearm closer to the wrist, where extensor tendons begin.",
    possibleCauses: ["Repetitive strain", "Intersection syndrome", "Tendinitis"],
  },
  lower_forearm_palm: {
    name: "Lower Forearm (Palm Side)",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The palm side of the forearm near the wrist, where the flexor tendons and median nerve run.",
    possibleCauses: ["Flexor tendinitis", "Carpal tunnel syndrome (referred)", "Repetitive strain"],
  },
  forearm_thumb_side: {
    name: "Forearm (Thumb Side)",
    category: "tendon",
    group: "Shoulder & arm",
    description: "The thumb side of the lower forearm, over the radius bone and thumb tendons.",
    possibleCauses: ["De Quervain's tenosynovitis", "Intersection syndrome", "Wrist fracture (after a fall)"],
  },

  // ------------------------------------------------------------ Wrist & hand
  wrist_palm_side: {
    name: "Wrist (Palm Side)",
    category: "nerve",
    group: "Wrist & hand",
    description: "The palm side of the wrist, over the carpal tunnel where the median nerve runs.",
    possibleCauses: ["Carpal tunnel syndrome", "Flexor tendinitis", "Ganglion cyst", "Wrist sprain"],
  },
  wrist_back: {
    name: "Back of Wrist",
    category: "ligament",
    group: "Wrist & hand",
    description: "The back of the wrist, over the small carpal bones and their ligaments.",
    possibleCauses: ["Wrist sprain", "Dorsal ganglion cyst", "Extensor tendinitis", "Scapholunate ligament injury"],
  },
  wrist_thumb_side: {
    name: "Wrist (Thumb Side)",
    category: "tendon",
    group: "Wrist & hand",
    description: "The thumb side of the wrist, including the \"anatomical snuffbox\" over the scaphoid bone.",
    possibleCauses: ["De Quervain's tenosynovitis", "Scaphoid fracture (after a fall)", "Thumb-base arthritis"],
    redFlags: ["Pain in this spot after a fall on an outstretched hand should be X-rayed, as scaphoid fractures are easy to miss."],
  },
  wrist_pinky_side: {
    name: "Wrist (Pinky Side)",
    category: "ligament",
    group: "Wrist & hand",
    description: "The pinky side of the wrist, over the ulna and the TFCC cartilage.",
    possibleCauses: ["TFCC injury", "Ulnar-sided tendinitis (ECU)", "Wrist sprain", "Ulnar impaction"],
  },
  palm: {
    name: "Palm",
    category: "region",
    group: "Wrist & hand",
    description: "The palm of the hand, over the flexor tendons and palmar fascia.",
    possibleCauses: ["Trigger finger (at the base of a finger)", "Dupuytren's contracture", "Carpal tunnel syndrome", "Bruising"],
  },
  back_of_hand: {
    name: "Back of Hand",
    category: "bone",
    group: "Wrist & hand",
    description: "The back of the hand, over the metacarpal bones and extensor tendons.",
    possibleCauses: ["Metacarpal fracture (e.g. after punching)", "Extensor tendinitis", "Arthritis", "Ganglion cyst"],
  },
  thumb_base: {
    name: "Base of Thumb",
    category: "joint",
    group: "Wrist & hand",
    description: "The fleshy base of the thumb and the CMC joint where it meets the wrist.",
    possibleCauses: ["Thumb-base (CMC) arthritis", "De Quervain's tenosynovitis", "Skier's thumb (UCL sprain)"],
  },
  thumb: {
    name: "Thumb",
    category: "joint",
    group: "Wrist & hand",
    description: "The thumb and its two joints.",
    possibleCauses: ["Sprain", "Trigger thumb", "Arthritis", "Jammed or fractured thumb"],
  },
  index_finger: {
    name: "Index Finger",
    category: "joint",
    group: "Wrist & hand",
    description: "The index finger and its joints and tendons.",
    possibleCauses: ["Jammed finger or sprain", "Trigger finger", "Osteoarthritis", "Tendon injury"],
  },
  middle_finger: {
    name: "Middle Finger",
    category: "joint",
    group: "Wrist & hand",
    description: "The middle finger and its joints and tendons.",
    possibleCauses: ["Jammed finger or sprain", "Trigger finger", "Osteoarthritis", "Tendon injury"],
  },
  ring_finger: {
    name: "Ring Finger",
    category: "joint",
    group: "Wrist & hand",
    description: "The ring finger and its joints and tendons.",
    possibleCauses: ["Jammed finger or sprain", "Trigger finger", "Dupuytren's contracture", "Jersey finger (tendon injury)"],
  },
  pinky_finger: {
    name: "Pinky Finger",
    category: "joint",
    group: "Wrist & hand",
    description: "The little finger and its joints and tendons.",
    possibleCauses: ["Jammed finger or sprain", "Boxer's fracture (at the knuckle)", "Ulnar nerve irritation (tingling)", "Dupuytren's contracture"],
  },

  // ------------------------------------------------------------ Chest & abdomen
  sternoclavicular: {
    name: "Sternoclavicular Joint",
    category: "joint",
    group: "Chest & abdomen",
    description: "The joint where the inner end of the collarbone meets the breastbone.",
    possibleCauses: ["SC joint sprain", "Arthritis", "Costochondritis"],
  },
  collarbone: {
    name: "Collarbone",
    category: "bone",
    group: "Chest & abdomen",
    description: "The clavicle, the long bone running across the top of the chest to the shoulder.",
    possibleCauses: ["Clavicle fracture (after a fall)", "Bruising", "Muscle strain"],
  },
  sternum: {
    name: "Breastbone (Sternum)",
    category: "bone",
    group: "Chest & abdomen",
    description: "The center of the chest, over the breastbone and the rib cartilage beside it.",
    possibleCauses: ["Costochondritis", "Acid reflux (GERD)", "Chest wall strain", "Anxiety"],
    redFlags: [
      "Sudden chest pain or pressure, especially with shortness of breath, pain spreading to the arm or jaw, sweating, or nausea, can be a heart attack. Call emergency services immediately.",
    ],
  },
  chest: {
    name: "Chest (Pectoral)",
    category: "muscle",
    group: "Chest & abdomen",
    description: "The upper chest, over the pectoral muscles and ribs.",
    possibleCauses: ["Pectoral muscle strain", "Costochondritis", "Rib injury", "Shingles (burning, then a rash)"],
    redFlags: [HEART_ATTACK],
    right: { redFlags: ["Sharp chest pain that is worse with breathing and comes with shortness of breath needs urgent care."] },
  },
  breast: {
    name: "Breast",
    category: "region",
    group: "Chest & abdomen",
    description: "The breast tissue on the front of the chest, over the pectoral muscle.",
    possibleCauses: [
      "Cyclical breast pain (linked to the menstrual cycle)",
      "Breast cyst",
      "Mastitis (often while breastfeeding)",
      "Chest wall or pectoral muscle strain",
      "Costochondritis (felt under the breast)",
    ],
    redFlags: [
      "A new lump, skin dimpling or puckering, nipple changes, or bloody nipple discharge should be checked by a doctor.",
      "A red, hot, painful breast with fever needs prompt care.",
    ],
    left: {
      redFlags: [
        "A new lump, skin dimpling or puckering, nipple changes, or bloody nipple discharge should be checked by a doctor.",
        "A red, hot, painful breast with fever needs prompt care.",
        HEART_ATTACK,
      ],
    },
  },
  lower_ribs_front: {
    name: "Lower Ribs (Front)",
    category: "bone",
    group: "Chest & abdomen",
    description: "The lower edge of the rib cage at the front.",
    possibleCauses: ["Rib bruise or fracture", "Slipping rib syndrome", "Costochondritis"],
  },
  side_ribs: {
    name: "Side of Ribs",
    category: "bone",
    group: "Chest & abdomen",
    description: "The side of the rib cage below the armpit, over the ribs and intercostal muscles.",
    possibleCauses: ["Intercostal muscle strain", "Rib bruise or fracture", "Shingles", "Pleurisy (pain worse when breathing)"],
    redFlags: ["Rib pain with shortness of breath or coughing up blood needs urgent care."],
  },
  epigastric: {
    name: "Upper Abdomen (Center)",
    category: "organ",
    group: "Chest & abdomen",
    description: "The upper-center of the abdomen just below the breastbone, over the stomach.",
    possibleCauses: ["Indigestion or acid reflux", "Gastritis", "Peptic ulcer", "Gallbladder or pancreas problems"],
    redFlags: [
      "Severe, persistent pain here, especially with vomiting, fever, or pain through to the back, needs prompt care. It can also be a sign of a heart attack.",
    ],
  },
  upper_abdomen: {
    name: "Upper Abdomen",
    category: "organ",
    group: "Chest & abdomen",
    description: "The upper side of the abdomen, just under the rib cage.",
    possibleCauses: ["Muscle strain", "Trapped gas"],
    right: {
      name: "Upper Right Abdomen",
      description: "The upper right abdomen under the ribs, over the liver and gallbladder.",
      possibleCauses: ["Gallstones or gallbladder inflammation", "Liver inflammation", "Muscle strain", "Trapped gas"],
      redFlags: ["Pain here with fever, yellowing of the skin or eyes, or pain lasting more than a few hours needs prompt care."],
    },
    left: {
      name: "Upper Left Abdomen",
      description: "The upper left abdomen under the ribs, over the stomach and spleen.",
      possibleCauses: ["Indigestion or gastritis", "Trapped gas", "Muscle strain", "Spleen problems (rare)"],
      redFlags: ["Pain here after an injury, especially with lightheadedness, can mean a spleen injury. Seek emergency care."],
    },
  },
  navel: {
    name: "Around the Belly Button",
    category: "region",
    group: "Chest & abdomen",
    description: "The area around the navel (umbilical region), over the small intestine.",
    possibleCauses: ["Indigestion or gas", "Umbilical hernia", "Early appendicitis (pain often moves to the lower right)", "Gastroenteritis"],
  },
  lower_abdomen: {
    name: "Lower Abdomen",
    category: "organ",
    group: "Chest & abdomen",
    description: "The lower side of the abdomen, above the groin.",
    possibleCauses: ["Gas or constipation", "Muscle strain"],
    right: {
      name: "Lower Right Abdomen",
      description: "The lower right abdomen, over the appendix and part of the large intestine.",
      possibleCauses: ["Appendicitis", "Gas or constipation", "Kidney stone", "Inguinal hernia"],
      redFlags: ["Worsening pain here, especially with fever, vomiting, or pain when walking or coughing, can be appendicitis. Seek prompt care."],
    },
    left: {
      name: "Lower Left Abdomen",
      description: "The lower left abdomen, over the descending and sigmoid colon.",
      possibleCauses: ["Constipation or gas", "Diverticulitis", "Kidney stone", "Inguinal hernia"],
      redFlags: ["Severe pain here with fever or blood in the stool needs prompt care."],
    },
    female: {
      right: {
        description: "The lower right abdomen, over the appendix, part of the large intestine, and the right ovary.",
        possibleCauses: ["Appendicitis", "Ovarian cyst", "Ovulation pain", "Gas or constipation", "Kidney stone"],
        redFlags: [
          "Worsening pain here, especially with fever, vomiting, or pain when walking or coughing, can be appendicitis. Seek prompt care.",
          "Sudden severe one-sided pain, especially with a possible pregnancy or vaginal bleeding, can be an ectopic pregnancy or ovarian torsion. Seek emergency care.",
        ],
      },
      left: {
        description: "The lower left abdomen, over the descending colon and the left ovary.",
        possibleCauses: ["Constipation or gas", "Ovarian cyst", "Ovulation pain", "Diverticulitis", "Kidney stone"],
        redFlags: [
          "Severe pain here with fever or blood in the stool needs prompt care.",
          "Sudden severe one-sided pain, especially with a possible pregnancy or vaginal bleeding, can be an ectopic pregnancy or ovarian torsion. Seek emergency care.",
        ],
      },
    },
  },
  lower_abdomen_center: {
    name: "Lower Abdomen (Center)",
    category: "organ",
    group: "Chest & abdomen",
    description: "The lower-center abdomen above the pubic bone, over the bladder.",
    possibleCauses: ["Bladder infection (UTI)", "Constipation", "Bladder irritation"],
    redFlags: ["Inability to urinate with lower abdominal pain needs urgent care."],
    female: {
      description: "The lower-center abdomen above the pubic bone, over the bladder and uterus.",
      possibleCauses: ["Menstrual cramps", "Bladder infection (UTI)", "Endometriosis", "Pelvic inflammatory disease", "Uterine fibroids"],
      redFlags: [
        "Pelvic pain with a possible pregnancy, heavy bleeding, or fever needs prompt care.",
        "Inability to urinate with lower abdominal pain needs urgent care.",
      ],
    },
    male: {
      description: "The lower-center abdomen above the pubic bone, over the bladder and prostate.",
      possibleCauses: ["Bladder infection (UTI)", "Prostatitis", "Constipation", "Bladder stones"],
    },
  },
  pubic: {
    name: "Pubic Area",
    category: "bone",
    group: "Hip & pelvis",
    description: "The front of the pelvis at the pubic bone and symphysis joint.",
    possibleCauses: ["Osteitis pubis", "Adductor strain", "Bladder problems"],
    female: {
      possibleCauses: ["Pregnancy-related pelvic girdle pain", "Osteitis pubis", "Adductor strain", "Bladder problems"],
    },
  },
  groin: {
    name: "Groin",
    category: "region",
    group: "Hip & pelvis",
    description: "The crease between the lower abdomen and the thigh, where the inguinal canal runs.",
    possibleCauses: ["Inguinal hernia", "Groin (adductor) strain", "Hip joint problems", "Swollen lymph nodes"],
    redFlags: ["A painful bulge that can't be pushed back in needs emergency care."],
    male: {
      possibleCauses: ["Inguinal hernia", "Groin (adductor) strain", "Pain spreading from the testicle", "Hip joint problems", "Swollen lymph nodes"],
      redFlags: ["A painful bulge that can't be pushed back in, or sudden severe testicular pain (possible torsion), needs emergency care."],
    },
    female: {
      possibleCauses: ["Groin (adductor) strain", "Round ligament pain (pregnancy)", "Inguinal or femoral hernia", "Hip joint problems", "Swollen lymph nodes"],
    },
  },
  flank: {
    name: "Flank",
    category: "region",
    group: "Chest & abdomen",
    description: "The side of the body between the bottom of the ribs and the top of the hip.",
    possibleCauses: ["Muscle strain", "Kidney stone (pain that comes in waves)", "Kidney infection", "Shingles"],
    redFlags: ["Flank pain with fever, chills, or blood in the urine needs prompt care."],
  },

  // ------------------------------------------------------------ Back
  thoracic_spine: {
    name: "Upper Spine (Thoracic)",
    category: "bone",
    group: "Back",
    description: "The center of the upper back, over the thoracic vertebrae between the shoulder blades.",
    possibleCauses: ["Postural strain", "Thoracic facet irritation", "Rib joint dysfunction", "Compression fracture (with osteoporosis)"],
    redFlags: ["Sudden tearing pain between the shoulder blades needs emergency care."],
  },
  rhomboid: {
    name: "Between Shoulder Blades",
    category: "muscle",
    group: "Back",
    description: "The rhomboid and middle trapezius muscles between the spine and the shoulder blade.",
    possibleCauses: ["Rhomboid strain", "Trigger points from desk posture", "Referred pain from the neck", "Rib joint irritation"],
  },
  shoulder_blade: {
    name: "Shoulder Blade",
    category: "bone",
    group: "Back",
    description: "The scapula and the rotator cuff muscles that cover it.",
    possibleCauses: ["Muscle strain", "Rotator cuff trigger points", "Referred pain from the neck", "Snapping scapula"],
    right: { possibleCauses: ["Muscle strain", "Rotator cuff trigger points", "Referred pain from the neck", "Referred gallbladder pain"] },
  },
  mid_spine: {
    name: "Mid Spine",
    category: "bone",
    group: "Back",
    description: "The center of the back at the lower thoracic spine, where the ribs end.",
    possibleCauses: ["Postural strain", "Facet joint irritation", "Compression fracture (with osteoporosis)"],
  },
  mid_back: {
    name: "Mid Back",
    category: "muscle",
    group: "Back",
    description: "The muscles of the middle back beside the spine, over the lower ribs.",
    possibleCauses: ["Muscle strain", "Rib joint dysfunction", "Poor posture", "Shingles"],
  },
  kidney_area: {
    name: "Kidney Area",
    category: "organ",
    group: "Back",
    description: "The back just below the ribs, beside the spine (costovertebral angle), where the kidney sits.",
    possibleCauses: ["Muscle strain", "Kidney stone", "Kidney infection (pyelonephritis)"],
    redFlags: ["Pain here with fever, chills, painful urination, or blood in the urine needs prompt care."],
  },
  lumbar_spine: {
    name: "Lower Spine (Lumbar)",
    category: "bone",
    group: "Back",
    description: "The center of the lower back, over the lumbar vertebrae and discs.",
    possibleCauses: ["Lumbar strain", "Herniated disc", "Degenerative disc disease", "Spinal stenosis"],
    redFlags: ["Back pain with numbness in the groin or inner thighs, or new bladder or bowel problems, needs emergency care."],
  },
  lower_back: {
    name: "Lower Back",
    category: "muscle",
    group: "Back",
    description: "The muscles beside the lower spine (erector spinae and quadratus lumborum).",
    possibleCauses: ["Muscle strain or spasm", "Facet joint irritation", "Poor lifting technique", "Sciatica"],
    female: {
      possibleCauses: ["Muscle strain or spasm", "Facet joint irritation", "Menstrual cramps or endometriosis (felt in the back)", "Pregnancy", "Sciatica"],
    },
  },
  sacrum: {
    name: "Sacrum",
    category: "bone",
    group: "Back",
    description: "The flat, triangular bone at the base of the spine between the hips.",
    possibleCauses: ["Sacroiliac joint dysfunction", "Lumbosacral strain", "Sacral stress fracture"],
  },
  si_joint: {
    name: "SI Joint",
    category: "joint",
    group: "Back",
    description: "The sacroiliac joint, where the sacrum meets the pelvis, under the dimple of the lower back.",
    possibleCauses: ["Sacroiliac joint dysfunction", "Sacroiliitis", "Ankylosing spondylitis"],
    female: {
      possibleCauses: ["Sacroiliac joint dysfunction", "Pregnancy-related pelvic pain", "Sacroiliitis", "Ankylosing spondylitis"],
    },
  },
  tailbone: {
    name: "Tailbone (Coccyx)",
    category: "bone",
    group: "Back",
    description: "The small bone at the very bottom of the spine.",
    possibleCauses: ["Coccydynia (tailbone pain)", "Bruise or fracture from a fall", "Prolonged sitting", "Pilonidal cyst"],
  },

  // ------------------------------------------------------------ Hip & pelvis
  hip_crest: {
    name: "Hip Bone (Iliac Crest)",
    category: "bone",
    group: "Hip & pelvis",
    description: "The top ridge of the pelvis that you can feel at your belt line.",
    possibleCauses: ["Hip pointer (bruise)", "Muscle strain at the attachment", "Referred pain from the lower back"],
  },
  outer_hip: {
    name: "Outer Hip",
    category: "bone",
    group: "Hip & pelvis",
    description: "The bony point on the outside of the hip (greater trochanter) and the bursa over it.",
    possibleCauses: ["Trochanteric bursitis", "Gluteal tendinopathy", "IT band syndrome", "Hip arthritis"],
  },
  upper_outer_buttock: {
    name: "Upper Outer Buttock",
    category: "muscle",
    group: "Hip & pelvis",
    description: "The upper outer part of the buttock, over the gluteus medius and minimus.",
    possibleCauses: ["Gluteus medius strain", "Gluteal tendinopathy", "Referred pain from the lower back"],
  },
  piriformis: {
    name: "Deep Buttock (Piriformis)",
    category: "nerve",
    group: "Hip & pelvis",
    description: "The middle of the buttock, where the piriformis muscle crosses the sciatic nerve.",
    possibleCauses: ["Piriformis syndrome", "Sciatica", "Deep gluteal muscle strain"],
  },
  buttock: {
    name: "Buttock",
    category: "muscle",
    group: "Hip & pelvis",
    description: "The lower buttock over the gluteus maximus, near the sit bone.",
    possibleCauses: ["Gluteal strain", "High hamstring tendinopathy", "Sciatica", "Ischial bursitis (from sitting)"],
  },
  hip_flexor: {
    name: "Front of Hip",
    category: "joint",
    group: "Hip & pelvis",
    description: "The front of the hip joint, where the hip flexor (iliopsoas) crosses.",
    possibleCauses: ["Hip flexor strain", "Hip labral tear", "Hip arthritis", "Iliopsoas bursitis"],
    redFlags: ["Hip pain after a fall with inability to bear weight, especially in older adults, needs emergency care."],
  },
  inner_groin: {
    name: "Inner Groin / Upper Inner Thigh",
    category: "muscle",
    group: "Hip & pelvis",
    description: "Where the adductor (inner thigh) muscles attach near the pubic bone.",
    possibleCauses: ["Adductor (groin) strain", "Sports hernia", "Hip joint problems"],
  },

  // ------------------------------------------------------------ Thigh & knee
  front_thigh: {
    name: "Front of Thigh",
    category: "muscle",
    group: "Thigh & knee",
    description: "The quadriceps muscles on the front of the thigh.",
    possibleCauses: ["Quadriceps strain", "Thigh bruise (\"charley horse\")", "Delayed-onset muscle soreness", "Meralgia paresthetica (burning/numbness)"],
  },
  outer_thigh: {
    name: "Outer Thigh",
    category: "tendon",
    group: "Thigh & knee",
    description: "The outer thigh, along the iliotibial (IT) band.",
    possibleCauses: ["IT band syndrome", "Meralgia paresthetica", "Referred pain from the outer hip"],
  },
  inner_thigh: {
    name: "Inner Thigh",
    category: "muscle",
    group: "Thigh & knee",
    description: "The adductor muscles along the inside of the thigh.",
    possibleCauses: ["Adductor strain", "Muscle soreness"],
    redFlags: ["Thigh swelling, warmth, and redness, especially after travel or surgery, can be a blood clot. Seek prompt care."],
  },
  hamstring: {
    name: "Back of Thigh (Hamstring)",
    category: "muscle",
    group: "Thigh & knee",
    description: "The hamstring muscles on the back of the thigh.",
    possibleCauses: ["Hamstring strain", "Sciatica", "Hamstring tendinopathy"],
  },
  above_kneecap: {
    name: "Above the Kneecap",
    category: "tendon",
    group: "Thigh & knee",
    description: "Just above the kneecap, where the quadriceps tendon attaches.",
    possibleCauses: ["Quadriceps tendinitis", "Suprapatellar bursitis", "Knee swelling"],
  },
  kneecap: {
    name: "Kneecap",
    category: "bone",
    group: "Thigh & knee",
    description: "The kneecap (patella) and the joint behind it.",
    possibleCauses: ["Patellofemoral pain (runner's knee)", "Chondromalacia patellae", "Prepatellar bursitis", "Kneecap dislocation"],
  },
  below_kneecap: {
    name: "Below the Kneecap",
    category: "tendon",
    group: "Thigh & knee",
    description: "The patellar tendon running from the kneecap to the bump on the shin.",
    possibleCauses: ["Patellar tendinitis (jumper's knee)", "Osgood-Schlatter disease (teens)", "Infrapatellar bursitis"],
  },
  inner_knee: {
    name: "Inner Knee",
    category: "ligament",
    group: "Thigh & knee",
    description: "The inside of the knee, over the medial joint line, MCL, and medial meniscus.",
    possibleCauses: ["MCL sprain", "Medial meniscus tear", "Knee osteoarthritis"],
  },
  pes_anserine: {
    name: "Inner Knee (Below Joint)",
    category: "tendon",
    group: "Thigh & knee",
    description: "Just below the inner knee, where three tendons attach (pes anserinus).",
    possibleCauses: ["Pes anserine bursitis", "Hamstring tendinopathy", "Knee osteoarthritis"],
  },
  outer_knee: {
    name: "Outer Knee",
    category: "ligament",
    group: "Thigh & knee",
    description: "The outside of the knee, over the lateral joint line, LCL, and the end of the IT band.",
    possibleCauses: ["IT band syndrome", "LCL sprain", "Lateral meniscus tear"],
  },
  back_of_knee: {
    name: "Back of Knee",
    category: "region",
    group: "Thigh & knee",
    description: "The hollow behind the knee (popliteal fossa).",
    possibleCauses: ["Baker's cyst", "Hamstring or calf tendon strain", "Posterior meniscus tear"],
    redFlags: ["Swelling, warmth, and calf pain, especially after travel or surgery, can be a blood clot (DVT). Seek prompt care."],
  },

  // ------------------------------------------------------------ Lower leg, ankle & foot
  front_shin: {
    name: "Front of Shin",
    category: "muscle",
    group: "Lower leg, ankle & foot",
    description: "The front of the lower leg, over the tibialis anterior muscle.",
    possibleCauses: ["Anterior shin splints", "Muscle strain", "Anterior compartment syndrome"],
    redFlags: ["Severe, tight, worsening shin pain after injury or exercise can be compartment syndrome. Seek emergency care."],
  },
  inner_shin: {
    name: "Inner Shin",
    category: "bone",
    group: "Lower leg, ankle & foot",
    description: "The inner edge of the shin bone (tibia).",
    possibleCauses: ["Shin splints (medial tibial stress syndrome)", "Tibial stress fracture", "Bruising"],
  },
  outer_lower_leg: {
    name: "Outer Lower Leg",
    category: "muscle",
    group: "Lower leg, ankle & foot",
    description: "The outer side of the lower leg, over the fibula and peroneal muscles.",
    possibleCauses: ["Peroneal tendinitis", "Fibula stress fracture", "Muscle strain", "Pinched nerve (L5)"],
  },
  upper_calf: {
    name: "Upper Calf",
    category: "muscle",
    group: "Lower leg, ankle & foot",
    description: "The upper calf, over the gastrocnemius muscle.",
    possibleCauses: ["Calf strain (\"tennis leg\")", "Muscle cramp", "Baker's cyst rupture"],
    redFlags: ["Calf pain with swelling, warmth, or redness, especially after travel or surgery, can be a blood clot (DVT). Seek prompt care."],
  },
  lower_calf: {
    name: "Lower Calf",
    category: "muscle",
    group: "Lower leg, ankle & foot",
    description: "The lower calf, over the soleus muscle where it narrows into the Achilles tendon.",
    possibleCauses: ["Soleus strain", "Muscle cramp", "Achilles tendinopathy"],
    redFlags: ["Calf pain with swelling, warmth, or redness can be a blood clot (DVT). Seek prompt care."],
  },
  achilles: {
    name: "Achilles Tendon",
    category: "tendon",
    group: "Lower leg, ankle & foot",
    description: "The thick tendon at the back of the ankle connecting the calf to the heel.",
    possibleCauses: ["Achilles tendinopathy", "Achilles tendon rupture", "Retrocalcaneal bursitis"],
    redFlags: ["A sudden \"pop\" or feeling of being kicked in the back of the ankle can be a rupture. Get it checked promptly."],
  },
  inner_ankle: {
    name: "Inner Ankle",
    category: "bone",
    group: "Lower leg, ankle & foot",
    description: "The bony bump on the inside of the ankle (medial malleolus) and the tendons behind it.",
    possibleCauses: ["Posterior tibial tendinitis", "Tarsal tunnel syndrome", "Ankle fracture", "Deltoid ligament sprain"],
  },
  outer_ankle: {
    name: "Outer Ankle",
    category: "ligament",
    group: "Lower leg, ankle & foot",
    description: "The bony bump on the outside of the ankle (lateral malleolus) and the ligaments in front of it.",
    possibleCauses: ["Lateral ankle sprain (rolled ankle)", "Peroneal tendinitis", "Ankle fracture"],
    redFlags: ["Inability to take four steps or bone tenderness after an ankle injury suggests a fracture. Get an X-ray."],
  },
  front_of_ankle: {
    name: "Front of Ankle",
    category: "joint",
    group: "Lower leg, ankle & foot",
    description: "The front of the ankle joint, where the shin meets the foot.",
    possibleCauses: ["Anterior ankle impingement", "Extensor tendinitis", "High ankle sprain", "Ankle arthritis"],
  },
  heel: {
    name: "Bottom of Heel",
    category: "ligament",
    group: "Lower leg, ankle & foot",
    description: "The underside of the heel, where the plantar fascia attaches.",
    possibleCauses: ["Plantar fasciitis", "Heel fat pad bruise", "Calcaneal stress fracture", "Heel spur"],
  },
  back_of_heel: {
    name: "Back of Heel",
    category: "tendon",
    group: "Lower leg, ankle & foot",
    description: "The back of the heel bone, where the Achilles tendon inserts.",
    possibleCauses: ["Insertional Achilles tendinopathy", "Haglund's deformity", "Retrocalcaneal bursitis", "Sever's disease (children)"],
  },
  arch: {
    name: "Arch of Foot",
    category: "ligament",
    group: "Lower leg, ankle & foot",
    description: "The arch on the inner underside of the foot.",
    possibleCauses: ["Plantar fasciitis", "Flat feet / fallen arches", "Posterior tibial tendon dysfunction"],
  },
  ball_of_foot: {
    name: "Ball of Foot",
    category: "bone",
    group: "Lower leg, ankle & foot",
    description: "The padded area under the bases of the toes (metatarsal heads).",
    possibleCauses: ["Metatarsalgia", "Morton's neuroma (between 3rd and 4th toes)", "Sesamoiditis", "Stress fracture"],
  },
  top_of_foot: {
    name: "Top of Foot",
    category: "bone",
    group: "Lower leg, ankle & foot",
    description: "The top of the midfoot, over the metatarsal bones and extensor tendons.",
    possibleCauses: ["Extensor tendinitis (often from tight laces)", "Metatarsal stress fracture", "Midfoot (Lisfranc) sprain", "Gout"],
  },
  outer_foot: {
    name: "Outer Edge of Foot",
    category: "bone",
    group: "Lower leg, ankle & foot",
    description: "The outer edge of the foot, along the 5th metatarsal and cuboid bones.",
    possibleCauses: ["5th metatarsal fracture", "Peroneal tendinitis", "Cuboid syndrome"],
  },
  big_toe: {
    name: "Big Toe",
    category: "joint",
    group: "Lower leg, ankle & foot",
    description: "The big toe and its large joint at the ball of the foot.",
    possibleCauses: ["Bunion (hallux valgus)", "Gout", "Turf toe (sprain)", "Hallux rigidus (arthritis)", "Ingrown toenail"],
  },
  small_toes: {
    name: "Smaller Toes",
    category: "joint",
    group: "Lower leg, ankle & foot",
    description: "The four smaller toes.",
    possibleCauses: ["Hammer toe or claw toe", "Stubbed or fractured toe", "Corns", "Morton's neuroma (between toes)"],
  },
};
