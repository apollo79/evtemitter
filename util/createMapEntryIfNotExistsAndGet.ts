export const createMapEntryIfNotExistsAndGet = <K = unknown, T = unknown>(
    map: Map<K, T>,
    name: K,
    value: T,
) => {
    if (map.has(name)) {
        return map.get(name)!;
    }

    return map
        .set(name, value)
        .get(name)!;
};

export default createMapEntryIfNotExistsAndGet;
