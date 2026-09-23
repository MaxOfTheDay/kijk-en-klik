// All hunt content lives here. Screens read from this file and never
// hard-code challenge text, so adding or editing a hunt is a data change.
//
// Hunt
//   id           stable id — stored in saved hunts, don't rename after release
//   title        shown on cards, the board and the recap
//   description  one short line for the hunt picker
//   theme        key for the hunt's mark in icons.js
//   accent       theme colour; the rest of the design system is shared
//   mode         "open": any order (the only mode today). A future "story"
//                mode would unlock challenges one by one.
//   challenges   authored order = pacing, and the order "Try this next" follows
//
// Challenge
//   id         stable within its hunt — saved photos are linked by it
//   title      the prompt, short enough to read aloud to a five-year-old
//   hint       optional nudge for the grown-up reading it out
//   type       "find" (spot something) or "together" (a group moment)
//   category   observation | nature | imagination | creative | group
//   icon       key in icons.js
//   proofType  "photo" — the only proof type for now

export const HUNTS = [
  {
    id: "nature",
    title: "Nature Hunt",
    description: "Slow down and notice the small, wild things.",
    theme: "leaf",
    accent: "#4d6b3c",
    mode: "open",
    challenges: [
      {
        id: "big-leaf",
        title: "Find a fallen leaf bigger than your hand",
        hint: "Put a hand next to it in the photo to prove it.",
        type: "find",
        category: "nature",
        icon: "leaf",
        proofType: "photo",
      },
      {
        id: "tiny-growing",
        title: "Find something tiny that's growing",
        hint: "Look low: cracks in the pavement, old walls, tree roots.",
        type: "find",
        category: "observation",
        icon: "sprout",
        proofType: "photo",
      },
      {
        id: "strange-tree",
        title: "Find the strangest tree",
        hint: "Twisty, lumpy, leaning, hollow — you decide what's strange.",
        type: "find",
        category: "creative",
        icon: "tree",
        proofType: "photo",
      },
      {
        id: "three-leaves",
        title: "Find three different leaves",
        hint: "Fallen leaves are perfect. Line them up side by side.",
        type: "find",
        category: "nature",
        icon: "leaves",
        proofType: "photo",
      },
      {
        id: "animal-home",
        title: "Find a place where an animal might live",
        hint: "A hole, a nest, a thick hedge. Look, but don't disturb.",
        type: "find",
        category: "nature",
        icon: "burrow",
        proofType: "photo",
      },
      {
        id: "bird",
        title: "Spot a bird — or a feather",
        hint: "Listen first. Then look up.",
        type: "find",
        category: "observation",
        icon: "feather",
        proofType: "photo",
      },
      {
        id: "tree-pose",
        title: "Everyone, be a tree",
        hint: "Arms up like branches. Who's the tallest? Who's the windiest?",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "best-view",
        title: "Find the view you want to remember",
        hint: "Stop for a moment. Look all the way around first.",
        type: "find",
        category: "observation",
        icon: "horizon",
        proofType: "photo",
      },
    ],
  },
  {
    id: "funny",
    title: "Funny Finds",
    description: "Odd, silly things hiding in plain sight.",
    theme: "face",
    accent: "#a4492a",
    mode: "open",
    challenges: [
      {
        id: "face",
        title: "Find something that looks like a face",
        hint: "Two windows and a door. Two knots and a crack. Faces are everywhere.",
        type: "find",
        category: "creative",
        icon: "face",
        proofType: "photo",
      },
      {
        id: "wonky",
        title: "Find the wonkiest thing you can",
        hint: "Crooked, bent, leaning. The wonkier the better.",
        type: "find",
        category: "observation",
        icon: "wonky",
        proofType: "photo",
      },
      {
        id: "cloud",
        title: "Find a cloud shaped like something",
        hint: "Everyone says what they see. Nobody is wrong.",
        type: "find",
        category: "imagination",
        icon: "cloud",
        proofType: "photo",
      },
      {
        id: "best-stick",
        title: "Find the best stick",
        hint: "Best is up to you. Bendy? Forked? Sword-shaped?",
        type: "find",
        category: "creative",
        icon: "stick",
        proofType: "photo",
      },
      {
        id: "wrong-place",
        title: "Find something in the wrong place",
        hint: "A lonely glove on a fence. A leaf on a car. Things that got lost.",
        type: "find",
        category: "observation",
        icon: "question",
        proofType: "photo",
      },
      {
        id: "dog-hat",
        title: "Find something that would make a great hat for a dog",
        hint: "Just take a photo — no dogs need to wear it.",
        type: "find",
        category: "imagination",
        icon: "hat",
        proofType: "photo",
      },
      {
        id: "shadows",
        title: "Take a photo of everyone's funniest shadow",
        hint: "Stand with the sun behind you. Make yourselves weird.",
        type: "together",
        category: "group",
        icon: "shadow",
        proofType: "photo",
      },
      {
        id: "silliest",
        title: "Find the silliest thing of the whole walk",
        hint: "Take a vote. Silliness is serious business.",
        type: "find",
        category: "creative",
        icon: "star",
        proofType: "photo",
      },
    ],
  },
  {
    id: "shapes",
    title: "Colors & Shapes",
    description: "Simple finds for sharp young eyes.",
    theme: "shapes",
    accent: "#2f5c9a",
    mode: "open",
    challenges: [
      {
        id: "round",
        title: "Find something round",
        hint: "Wheels, stones, drain covers, buttons.",
        type: "find",
        category: "observation",
        icon: "circle",
        proofType: "photo",
      },
      {
        id: "yellow",
        title: "Find something yellow",
        hint: "Flowers, doors, raincoats, a front gate.",
        type: "find",
        category: "observation",
        icon: "sun",
        proofType: "photo",
      },
      {
        id: "stripes",
        title: "Find some stripes",
        hint: "Lines side by side: fences, bricks, bark, railings.",
        type: "find",
        category: "observation",
        icon: "stripes",
        proofType: "photo",
      },
      {
        id: "triangle",
        title: "Find a triangle",
        hint: "Roofs are a good place to start.",
        type: "find",
        category: "observation",
        icon: "triangle",
        proofType: "photo",
      },
      {
        id: "tiny",
        title: "Find something smaller than your thumb",
        hint: "Put your thumb in the photo next to it.",
        type: "find",
        category: "observation",
        icon: "thumb",
        proofType: "photo",
      },
      {
        id: "heart",
        title: "Find something shaped like a heart",
        hint: "This one's tricky. Leaves, stones and puddles can surprise you.",
        type: "find",
        category: "creative",
        icon: "heart",
        proofType: "photo",
      },
      {
        id: "body-shape",
        title: "Make a shape together",
        hint: "A circle with your arms? A big letter with your bodies?",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "most-colorful",
        title: "Find the most colorful thing on your walk",
        hint: "Count the colors. Can you find one with five?",
        type: "find",
        category: "observation",
        icon: "palette",
        proofType: "photo",
      },
    ],
  },
  {
    id: "magic",
    title: "Magic Hunt",
    description: "The ordinary world, looked at a little differently.",
    theme: "sparkle",
    accent: "#5c4a86",
    mode: "open",
    challenges: [
      {
        id: "wizard-stick",
        title: "Find a wizard's stick",
        hint: "Every wizard needs one. It should feel right in your hand.",
        type: "find",
        category: "imagination",
        icon: "wand",
        proofType: "photo",
      },
      {
        id: "fairy-door",
        title: "Find a fairy door",
        hint: "A little gap at the bottom of a tree. A crack in a wall.",
        type: "find",
        category: "imagination",
        icon: "door",
        proofType: "photo",
      },
      {
        id: "dragon",
        title: "Find a hiding place for a tiny dragon",
        hint: "Somewhere dark, cosy and just a little bit secret.",
        type: "find",
        category: "imagination",
        icon: "dragon",
        proofType: "photo",
      },
      {
        id: "magic-tree",
        title: "Find a magical tree",
        hint: "What makes it magic? Tell each other.",
        type: "find",
        category: "nature",
        icon: "tree",
        proofType: "photo",
      },
      {
        id: "sparkle",
        title: "Find something that sparkles",
        hint: "Raindrops, glass, a puddle catching the sky.",
        type: "find",
        category: "observation",
        icon: "sparkle",
        proofType: "photo",
      },
      {
        id: "portal",
        title: "Find a secret portal",
        hint: "An archway, a gap in a hedge, a tunnel of branches.",
        type: "find",
        category: "imagination",
        icon: "arch",
        proofType: "photo",
      },
      {
        id: "spell",
        title: "Everyone, cast a spell",
        hint: "Point your wizard sticks and freeze mid-spell.",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "magic-place",
        title: "Find the place where the magic lives",
        hint: "The most magical spot of the whole walk. Whisper when you find it.",
        type: "find",
        category: "imagination",
        icon: "moon",
        proofType: "photo",
      },
    ],
  },
];

export function getHunt(id) {
  return HUNTS.find((hunt) => hunt.id === id) ?? null;
}

export function getChallenge(hunt, challengeId) {
  return hunt?.challenges.find((c) => c.id === challengeId) ?? null;
}
