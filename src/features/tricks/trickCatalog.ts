export type TrickCatalogItem = {
  id: string
  name: string
  points2: number
}

const CATALOG: TrickCatalogItem[] = [
  { id: "trick_001", name: "S", points2: 40 },
  { id: "trick_002", name: "TS", points2: 130 },
  { id: "trick_003", name: "B", points2: 60 },
  { id: "trick_004", name: "F", points2: 60 },
  { id: "trick_005", name: "O", points2: 90 },
  { id: "trick_006", name: "BB", points2: 90 },
  { id: "trick_007", name: "5B", points2: 110 },
  { id: "trick_008", name: "5F", points2: 110 },
  { id: "trick_009", name: "7F", points2: 130 },
  { id: "trick_010", name: "7B", points2: 130 },
  { id: "trick_011", name: "LB", points2: 110 },
  { id: "trick_012", name: "LF", points2: 110 },
  { id: "trick_013", name: "TB", points2: 100 },
  { id: "trick_014", name: "TF", points2: 100 },
  { id: "trick_015", name: "TO", points2: 200 },
  { id: "trick_016", name: "TBB", points2: 200 },
  { id: "trick_017", name: "T5B", points2: 350 },
  { id: "trick_018", name: "T7F", points2: 450 },
  { id: "trick_019", name: "T5F", points2: 350 },
  { id: "trick_020", name: "WB", points2: 80 },
  { id: "trick_021", name: "WF", points2: 80 },
  { id: "trick_022", name: "WO", points2: 150 },
  { id: "trick_023", name: "WBB", points2: 150 },
  { id: "trick_024", name: "W5B", points2: 310 },
  { id: "trick_025", name: "W5F", points2: 310 },
  { id: "trick_026", name: "W7F", points2: 800 },
  { id: "trick_027", name: "W7B", points2: 480 },
  { id: "trick_028", name: "W9B", points2: 850 },
  { id: "trick_029", name: "W9F", points2: 850 },
  { id: "trick_030", name: "WLB", points2: 160 },
  { id: "trick_031", name: "WLF", points2: 160 },
  { id: "trick_032", name: "WLO", points2: 260 },
  { id: "trick_033", name: "WLBB", points2: 260 },
  { id: "trick_034", name: "WL5B", points2: 420 },
  { id: "trick_035", name: "WL5LB", points2: 500 },
  { id: "trick_036", name: "WL7F", points2: 700 },
  { id: "trick_037", name: "WL9B", points2: 800 },
  { id: "trick_038", name: "WL5F", points2: 420 },
  { id: "trick_039", name: "WL5LF", points2: 500 },
  { id: "trick_040", name: "WL7B", points2: 550 },
  { id: "trick_041", name: "WL9F", points2: 800 },
  { id: "trick_042", name: "TWB", points2: 150 },
  { id: "trick_043", name: "TWF", points2: 150 },
  { id: "trick_044", name: "TWO", points2: 300 },
  { id: "trick_045", name: "TWBB", points2: 330 },
  { id: "trick_046", name: "TW5B", points2: 500 },
  { id: "trick_047", name: "TW7F", points2: 650 },
  { id: "trick_048", name: "TW5F", points2: 500 },
  { id: "trick_049", name: "TW7B", points2: 650 },
  { id: "trick_050", name: "TWLB", points2: 320 },
  { id: "trick_051", name: "TWLF", points2: 380 },
  { id: "trick_052", name: "TWLO", points2: 480 },
  { id: "trick_053", name: "TWLBB", points2: 480 },
  { id: "trick_054", name: "TWL5B", points2: 600 },
  { id: "trick_055", name: "TWL5F", points2: 700 },
  { id: "trick_056", name: "WflipF", points2: 800 },
  { id: "trick_057", name: "WflipB", points2: 500 },
  { id: "trick_058", name: "WDflipB", points2: 1000 },
  { id: "trick_059", name: "WflipBFF", points2: 800 },
  { id: "trick_060", name: "WflipBBB", points2: 800 },
  { id: "trick_061", name: "WflipBFB", points2: 750 },
  { id: "trick_062", name: "WflipBLB", points2: 800 },
  { id: "trick_063", name: "WflipBBF", points2: 550 },
  { id: "trick_064", name: "WflipB5F", points2: 850 },
  { id: "trick_065", name: "WflipB5B", points2: 900 },
  { id: "trick_066", name: "FFLB", points2: 850 },
  { id: "trick_067", name: "SLB", points2: 350 },
  { id: "trick_068", name: "SLF", points2: 400 },
  { id: "trick_069", name: "SLO", points2: 400 },
  { id: "trick_070", name: "SLBB", points2: 450 },
  { id: "trick_071", name: "SL5B", points2: 550 },
  { id: "trick_072", name: "SL5F", points2: 550 },
  { id: "trick_073", name: "SL7B", points2: 750 },
  { id: "trick_074", name: "SL7F", points2: 800 }
]

export const TRICK_CATALOG = [...CATALOG].sort((a, b) => {
  return a.name.localeCompare(b.name)
})

export function searchTricks(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return TRICK_CATALOG
  return TRICK_CATALOG.filter(trick => trick.name.toLowerCase().includes(normalized))
}

