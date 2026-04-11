/**
 * Market simulation — purely procedural, no LLM.
 */

const LOCATIONS = {
  park:   { base: 40, description: 'Busy park with foot traffic' },
  school: { base: 30, description: 'Near the school entrance' },
  corner: { base: 15, description: 'Your own street corner' },
};

const WEATHER = {
  hot:    { mult: 1.5, emoji: '☀️🔥', description: 'Scorching hot' },
  sunny:  { mult: 1.0, emoji: '☀️',   description: 'Nice and sunny' },
  cloudy: { mult: 0.6, emoji: '☁️',   description: 'Overcast and cool' },
  rainy:  { mult: 0.2, emoji: '🌧️',  description: 'Raining' },
};

const WEATHER_SEQUENCE = ['sunny', 'hot', 'cloudy', 'sunny', 'rainy'];

export function getWeather(day) {
  return WEATHER_SEQUENCE[(day - 1) % WEATHER_SEQUENCE.length];
}

export function getWeatherInfo(weather) {
  return WEATHER[weather];
}

export function getLocationInfo(location) {
  return LOCATIONS[location];
}

export function getLocationNames() {
  return Object.keys(LOCATIONS);
}

/**
 * Simulate a day's sales.
 * LLM decides price + location. This function decides outcomes.
 */
/**
 * Simulate a day's sales.
 * LLM decides price + location. This function decides outcomes.
 * @param {object} [opts]
 * @param {Array} [opts.votes] — individual votes, used to calculate discord penalty
 */
export function simulateSales(price, location, weather, supplies, opts = {}) {
  const loc = LOCATIONS[location] || LOCATIONS.corner;
  const wx = WEATHER[weather] || WEATHER.sunny;

  // Price curve: demand drops as price rises
  // $1 → 1.17x, $2 → 0.83x, $3 → 0.5x, $4+ → near zero
  const priceFactor = Math.max(0.05, 1.5 - (price / 3));

  // Base demand from location × weather × price sensitivity
  let demand = loc.base * wx.mult * priceFactor;

  // Discord penalty: disagreement on location costs setup time and sales
  // Each kid who voted for a different location = 10% penalty (arguing, slow setup, bad vibes)
  let discordPenalty = 0;
  if (opts.votes) {
    const dissenters = opts.votes.filter(v => v.location !== location).length;
    discordPenalty = dissenters * 0.10;
    demand = demand * (1 - discordPenalty);
  }

  // Randomness ±20%
  demand = Math.round(demand * (0.8 + Math.random() * 0.4));
  demand = Math.max(0, demand);

  // Can't sell more than supplies allow
  const maxCups = Math.min(supplies.cups, Math.floor(supplies.lemons * 2));
  const sold = Math.min(demand, maxCups);
  const revenue = +(sold * price).toFixed(2);

  // Supplies consumed
  const lemonsUsed = Math.ceil(sold / 2);
  const sugarUsed = Math.ceil(sold / 4);

  return {
    sold,
    demand,
    revenue,
    lemonsUsed,
    sugarUsed,
    cupsUsed: sold,
    unfulfilled: Math.max(0, demand - sold),
  };
}
