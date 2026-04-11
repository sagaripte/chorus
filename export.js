/**
 * TimelineExporter — converts Timeline JSONL into markdown.
 *
 * Handles the common boilerplate: reading JSONL, deduping reruns,
 * iterating events, and writing output. You just provide formatters.
 *
 * Usage:
 *   import { TimelineExporter } from './export.js';
 *
 *   const exporter = new TimelineExporter({
 *     startEvent: 'game_start',           // event type that marks a new run
 *     formatters: {
 *       game_start(e) { return [`# Game`, '', `**Players:** ${e.players.join(', ')}`]; },
 *       action(e) { return [`**${e.player}:** ${e.action}`]; },
 *     },
 *     footer: '*Generated with Chorus*',  // optional closing line
 *   });
 *
 *   // From CLI
 *   exporter.run('./data/game.jsonl');     // writes ./data/game.md
 *
 *   // Programmatic
 *   const md = exporter.export(events);   // returns markdown string
 */
import { readFileSync, writeFileSync } from 'fs';

export class TimelineExporter {
  #startEvent;
  #formatters;
  #footer;

  /**
   * @param {object} opts
   * @param {string} opts.startEvent — event type marking a new run (for deduping reruns)
   * @param {object} opts.formatters — { eventType: (event) => string[] | string | null }
   * @param {string} [opts.footer] — optional closing line
   */
  constructor({ startEvent, formatters, footer }) {
    this.#startEvent = startEvent;
    this.#formatters = formatters;
    this.#footer = footer || null;
  }

  /**
   * Export events to a markdown string.
   * @param {object[]} events — parsed timeline events
   * @returns {string}
   */
  export(events) {
    // Dedupe reruns: keep only events from the last start
    if (this.#startEvent) {
      const lastStart = events.findLastIndex(e => e.type === this.#startEvent);
      if (lastStart > 0) events = events.slice(lastStart);
    }

    const lines = [];

    for (const event of events) {
      const formatter = this.#formatters[event.type];
      if (!formatter) continue;

      const result = formatter(event);
      if (result === null || result === undefined) continue;

      if (Array.isArray(result)) {
        lines.push(...result);
      } else {
        lines.push(result);
      }
    }

    if (this.#footer) {
      lines.push('', '---', '', this.#footer);
    }

    return lines.join('\n');
  }

  /**
   * Read a JSONL file, export to markdown, write the .md file.
   * Convenience for CLI usage.
   * @param {string} inputPath — path to .jsonl file
   * @param {string} [outputPath] — defaults to inputPath with .md extension
   */
  run(inputPath, outputPath) {
    outputPath = outputPath || inputPath.replace('.jsonl', '.md');

    const events = readFileSync(inputPath, 'utf8')
      .trim().split('\n').filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);

    const md = this.export(events);
    writeFileSync(outputPath, md);
    console.log(`Exported to ${outputPath}`);
  }
}
