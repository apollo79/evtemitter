export const createMapEntryIfNotExistsAndGet = <T = unknown>(
    map: Map<string, T>,
    name: string,
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
