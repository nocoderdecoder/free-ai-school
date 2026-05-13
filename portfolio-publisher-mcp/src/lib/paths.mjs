import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(serverDir, "..", "..");
const repoRoot = path.resolve(projectDir, "..");

export const paths = {
  projectDir,
  repoRoot,
  labPage: path.join(repoRoot, "app", "lab", "page.tsx"),
  publicDir: path.join(repoRoot, "public"),
  projectsDir: path.join(repoRoot, "public", "projects"),
};

export function toRepoRelative(absolutePath) {
  return path.relative(paths.repoRoot, absolutePath).replaceAll(path.sep, "/");
}
