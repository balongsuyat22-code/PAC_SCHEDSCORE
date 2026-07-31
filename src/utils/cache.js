/**
 * utils/cache.js
 * ---------------------------------------------------------------------------
 * Tiny in-process TTL cache for hot, read-heavy, expensive-to-compute
 * endpoints (leaderboard, medal tally, dashboard totals). This is NOT a
 * general-purpose cache — it's specifically for GET endpoints where:
 *   - the underlying query recomputes an aggregate over many rows, and
 *   - being a few seconds stale is completely fine (a public scoreboard,
 *     an admin dashboard), and
 *   - the same result is requested repeatedly by many concurrent viewers
 *     (this is exactly the /live board + /admin dashboard traffic pattern).
 *
 * Deliberately NOT Redis: single-process deployment, no extra infra, and
 * the TTLs here are short enough (10-30s) that process-local memory is
 * fine. If this app ever runs multiple Node instances behind a load
 * balancer, swap this module's internals for Redis — the get/set/wrap
 * call sites below don't need to change.
 *
 * Usage:
 *   const cache = require('../utils/cache');
 *   const data = await cache.wrap('leaderboard:overall', 15, async () => {
 *     const [rows] = await pool.execute(...);
 *     return rows;
 *   });
 *
 *   // after a write that invalidates it (e.g. recalculate, match complete):
 *   cache.clear('leaderboard:overall');
 *   cache.clearPrefix('leaderboard:'); // clear a whole family of keys
 */

const store = new Map(); // key -> { value, expiresAt }

function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
    }
    return entry.value;
}

function set(key, value, ttlSeconds) {
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return value;
}

function clear(key) {
    store.delete(key);
}

function clearPrefix(prefix) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}

/**
 * wrap: return the cached value if fresh, otherwise call fn(), cache the
 * result, and return it. fn() should be an async function returning the
 * data to cache (throwing errors is fine — nothing gets cached on error).
 */
async function wrap(key, ttlSeconds, fn) {
    const cached = get(key);
    if (cached !== undefined) return cached;
    const fresh = await fn();
    set(key, fresh, ttlSeconds);
    return fresh;
}

module.exports = { get, set, clear, clearPrefix, wrap };