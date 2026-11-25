import fs from "node:fs/promises";
import path from "node:path";
import { paths, toRepoRelative } from "./paths.mjs";
import { assertSafeRead } from "./fileSafety.mjs";

const FIELD_PATTERN = /(\w+):\s*["']([^"']*)["']/g;
const ICON_PATTERN = /\bIcon:\s*([A-Za-z_$][\w$]*)/;
const MAX_VALIDATED_IMAGE_BYTES = 20 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IMAGE_FORMATS = new Map([
  [".png", { label: "PNG", matches: isValidPng }],
  [".jpg", { label: "JPEG", matches: isValidJpeg }],
  [".jpeg", { label: "JPEG", matches: isValidJpeg }],
  [".gif", { label: "GIF", matches: isValidGif }],
  [".webp", { label: "WebP", matches: isValidWebp }],
  [".avif", { label: "AVIF", matches: isValidAvif }],
]);

function isValidPng(buffer) {
  if (buffer.length < 45 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return false;
  let offset = 8;
  let sawIhdr = false;
  let sawIend = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) return false;
    const type = buffer.subarray(offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const typeName = type.toString("ascii");
    if (!sawIhdr) {
      if (typeName !== "IHDR" || length !== 13 || data.readUInt32BE(0) === 0 || data.readUInt32BE(4) === 0) return false;
      sawIhdr = true;
    }
    if (typeName === "IEND") {
      if (length !== 0 || chunkEnd !== buffer.length) return false;
      sawIend = true;
      break;
    }
    offset = chunkEnd;
  }
  return sawIhdr && sawIend;
}

function isValidJpeg(buffer) {
  if (buffer.length < 8 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer.at(-2) !== 0xff || buffer.at(-1) !== 0xd9) return false;
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  while (offset + 4 <= buffer.length - 2) {
    if (buffer[offset] !== 0xff) {
      if (!sawScan) return false;
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9) return sawFrame && sawScan;
    if (offset + 2 > buffer.length) return false;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return false;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (length < 8 || buffer.readUInt16BE(offset + 3) === 0 || buffer.readUInt16BE(offset + 5) === 0) return false;
      sawFrame = true;
    }
    if (marker === 0xda) sawScan = true;
    offset += length;
  }
  return sawFrame && sawScan;
}

function isValidGif(buffer) {
  return buffer.length >= 13
    && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")
    && buffer.readUInt16LE(6) > 0
    && buffer.readUInt16LE(8) > 0
    && buffer.at(-1) === 0x3b;
}

function isValidWebp(buffer) {
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP"
    && buffer.readUInt32LE(4) + 8 === buffer.length;
}

function isValidAvif(buffer) {
  if (buffer.length < 16 || buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const boxLength = buffer.readUInt32BE(0);
  if (boxLength < 16 || boxLength > buffer.length) return false;
  const brands = [];
  for (let offset = 8; offset + 4 <= boxLength; offset += 4) brands.push(buffer.subarray(offset, offset + 4).toString("ascii"));
  return brands.some((brand) => brand === "avif" || brand === "avis");
}

async function getImageContentStatus(absolute, imagePath) {
  const extension = path.extname(imagePath).toLowerCase();
  const format = IMAGE_FORMATS.get(extension);

  if (!format) {
    return {
      status: "unsupported-image-type",
      issue: `Screenshot image paths must use a supported image extension (.png, .jpg, .jpeg, .gif, .webp, or .avif); received ${extension || "no extension"}.`,
    };
  }

  const info = await fs.stat(assertSafeRead(absolute));
  if (info.size > MAX_VALIDATED_IMAGE_BYTES) {
    return {
      status: "image-too-large-to-validate",
      issue: "Screenshot image exceeds the 20 MB local validation limit; optimize it before publishing.",
    };
  }
  const contents = await fs.readFile(assertSafeRead(absolute));
  if (format.matches(contents)) return { status: "ok" };

  return {
    status: "invalid-image-content",
    issue: `Screenshot image content does not match its ${format.label} file extension or valid container structure; replace it with a rendered ${format.label} image before publishing.`,
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

function describeUnsupportedLabSurface(source) {
  const redirectTarget = source.match(/\bredirect\(\s*["']([^"']+)["']\s*\)/)?.[1] ?? null;
  const targetFile = toRepoRelative(paths.labPage);

  return {
    status: "migration-required",
    targetFile,
    redirectTarget,
    reason: redirectTarget
      ? `The legacy Lab page redirects to ${redirectTarget} and no longer contains a publishable projects array.`
      : "The configured Lab page no longer contains the supported `const projects = [` card registry.",
    ownerNextStep:
      "Choose a current portfolio card registry before publishing. Keep this server in read-only diagnostic mode until its target schema and controlled-apply safety checks are migrated together.",
  };
}

export async function inspectLabSurface() {
  const source = await readLabSource();

  if (!source.includes("const projects = [")) {
    return describeUnsupportedLabSurface(source);
  }

  return {
    status: "ready",
    targetFile: toRepoRelative(paths.labPage),
    redirectTarget: null,
    reason: "The configured Lab page contains the supported projects card registry.",
    ownerNextStep: "Use list_lab_projects to inspect the current cards and publish readiness.",
  };
}

const MIGRATION_CANDIDATES = [
  {
    id: "work-independent-projects",
    targetFile: "app/work/page.tsx",
    publicRoute: "/work#projects",
    arrayDeclaration: "const projects = [",
    renderExpression: "projects.map",
    expectedFields: ["name", "href", "description"],
    routeField: "href",
    description: "Independent projects shown on the Work page.",
  },
  {
    id: "tools-catalog",
    targetFile: "app/tools/page.tsx",
    publicRoute: "/tools",
    arrayDeclaration: "const TOOLS = [",
    renderExpression: "TOOLS.map",
    expectedFields: ["slug", "name", "tagline", "status", "icon"],
    routeFromSlug: "tools",
    description: "Public AI tools catalog.",
  },
];

function hasObjectField(source, field) {
  return new RegExp(`\\b${field}\\s*:`).test(source);
}

function extractArrayBody(source, declaration) {
  const start = source.indexOf(declaration);
  if (start === -1) return null;
  const arrayStart = source.indexOf("[", start);
  let depth = 0;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) return source.slice(arrayStart + 1, index);
  }

  return null;
}

function extractCandidateEntries(source, declaration, expectedFields) {
  const arrayBody = extractArrayBody(source, declaration);
  if (arrayBody == null) return [];

  return (arrayBody.match(/\{[\s\S]*?\}/g) ?? [])
    .map((block) => {
      const entry = {};
      for (const field of expectedFields) {
        const value = block.match(new RegExp(`\\b${field}\\s*:\\s*["']([^"']*)["']`))?.[1];
        if (value != null) entry[field] = value;
      }
      return entry;
    })
    .filter((entry) => Object.keys(entry).length > 0);
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value);
}

function localCandidateRouteFile(route) {
  if (!route || !route.startsWith("/")) return null;
  if (route.includes("\\") || /[?\0]/.test(route)) return null;

  const pathname = route.split("#", 1)[0];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) return null;
  return segments.length > 0 ? `app/${segments.join("/")}/page.tsx` : null;
}

function candidateEntryRoute(candidate, entry) {
  if (candidate.routeField) return entry[candidate.routeField] ?? "";
  if (candidate.routeFromSlug && entry.slug) return `/${candidate.routeFromSlug}/${entry.slug}`;
  return "";
}

async function inspectCandidateRoutes(candidate, entries) {
  const checks = await Promise.all(entries.map(async (entry) => {
    const route = candidateEntryRoute(candidate, entry);
    const label = entry.name ?? entry.slug ?? "Unnamed entry";

    if (!route) return { entry: label, route: "", status: "missing-route", file: null };
    if (isExternalUrl(route)) return { entry: label, route, status: "external-url-not-checked", file: null };

    const routeFile = localCandidateRouteFile(route);
    if (!routeFile) return { entry: label, route, status: "invalid-route-path", file: null };

    const absolute = path.resolve(paths.repoRoot, routeFile);
    const relativeToApp = path.relative(paths.appDir, absolute);
    if (relativeToApp === ".." || relativeToApp.startsWith(`..${path.sep}`)) {
      return { entry: label, route, status: "invalid-route-path", file: null };
    }

    try {
      await fs.access(assertSafeRead(absolute));
      return { entry: label, route, status: "ok", file: toRepoRelative(absolute) };
    } catch {
      return { entry: label, route, status: "missing-route-file", file: routeFile };
    }
  }));

  const counts = checks.reduce((summary, check) => {
    summary.total += 1;
    if (check.status === "ok") summary.ready += 1;
    else if (check.status === "external-url-not-checked") summary.external += 1;
    else summary.blocked += 1;
    return summary;
  }, { total: 0, ready: 0, external: 0, blocked: 0 });

  return { ...counts, samples: checks.slice(0, 3) };
}

/**
 * Reports the known post-Lab portfolio surfaces for an owner to review. This is
 * deliberately discovery-only: it never selects a target or makes either
 * surface compatible with the legacy controlled-apply workflow.
 */
export async function inspectPortfolioMigrationOptions() {
  const surface = await inspectLabSurface();
  if (surface.status === "ready") {
    return {
      status: "legacy-surface-ready",
      writeEnabled: false,
      candidates: [],
      ownerNextStep: "The legacy Lab registry is still available. Use inspect_lab_surface and the existing publish workflow; no migration choice is needed.",
    };
  }

  const candidates = await Promise.all(MIGRATION_CANDIDATES.map(async (candidate) => {
    const absolute = path.join(paths.repoRoot, candidate.targetFile);
    let source;
    try {
      source = await fs.readFile(assertSafeRead(absolute), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        return {
          ...candidate,
          status: "not-found",
          compatibleWithLegacyPublisher: false,
          detectedFields: [],
          reason: "The candidate source file is not present in this checkout.",
        };
      }
      throw error;
    }

    const hasRegistry = source.includes(candidate.arrayDeclaration);
    const hasRenderer = source.includes(candidate.renderExpression);
    const detectedFields = candidate.expectedFields.filter((field) => hasObjectField(source, field));
    const entries = extractCandidateEntries(source, candidate.arrayDeclaration, candidate.expectedFields);
    const routeCoverage = await inspectCandidateRoutes(candidate, entries);
    const status = hasRegistry && hasRenderer ? "candidate" : "not-detected";

    return {
      ...candidate,
      status,
      compatibleWithLegacyPublisher: false,
      detectedFields,
      entryCount: entries.length,
      sampleEntries: entries.slice(0, 3),
      routeCoverage,
      reason: status === "candidate"
        ? "A project-like registry and its renderer were found, but its schema differs from the legacy Lab contract."
        : "The expected registry and renderer pattern were not both found in this checkout.",
    };
  }));

  return {
    status: "migration-required",
    writeEnabled: false,
    legacySurface: surface,
    candidates,
    ownerNextStep: "Choose one candidate deliberately, then migrate its parser, artifact format, tests, and controlled-apply safeguards together. This diagnostic does not select or modify a publishing target.",
  };
}

export async function readLabSource() {
  return fs.readFile(assertSafeRead(paths.labPage), "utf8");
}

export async function listLabProjects() {
  const source = await readLabSource();
  const surface = source.includes("const projects = [")
    ? null
    : describeUnsupportedLabSurface(source);
  if (surface) {
    throw new Error(
      `Portfolio Lab target unavailable: ${surface.reason} ${surface.ownerNextStep}`,
    );
  }
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
