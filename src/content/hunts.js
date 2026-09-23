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
//   challenges   authored order = the order of the cards on the board
//
// Challenge
//   id         stable within its hunt — saved photos are linked by it
//   title      the prompt (Dutch), short enough to read aloud to a five-year-old
//   hint       optional nudge for the grown-up reading it out
//   type       "find" (spot something) or "together" (a group moment)
//   category   observation | nature | imagination | creative | group
//   icon       key in icons.js
//   proofType  "photo" — the only proof type for now

export const HUNTS = [
  {
    id: "nature",
    title: "Natuurspeurtocht",
    description: "Doe rustig aan en ontdek kleine, wilde dingen.",
    theme: "leaf",
    accent: "#4d6b3c",
    mode: "open",
    challenges: [
      {
        id: "big-leaf",
        title: "Vind een blad dat groter is dan je hand",
        hint: "Pak er een van de grond en houd je hand ernaast.",
        type: "find",
        category: "nature",
        icon: "leaf",
        proofType: "photo",
      },
      {
        id: "tiny-growing",
        title: "Vind iets kleins dat groeit",
        hint: "Kijk laag: tussen stoeptegels, op oude muren, bij boomwortels.",
        type: "find",
        category: "observation",
        icon: "sprout",
        proofType: "photo",
      },
      {
        id: "strange-tree",
        title: "Vind de vreemdste boom",
        hint: "Scheef, bultig, hol of gedraaid. Jij bepaalt wat vreemd is.",
        type: "find",
        category: "creative",
        icon: "tree",
        proofType: "photo",
      },
      {
        id: "three-leaves",
        title: "Vind drie verschillende bladeren",
        hint: "Bladeren van de grond zijn perfect. Leg ze naast elkaar.",
        type: "find",
        category: "nature",
        icon: "leaves",
        proofType: "photo",
      },
      {
        id: "animal-home",
        title: "Vind een plek waar een dier kan wonen",
        hint: "Een hol, een nest, een dichte struik. Kijken mag, storen niet.",
        type: "find",
        category: "nature",
        icon: "burrow",
        proofType: "photo",
      },
      {
        id: "bird",
        title: "Spot een vogel, of een veer",
        hint: "Eerst luisteren. Dan omhoog kijken.",
        type: "find",
        category: "observation",
        icon: "feather",
        proofType: "photo",
      },
      {
        id: "tree-pose",
        title: "Allemaal een boom!",
        hint: "Armen omhoog als takken. Wie is de hoogste boom?",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "best-view",
        title: "Vind het uitzicht dat je wilt onthouden",
        hint: "Sta even stil. Kijk eerst helemaal om je heen.",
        type: "find",
        category: "observation",
        icon: "horizon",
        proofType: "photo",
      },
    ],
  },
  {
    id: "funny",
    title: "Gekke vondsten",
    description: "Rare, grappige dingen die zich overal verstoppen.",
    theme: "face",
    accent: "#a4492a",
    mode: "open",
    challenges: [
      {
        id: "face",
        title: "Vind iets dat op een gezicht lijkt",
        hint: "Twee ramen en een deur. Twee knoesten en een scheur. Gezichten zijn overal.",
        type: "find",
        category: "creative",
        icon: "face",
        proofType: "photo",
      },
      {
        id: "wonky",
        title: "Vind het scheefste ding dat je kunt",
        hint: "Krom, gebogen of schuin. Hoe schever, hoe beter.",
        type: "find",
        category: "observation",
        icon: "wonky",
        proofType: "photo",
      },
      {
        id: "cloud",
        title: "Vind een wolk die ergens op lijkt",
        hint: "Wat zien jullie? Niemand heeft het fout.",
        type: "find",
        category: "imagination",
        icon: "cloud",
        proofType: "photo",
      },
      {
        id: "best-stick",
        title: "Vind de allerbeste stok",
        hint: "Jij bepaalt wat de beste is. Krom? Gevorkt? Een zwaard?",
        type: "find",
        category: "creative",
        icon: "stick",
        proofType: "photo",
      },
      {
        id: "wrong-place",
        title: "Vind iets op een rare plek",
        hint: "Een verloren want op een hek. Een blad op een auto.",
        type: "find",
        category: "observation",
        icon: "question",
        proofType: "photo",
      },
      {
        id: "dog-hat",
        title: "Vind een mooie hoed voor een hond",
        hint: "Alleen een foto maken. Er hoeft geen hond iets op.",
        type: "find",
        category: "imagination",
        icon: "hat",
        proofType: "photo",
      },
      {
        id: "shadows",
        title: "Maak een foto van jullie grappigste schaduwen",
        hint: "Zon in je rug. Maak jezelf zo gek mogelijk.",
        type: "together",
        category: "group",
        icon: "shadow",
        proofType: "photo",
      },
      {
        id: "silliest",
        title: "Vind het gekste ding van de hele wandeling",
        hint: "Stem met z'n allen. Gek zijn is een serieuze zaak.",
        type: "find",
        category: "creative",
        icon: "star",
        proofType: "photo",
      },
    ],
  },
  {
    id: "shapes",
    title: "Kleuren & vormen",
    description: "Makkelijke vondsten voor scherpe ogen.",
    theme: "shapes",
    accent: "#2f5c9a",
    mode: "open",
    challenges: [
      {
        id: "round",
        title: "Vind iets ronds",
        hint: "Wielen, stenen, putdeksels, knopen.",
        type: "find",
        category: "observation",
        icon: "circle",
        proofType: "photo",
      },
      {
        id: "yellow",
        title: "Vind iets felgeels",
        hint: "Bloemen, deuren, regenjassen, een tuinhek.",
        type: "find",
        category: "observation",
        icon: "sun",
        proofType: "photo",
      },
      {
        id: "stripes",
        title: "Vind strepen",
        hint: "Lijnen naast elkaar: hekjes, bakstenen, boomschors.",
        type: "find",
        category: "observation",
        icon: "stripes",
        proofType: "photo",
      },
      {
        id: "triangle",
        title: "Vind een driehoek",
        hint: "Daken zijn een goed begin.",
        type: "find",
        category: "observation",
        icon: "triangle",
        proofType: "photo",
      },
      {
        id: "tiny",
        title: "Vind iets kleiner dan je duim",
        hint: "Houd je duim ernaast op de foto.",
        type: "find",
        category: "observation",
        icon: "thumb",
        proofType: "photo",
      },
      {
        id: "heart",
        title: "Vind iets in de vorm van een hart",
        hint: "Deze is lastig. Bladeren, stenen en plassen kunnen je verrassen.",
        type: "find",
        category: "creative",
        icon: "heart",
        proofType: "photo",
      },
      {
        id: "body-shape",
        title: "Maak samen een vorm",
        hint: "Een cirkel met jullie armen? Een grote letter met jullie lijf?",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "most-colorful",
        title: "Vind het kleurigste ding van de wandeling",
        hint: "Tel de kleuren. Vind je er vijf?",
        type: "find",
        category: "observation",
        icon: "palette",
        proofType: "photo",
      },
    ],
  },
  {
    id: "magic",
    title: "Magische speurtocht",
    description: "De gewone wereld, net een beetje anders bekeken.",
    theme: "sparkle",
    accent: "#5c4a86",
    mode: "open",
    challenges: [
      {
        id: "wizard-stick",
        title: "Vind een toverstok",
        hint: "Elke tovenaar heeft er een. Hij moet goed in je hand liggen.",
        type: "find",
        category: "imagination",
        icon: "wand",
        proofType: "photo",
      },
      {
        id: "fairy-door",
        title: "Vind een feeëndeurtje",
        hint: "Een gaatje onder aan een boom. Een kiertje in een muur.",
        type: "find",
        category: "imagination",
        icon: "door",
        proofType: "photo",
      },
      {
        id: "dragon",
        title: "Vind een perfecte schuilplaats voor een draak",
        hint: "Donker, knus en een beetje geheim.",
        type: "find",
        category: "imagination",
        icon: "dragon",
        proofType: "photo",
      },
      {
        id: "magic-tree",
        title: "Vind een toverboom",
        hint: "Wat maakt hem magisch? Vertel het elkaar.",
        type: "find",
        category: "nature",
        icon: "tree",
        proofType: "photo",
      },
      {
        id: "sparkle",
        title: "Vind iets dat schittert",
        hint: "Regendruppels, glas, een plas waarin de lucht te zien is.",
        type: "find",
        category: "observation",
        icon: "sparkle",
        proofType: "photo",
      },
      {
        id: "portal",
        title: "Vind een geheime doorgang",
        hint: "Een boog, een gat in de heg, een tunnel van takken.",
        type: "find",
        category: "imagination",
        icon: "arch",
        proofType: "photo",
      },
      {
        id: "spell",
        title: "Betover elkaar!",
        hint: "Richt jullie toverstokken en bevries midden in de spreuk.",
        type: "together",
        category: "group",
        icon: "people",
        proofType: "photo",
      },
      {
        id: "magic-place",
        title: "Vind de plek waar de magie woont",
        hint: "De meest magische plek van de wandeling. Fluister als je hem vindt.",
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
