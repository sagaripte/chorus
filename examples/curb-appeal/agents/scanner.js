/**
 * Scanner — analyzes Street View images using Gemini vision.
 *
 * STUB: Returns the hardcoded crawlerOutput from the property.
 * In production: send Street View image to Gemini with
 *   "Describe this property exterior in detail — front yard, driveway, door, gutters, etc."
 */
export function createScanner(tl) {
  return {
    async scan(property) {
      const description = Object.entries(property.crawlerOutput)
        .map(([area, desc]) => `${area}: ${desc}`)
        .join('\n');
      console.log(`    🤖 Scanner: Gemini analyzed exterior (${Object.keys(property.crawlerOutput).length} areas)`);
      tl.emit('scan', { address: property.address, areas: Object.keys(property.crawlerOutput).length });
      return description;
    }
  };
}
