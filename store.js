/**
 * Store — pluggable persistence backend.
 *
 * Default: FileStore (JSONL on disk).
 * Swap in any backend — database, Kafka, S3, Redis — by extending Store.
 *
 * Usage:
 *   // Default (file)
 *   const store = new FileStore('data/timeline.jsonl');
 *
 *   // Custom
 *   class KafkaStore extends Store {
 *     async append(line) { await producer.send({ value: line }); }
 *     async read() { return await consumer.readAll(); }
 *     ...
 *   }
 *
 *   const tl = new Timeline(new KafkaStore(topic));
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Abstract store interface. All methods can be sync or async.
 */
export class Store {
  /** Append a single line (string). */
  append(_line) { throw new Error('Store.append() not implemented'); }

  /** Read all lines. Returns string[]. */
  read() { throw new Error('Store.read() not implemented'); }

  /** Overwrite entire contents with lines (string[]). */
  write(_lines) { throw new Error('Store.write() not implemented'); }

  /** Does the backing store have any content? Returns boolean. */
  exists() { throw new Error('Store.exists() not implemented'); }

  /** Clear all content. */
  clear() { throw new Error('Store.clear() not implemented'); }
}

/**
 * File-backed store. One line per append. JSONL-native.
 */
export class FileStore extends Store {
  constructor(filePath) {
    super();
    this.path = filePath;
    this.#ensureDir();
  }

  append(line) {
    appendFileSync(this.path, line + '\n');
  }

  read() {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, 'utf8').trim().split('\n').filter(Boolean);
  }

  write(lines) {
    writeFileSync(this.path, lines.join('\n') + (lines.length ? '\n' : ''));
  }

  exists() {
    return existsSync(this.path);
  }

  clear() {
    writeFileSync(this.path, '');
  }

  #ensureDir() {
    const dir = dirname(this.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

/**
 * Helper: resolve a store argument. If string, wrap in FileStore.
 */
export function resolveStore(storeOrPath, defaultPath) {
  if (storeOrPath instanceof Store) return storeOrPath;
  return new FileStore(storeOrPath || defaultPath);
}
