/**
 * Event bus — thin pub/sub. The only middleware.
 *
 * Usage:
 *   const bus = new Bus();
 *   bus.on('research', (msg) => { ... });
 *   bus.emit('research', { from: 'bull', content: 'buy AAPL' });
 *   bus.off('research', handler);
 *
 * Supports wildcards:
 *   bus.on('*', (event, data) => { ... });  // catch-all
 */
export class Bus {
  #listeners = {};
  #wildcards = [];

  on(event, fn) {
    if (event === '*') {
      this.#wildcards.push(fn);
    } else {
      (this.#listeners[event] ??= []).push(fn);
    }
    return this; // chainable
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      fn(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, fn) {
    if (event === '*') {
      this.#wildcards = this.#wildcards.filter(f => f !== fn);
    } else if (this.#listeners[event]) {
      this.#listeners[event] = this.#listeners[event].filter(f => f !== fn);
    }
    return this;
  }

  emit(event, data) {
    for (const fn of this.#listeners[event] || []) fn(data);
    for (const fn of this.#wildcards) fn(event, data);
  }

  clear() {
    this.#listeners = {};
    this.#wildcards = [];
  }
}
