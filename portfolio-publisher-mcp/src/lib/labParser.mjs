import fs from "node:fs/promises";
import path from "node:path";
import { paths, toRepoRelative } from "./paths.mjs";
import { assertSafeRead } from "./fileSafety.mjs";

const FIELD_PATTERN = /(\w+):\s*["']([^"']*)["']/g;

function parseProjectBlock(block) {
  const project = {};
  let match;

  while ((match = FIELD_PATTERN.exec(block)) !== null) {
    project[match[1]] = match[2];
  }

  if (!project.name) return null;

  return {
    name: project.name,
    tagline: project.tagline ?? "",
    image: project.image ?? "",
    url: project.url ?? "",
    status: project.status ?? "",
  };
}

function extractProjectsArray(source) {
  const start = source.indexOf("const projects = [");
  if (start === -1) {
    throw new Error("Could not find `const projects = [` in app/lab/page.tsx.");
  }

  const arrayStart = source.indexOf("[", start);
  let depth = 0;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      return source.slice(arrayStart + 1, index);
    }
  }

  throw new Error("Could not parse the projects array in app/lab/page.tsx.");
}

export async function readLabSource() {
  return fs.readFile(assertSafeRead(paths.labPage), "utf8");
}

export async function listLabProjects() {
  const source = await readLabSource();
  const arrayBody = extractProjectsArray(source);
  const blocks = arrayBody.match(/\{[\s\S]*?\}/g) ?? [];
  return blocks.map(parseProjectBlock).filter(Boolean);
}

export async function getProjectAssetStatus(project) {
  if (!project.image) {
    return {
      project: project.name,
      image: "",
      status: "missing-image-field",
      exists: false,
    };
  }

  const normalized = project.image.replace(/^\//, "");
  const absolute = path.join(paths.publicDir, normalized);

  try {
    await fs.access(assertSafeRead(absolute));
    return {
      project: project.name,
      image: project.image,
      status: "ok",
      exists: true,
      file: toRepoRelative(absolute),
    };
  } catch {
    return {
      project: project.name,
      image: project.image,
      status: "missing-file",
      exists: false,
      file: toRepoRelative(absolute),
    };
  }
}
