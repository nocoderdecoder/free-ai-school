import path from "node:path";
import { paths } from "./paths.mjs";

const readableRoots = [
  paths.appDir,
  paths.labPage,
  paths.publicDir,
  paths.projectDir,
];

const blockedSegments = new Set([
  ".env",
  ".git",
  "node_modules",
  ".next",
  "dist",
]);

export function assertSafeRead(targetPath) {
  const resolved = path.resolve(targetPath);
  const segments = resolved.split(path.sep);

  for (const segment of segments) {
    if (blockedSegments.has(segment)) {
      throw new Error(`Refusing to read blocked path segment: ${segment}`);
    }
  }

  const allowed = readableRoots.some((root) => {
    const resolvedRoot = path.resolve(root);
    return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
  });

  if (!allowed) {
    throw new Error(`Refusing to read outside approved project paths: ${resolved}`);
  }

  return resolved;
}

export function assertSafeLabPageWrite(targetPath) {
  const resolved = path.resolve(targetPath);
  if (resolved !== path.resolve(paths.labPage)) {
    throw new Error(`Refusing to write outside the Lab page: ${resolved}`);
  }
  return resolved;
}
