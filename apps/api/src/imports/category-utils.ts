export type CategoryNodeInput = {
  name: string;
  path: string;
  parentPath: string | null;
  depth: number;
};

const DELIMITER = '>';

export const normalizeCategoryPath = (value: string | null | undefined) => {
  if (!value) return null;
  const parts = value
    .split(DELIMITER)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts.join(DELIMITER) : null;
};

export const buildCategoryNodes = (paths: string[]) => {
  const nodeMap = new Map<string, CategoryNodeInput>();

  paths.forEach((path) => {
    const normalized = normalizeCategoryPath(path);
    if (!normalized) return;
    const segments = normalized.split(DELIMITER);
    segments.forEach((segment, index) => {
      const nodePath = segments.slice(0, index + 1).join(DELIMITER);
      if (nodeMap.has(nodePath)) {
        return;
      }
      nodeMap.set(nodePath, {
        name: segment,
        path: nodePath,
        parentPath: index === 0 ? null : segments.slice(0, index).join(DELIMITER),
        depth: index + 1
      });
    });
  });

  return Array.from(nodeMap.values());
};
