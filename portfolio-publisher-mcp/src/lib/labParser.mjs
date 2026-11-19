import fs from "node:fs/promises";
import path from "node:path";
import { paths, toRepoRelative } from "./paths.mjs";
import { assertSafeRead } from "./fileSafety.mjs";

const FIELD_PATTERN = /(\w+):\s*["']([^"']*)["']/g;
const ICON_PATTERN = /\bIcon:\s*([A-Za-z_$][\w$]*)/;
const IMAGE_FORMATS = new Map([
  [".png", { label: "PNG", matches: (header) => header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  [".jpg", { label: "JPEG", matches: (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff }],
  [".jpeg", { label: "JPEG", matches: (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff }],
  [".gif", { label: "GIF", matches: (header) => header.subarray(0, 6).toString("ascii") === "GIF87a" || header.subarray(0, 6).toString("ascii") === "GIF89a" }],
  [".webp", { label: "WebP", matches: (header) => header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP" }],
  [".avif", { label: "AVIF", matches: (header) => header.subarray(4, 8).toString("ascii") === "ftyp" && header.subarray(8, 12).toString("ascii").startsWith("avi") }],
]);

async function getImageContentStatus(absolute, imagePath) {
  const extension = path.extname(imagePath).toLowerCase();
  const format = IMAGE_FORMATS.get(extension);

  if (!format) {
    return {
      status: "unsupported-image-type",
      issue: `Screenshot image paths must use a supported image extension (.png, .jpg, .jpeg, .gif, .webp, or .avif); received ${extension || "no extension"}.`,
    };
  }

  const handle = await fs.open(assertSafeRead(absolute), "r");
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (format.matches(header.subarray(0, bytesRead))) return { status: "ok" };
  } finally {
    await handle.close();
  }

  return {
    status: "invalid-image-content",
    issue: `Screenshot image content does not match its ${format.label} file extension; replace it with a rendered ${format.label} image before publishing.`,
  };
}

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
    icon: block.match(ICON_PATTERN)?.[1] ?? "",
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

  const normalized = project.image.replace(/^\/+/, "");
  const absolute = path.resolve(paths.publicDir, normalized);
  const relativeToPublic = path.relative(paths.publicDir, absolute);
  const escapesPublic = relativeToPublic === ".." || relativeToPublic.startsWith(`..${path.sep}`);
  const hasUnsupportedUrlSyntax = project.image.includes("\\") || /[?#\0]/.test(project.image);

  if (escapesPublic || hasUnsupportedUrlSyntax) {
    return {
      project: project.name,
      image: project.image,
      status: "invalid-image-path",
      exists: false,
      file: null,
      issue: "Screenshot image paths must resolve to a file inside the public directory.",
    };
  }

  try {
    const metadata = await fs.lstat(assertSafeRead(absolute));
    if (metadata.isSymbolicLink()) {
      return {
        project: project.name,
        image: project.image,
        status: "symlink-not-allowed",
        exists: false,
        file: toRepoRelative(absolute),
        issue: "Screenshot image paths must point directly to a regular file inside the public directory; symbolic links are not allowed.",
      };
    }
    if (!metadata.isFile()) {
      return {
        project: project.name,
        image: project.image,
        status: "not-a-file",
        exists: false,
        file: toRepoRelative(absolute),
        issue: "Screenshot image paths must point to a regular file inside the public directory.",
      };
    }
    if (metadata.size === 0) {
      return {
        project: project.name,
        image: project.image,
        status: "empty-file",
        exists: false,
        file: toRepoRelative(absolute),
        issue: "Screenshot image file is empty; replace it with a rendered image before publishing.",
      };
    }
    const content = await getImageContentStatus(absolute, project.image);
    if (content.status !== "ok") {
      return {
        project: project.name,
        image: project.image,
        exists: false,
        file: toRepoRelative(absolute),
        size: metadata.size,
        ...content,
      };
    }
    return {
      project: project.name,
      image: project.image,
      status: "ok",
      exists: true,
      file: toRepoRelative(absolute),
      size: metadata.size,
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
