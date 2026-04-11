/**
 * Property data — simulates what a Google Maps crawler + Gemini vision would return.
 *
 * In production, this would be:
 *   1. Crawl Google Maps Street View for a neighborhood
 *   2. Send each photo to Gemini with "describe this property exterior in detail"
 *   3. Parse the structured response
 *
 * For the demo, we hardcode 5 realistic property descriptions.
 */

export const NEIGHBORHOOD = '200 block of Oak Lane, Maplewood NJ';

export const PROPERTIES = [
  {
    address: '142 Oak Lane',
    owner: 'The Hendersons',
    homeValue: 425000,
    yearBuilt: 1987,
    crawlerOutput: {
      frontYard: 'Patchy brown lawn with bare soil visible in 3 spots. Two large boxwood bushes overgrown and blocking front windows. One dead ornamental tree near mailbox.',
      driveway: 'Concrete driveway with 4 visible cracks, two with weeds growing through. Oil stain near garage. Edges crumbling.',
      frontDoor: 'Faded red paint, peeling near bottom. Rusty brass knocker and kickplate. Storm door has torn screen.',
      gutters: 'Sagging on left side of house. Leaves and debris visible from street. One downspout disconnected.',
      lighting: 'No exterior lighting visible. Porch light fixture empty.',
      mailbox: 'Wooden post leaning 15 degrees. Rusted metal mailbox, numbers peeling off.',
      roof: 'Asphalt shingles, some curling on south-facing side. Moss visible near chimney.',
      fence: 'Chain link fence, 3 sections leaning. Gate doesn\'t close fully.',
      overall: 'House looks tired but structurally sound. Needs cosmetic refresh.',
    },
  },
  {
    address: '156 Oak Lane',
    owner: 'Maria Santos',
    homeValue: 390000,
    yearBuilt: 1992,
    crawlerOutput: {
      frontYard: 'Lawn is green but unmowed, approximately 6 inches tall. Flower beds overgrown with weeds. Garden gnome collection (12+) cluttering front path.',
      driveway: 'Asphalt driveway in fair condition. One large pothole near street. Basketball hoop with torn net.',
      frontDoor: 'White door in decent condition but dirty. Welcome mat is shredded. Two Amazon packages sitting on porch.',
      gutters: 'Clean and functional. Recently painted.',
      lighting: 'One working porch light. Path lights along walkway but 3 of 5 are broken.',
      mailbox: 'Standard USPS mailbox, good condition.',
      roof: 'Newer roof, good condition. Solar panel mounts visible but no panels installed.',
      fence: 'Privacy fence on left side only. Right side open to neighbor. Fence is stained but fading.',
      overall: 'Decent bones, needs cleanup and finishing touches.',
    },
  },
  {
    address: '171 Oak Lane',
    owner: 'The Chens',
    homeValue: 510000,
    yearBuilt: 2001,
    crawlerOutput: {
      frontYard: 'Well-maintained lawn but completely flat and featureless. No landscaping, no flower beds, no trees. Just green grass and concrete walkway.',
      driveway: 'Two-car concrete driveway in excellent condition. Clean, no cracks. But plain — no borders, no pavers, no visual interest.',
      frontDoor: 'Builder-grade steel door, unpainted, with basic hardware. No sidelights, no wreath, no personality.',
      gutters: 'Functional, standard white aluminum.',
      lighting: 'Builder-grade coach lights flanking garage. One bulb out.',
      mailbox: 'Standard black mailbox on wooden post. Clean but generic.',
      roof: 'Good condition architectural shingles.',
      fence: 'None. Fully open yard.',
      overall: 'House is well-maintained but has zero curb appeal — looks like a model home that nobody moved into.',
    },
  },
  {
    address: '188 Oak Lane',
    owner: 'James & Pat O\'Brien',
    homeValue: 355000,
    yearBuilt: 1978,
    crawlerOutput: {
      frontYard: 'Overgrown jungle. Hedges covering 60% of front facade. Can barely see front door. Large oak tree roots lifting sidewalk.',
      driveway: 'Narrow single-car asphalt driveway, heavily cracked. Grass growing through entire right side. RV parked on lawn next to driveway.',
      frontDoor: 'Cannot see — completely hidden behind overgrown hedge. Presumably exists.',
      gutters: 'Rusted steel gutters. Multiple sections pulling away from fascia. Water staining on siding below.',
      lighting: 'Vintage 1970s carriage lamp, yellowed glass. May or may not work.',
      mailbox: 'At the curb, buried behind hedge. Barely accessible.',
      roof: 'Original roof showing age. Multiple patched spots visible. Satellite dish from the 90s still mounted.',
      fence: 'Wooden privacy fence, several boards missing. Gate tied shut with rope.',
      overall: 'Worst on the block. The house is literally hiding behind its own landscaping.',
    },
  },
  {
    address: '203 Oak Lane',
    owner: 'Priya Sharma',
    homeValue: 475000,
    yearBuilt: 2015,
    crawlerOutput: {
      frontYard: 'Professionally landscaped 3 years ago but now declining. Mulch is thin and weedy. Japanese maple is thriving. Boxwoods need shaping.',
      driveway: 'Paver driveway, still in great shape. Some weeds in joints. Could use polymeric sand refresh.',
      frontDoor: 'Craftsman-style door, good condition. Smart doorbell installed. Potted plants on porch — one dead.',
      gutters: 'Leaf guards installed but one section displaced.',
      lighting: 'Modern path lighting, all working. Uplights on house facade — attractive.',
      mailbox: 'Matching stone pillar mailbox with house numbers. Nice.',
      roof: 'Excellent condition.',
      fence: 'Composite fence, good condition. Gate hardware squeaky.',
      overall: 'Best house on the block but starting to slip. Needs a maintenance tune-up, not a makeover.',
    },
  },
];
