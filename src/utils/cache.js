
const store = new Map();

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