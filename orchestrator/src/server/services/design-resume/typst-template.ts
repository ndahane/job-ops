import { badRequest, forbidden } from "@infra/errors";
import { logger } from "@infra/logger";
import { createId } from "@paralleldrive/cuid2";
import { getJobOpsAppConfig } from "@server/config/app-mode";
import {
  deleteDesignResumeTypstTemplate,
  getLatestDesignResumeTypstTemplate,
  upsertDesignResumeTypstTemplate,
} from "@server/repositories/design-resume";
import type { DesignResumeTypstTemplate } from "@shared/types";

const MAX_TYPST_TEMPLATE_BYTES = 1024 * 1024;
const DEFAULT_TEMPLATE_FILE_NAME = "resume.typ";
const MAX_TEMPLATE_FILE_NAME_LENGTH = 120;

type DesignResumeTypstTemplateRow = {
  fileName: string;
  content: string;
  byteSize: number;
  createdAt: string;
  updatedAt: string;
};

function toTemplate(
  row: DesignResumeTypstTemplateRow,
): DesignResumeTypstTemplate {
  return {
    fileName: row.fileName,
    source: row.content,
    byteSize: row.byteSize,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sanitizeTemplateFileName(raw: string | undefined): string {
  const cleaned = (raw ?? "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, MAX_TEMPLATE_FILE_NAME_LENGTH)
    .trim();

  if (!cleaned || cleaned === ".typ") {
    return DEFAULT_TEMPLATE_FILE_NAME;
  }
  return cleaned.toLowerCase().endsWith(".typ") ? cleaned : `${cleaned}.typ`;
}

function assertCustomTemplatesAllowed(): void {
  if (getJobOpsAppConfig().appMode === "hosted") {
    throw forbidden("Custom Typst templates are not available in hosted mode.");
  }
}

export async function getDesignResumeTypstTemplate(): Promise<DesignResumeTypstTemplate | null> {
  const row = await getLatestDesignResumeTypstTemplate();
  return row ? toTemplate(row) : null;
}

export async function saveDesignResumeTypstTemplate(input: {
  fileName?: string;
  source: string;
}): Promise<DesignResumeTypstTemplate> {
  assertCustomTemplatesAllowed();

  const source = typeof input.source === "string" ? input.source : "";
  if (!source.trim()) {
    throw badRequest("Typst template source cannot be empty.");
  }

  const byteSize = Buffer.byteLength(source, "utf8");
  if (byteSize > MAX_TYPST_TEMPLATE_BYTES) {
    throw badRequest(
      `Typst template is too large (${byteSize} bytes). The limit is ${MAX_TYPST_TEMPLATE_BYTES} bytes.`,
    );
  }

  const fileName = sanitizeTemplateFileName(input.fileName);
  const now = new Date().toISOString();
  const row = await upsertDesignResumeTypstTemplate({
    id: createId(),
    fileName,
    content: source,
    byteSize,
    updatedAt: now,
  });

  if (!row) {
    throw new Error("Failed to persist the custom Typst template.");
  }

  logger.info("Design resume custom Typst template saved", {
    fileName,
    byteSize,
  });
  return toTemplate(row);
}

export async function removeDesignResumeTypstTemplate(): Promise<void> {
  assertCustomTemplatesAllowed();
  await deleteDesignResumeTypstTemplate();
  logger.info("Design resume custom Typst template deleted");
}

export async function requireDesignResumeTypstSource(): Promise<string> {
  const template = await getLatestDesignResumeTypstTemplate();
  const source = template?.content.trim();
  if (!source) {
    throw badRequest(
      "The Custom Typst theme is selected but no custom Typst template has been imported yet. Import one from Resume Studio.",
    );
  }
  return template.content;
}
