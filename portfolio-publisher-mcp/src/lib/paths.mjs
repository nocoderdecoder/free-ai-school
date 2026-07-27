import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(serverDir, "..", "..");
const configuredRepoRoot = process.env.NODE_ENV === "test"
  ? process.env.PORTFOLIO_PUBLISHER_TEST_REPO_ROOT
  : undefined;
const repoRoot = configuredRepoRoot
  ? path.resolve(configuredRepoRoot)
  : path.resolve(projectDir, "..");
const runtimeProjectDir = configuredRepoRoot
  ? path.join(repoRoot, "portfolio-publisher-mcp")
  : projectDir;

export const paths = {
  projectDir: runtimeProjectDir,
  repoRoot,
  appDir: path.join(repoRoot, "app"),
  labPage: path.join(repoRoot, "app", "lab", "page.tsx"),
  publicDir: path.join(repoRoot, "public"),
  projectsDir: path.join(repoRoot, "public", "projects"),
};

export function toRepoRelative(absolutePath) {
  return path.relative(paths.repoRoot, absolutePath).replaceAll(path.sep, "/");
}
