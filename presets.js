// presets.js — 4-shaft preset drafts
// Shape for each: { threadingSeq, treadlingSeq, tieup }

const PRESETS = {
  // ---------- Plain / basket / simple color-and-weave ----------
  plain:      { threadingSeq: [1, 2],             treadlingSeq: [[1], [2]],                         tieup: { 1: [1],   2: [2],   3: [],     4: []     } },
  basket2x2:  { threadingSeq: [1, 1, 2, 2],       treadlingSeq: [[1], [1], [2], [2]],               tieup: { 1: [1],   2: [2],   3: [],     4: []     } },
  logCabin:   { threadingSeq: [1, 2],             treadlingSeq: [[1], [2]],                         tieup: { 1: [1],   2: [2],   3: [],     4: []     } },

  // ---------- Straight / ratio twills ----------
  twill2x2:         { threadingSeq: [1, 2, 3, 4],             treadlingSeq: [[1], [2], [3], [4]],                             tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 4],     4: [4, 1]     } },
  twill2_1_3shaft:  { threadingSeq: [1, 2, 3],                treadlingSeq: [[1], [2], [3]],                                   tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 1],     4: []         } },
  twill3_1:         { threadingSeq: [1, 2, 3, 4],             treadlingSeq: [[1], [2], [3], [4]],                             tieup: { 1: [1, 2, 3],  2: [2, 3, 4],  3: [3, 4, 1],  4: [4, 1, 2]  } }, // warp-faced
  twill1_3:         { threadingSeq: [1, 2, 3, 4],             treadlingSeq: [[1], [2], [3], [4]],                             tieup: { 1: [1],        2: [2],        3: [3],        4: [4]        } }, // weft-faced
  windowpaneTwill4: { threadingSeq: [1, 1, 2, 2, 3, 3, 4, 4], treadlingSeq: [[1], [1], [2], [2], [3], [3], [4], [4]],         tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 4],     4: [4, 1]     } }, // tartan-ish checks

  // ---------- Point / zigzag / diamond twills ----------
  pointTwill4:         { threadingSeq: [1, 2, 3, 4, 3, 2],             treadlingSeq: [[1], [2], [3], [4], [3], [2]],                     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  brokenTwill4:        { threadingSeq: [1, 2, 3, 4],                   treadlingSeq: [[1], [3], [2], [4]],                               tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  herringbone4:        { threadingSeq: [1, 2, 3, 4],                   treadlingSeq: [[1], [2], [3], [4], [3], [2]],                     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  birdsEye4:           { threadingSeq: [1, 2, 3, 4, 3, 2],             treadlingSeq: [[1], [2], [3], [4], [3], [2]],                     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  gooseEye4:           { threadingSeq: [1, 2, 3, 4, 4, 3, 2, 1],       treadlingSeq: [[1], [2], [3], [4], [4], [3], [2], [1]],           tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  extendedPointTwill4: { threadingSeq: [1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2], treadlingSeq: [[1], [2], [3], [4], [3], [2], [1], [2], [3], [4], [3], [2]], tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  brokenDiamond4:      { threadingSeq: [1, 2, 3, 4, 3, 2, 1, 2],       treadlingSeq: [[1], [3], [2], [4], [3], [1], [4], [2]],           tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  starTwill4:          { threadingSeq: [1, 2, 3, 4, 3, 2],             treadlingSeq: [[1], [3], [2], [4], [3], [1]],                     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } }, // star/rose style
  roseTwill4:          { threadingSeq: [1, 2, 3, 4, 3, 2],             treadlingSeq: [[1], [2], [3], [4], [2], [3]],                     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },
  nordicCross4:        { threadingSeq: [1, 2, 3, 4, 4, 3, 2, 1],       treadlingSeq: [[1], [4], [2], [3], [3], [2], [4], [1]],           tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } }, // cross/star motif

  // ---------- Waffle / textured ----------
  waffle4: { threadingSeq: [1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2], treadlingSeq: [[1], [2], [3], [4], [3], [2], [1], [2], [3], [4], [3], [2]], tieup: { 1: [1, 2, 3], 2: [2, 3, 4], 3: [1, 3, 4], 4: [1, 2, 4] } },

  // ---------- Rosepath / M's & O's ----------
  rosepath4: { threadingSeq: [1, 2, 3, 4],                   treadlingSeq: [[1], [2], [3], [4], [3], [2]],               tieup: { 1: [1, 3],  2: [2, 4],  3: [1, 2],  4: [3, 4]  } },
  msos4:     { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [2], [1], [2], [3], [4], [3], [4]],     tieup: { 1: [1, 2],  2: [2, 3],  3: [3, 4],  4: [4, 1]  } },

  // Huck spot
  huckSpot4: { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [2], [1], [2], [3], [4], [3], [4]],     tieup: { 1: [1, 3],  2: [2, 4],  3: [1, 2],  4: [3, 4]  } },

  // ---------- Block / tied weaves ----------
  monksBelt4:    { threadingSeq: [1, 1, 2, 2, 3, 3, 4, 4],       treadlingSeq: [[1], [3], [2], [4]],                 tieup: { 1: [1, 2],     2: [3, 4],     3: [1, 3],     4: [2, 4]     } },
  halvDrall4:    { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [2], [3], [4]],                 tieup: { 1: [1, 2, 3],  2: [2, 3, 4],  3: [1, 3, 4],  4: [1, 2, 4]  } },
  summerWinter4: { threadingSeq: [1, 3, 1, 3, 2, 4, 2, 4],       treadlingSeq: [[3], [1], [4], [2]],                 tieup: { 1: [1],        2: [2],        3: [1, 3],     4: [2, 4]     } },
  crackle4:      { threadingSeq: [1, 2, 3, 2, 2, 3, 4, 3],       treadlingSeq: [[1], [2], [3], [4]],                 tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 4],     4: [4, 1]     } },
  daldrall4:     { threadingSeq: [1, 3, 1, 3, 2, 4, 2, 4],       treadlingSeq: [[1], [2], [3], [4]],                 tieup: { 1: [1, 2, 3],  2: [2, 3, 4],  3: [1, 3, 4],  4: [1, 2, 4]  } }, // dräll variant
  jamtlandsdrall4:{threadingSeq: [1, 2, 3, 4, 1, 2, 3, 4],      treadlingSeq: [[1], [2], [3], [4]],                 tieup: { 1: [1, 2, 3],  2: [2, 3, 4],  3: [1, 3, 4],  4: [1, 2, 4]  } },

  // ---------- Lace / spot weaves ----------
  huckLace4:     { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [2], [3], [4], [1], [3], [2], [4]], tieup: { 1: [1, 3],     2: [2, 4],     3: [1, 4],     4: [2, 3]     } },
  swedishLace4:  { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [4], [2], [3]],                     tieup: { 1: [1, 2, 4],  2: [1, 3],     3: [2, 4],     4: [2, 3, 4]  } },
  spotBronson4:  { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [3], [2], [4]],                     tieup: { 1: [1, 3],     2: [2, 4],     3: [1, 2],     4: [3, 4]     } }, // Bronson-ish spots
  bronsonLace4:  { threadingSeq: [1, 2, 1, 2, 3, 4, 3, 4],       treadlingSeq: [[1], [4], [2], [3]],                     tieup: { 1: [1, 2, 4],  2: [1, 3],     3: [2, 4],     4: [2, 3, 4]  } },

  // ---------- Rug / boundweave ----------
  krokbragd3on4: { threadingSeq: [1, 2, 3, 1, 2, 3],            treadlingSeq: [[1], [2], [3]],                           tieup: { 1: [1, 2],     2: [2, 3],     3: [1, 3],     4: []         } },

  // ---------- Color-and-weave twill effects ----------
  shadowTwill4:  { threadingSeq: [1, 2, 3, 4, 1, 2, 3, 4],      treadlingSeq: [[1], [2], [3], [4], [1], [2], [3], [4]], tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 4],     4: [4, 1]     } },
  houndstooth4:  { threadingSeq: [1, 2, 3, 4],                  treadlingSeq: [[1], [2], [3], [4]],                     tieup: { 1: [1, 2],     2: [2, 3],     3: [3, 4],     4: [4, 1]     } },
};
