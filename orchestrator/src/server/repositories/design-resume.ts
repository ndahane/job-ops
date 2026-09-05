import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index";
import {
  getPrivateDataScope,
  privateDataScopeFilter,
} from "../tenancy/private-scope";

const {
  designResumeAssets,
  designResumeDocuments,
  designResumeTypstTemplates,
} = schema;

function documentsScopeFilter() {
  return privateDataScopeFilter(designResumeDocuments);
}

function assetsScopeFilter() {
  return privateDataScopeFilter(designResumeAssets);
}

function typstTemplatesScopeFilter() {
  return privateDataScopeFilter(designResumeTypstTemplates);
}

export async function getLatestDesignResumeDocument() {
  const [row] = await db
    .select()
    .from(designResumeDocuments)
    .where(documentsScopeFilter())
    .orderBy(desc(designResumeDocuments.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function getDesignResumeDocumentById(id: string) {
  const [row] = await db
    .select()
    .from(designResumeDocuments)
    .where(and(documentsScopeFilter(), eq(designResumeDocuments.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listDesignResumeAssets(documentId: string) {
  return db
    .select()
    .from(designResumeAssets)
    .where(
      and(assetsScopeFilter(), eq(designResumeAssets.documentId, documentId)),
    )
    .orderBy(desc(designResumeAssets.updatedAt));
}

export async function getDesignResumeAssetById(id: string) {
  const [row] = await db
    .select()
    .from(designResumeAssets)
    .where(and(assetsScopeFilter(), eq(designResumeAssets.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getDesignResumeAssetByIdAnyTenant(id: string) {
  const [row] = await db
    .select()
    .from(designResumeAssets)
    .where(eq(designResumeAssets.id, id))
    .limit(1);
  return row ?? null;
}

export async function upsertDesignResumeDocument(input: {
  id: string;
  title: string;
  resumeJson: Record<string, unknown>;
  revision: number;
  sourceResumeId: string | null;
  sourceMode: string | null;
  importedAt: string | null;
  createdAt?: string;
  updatedAt: string;
}) {
  const scope = getPrivateDataScope();
  const existing = await getDesignResumeDocumentById(input.id);
  if (existing) {
    await db
      .update(designResumeDocuments)
      .set({
        title: input.title,
        resumeJson: input.resumeJson,
        revision: input.revision,
        sourceResumeId: input.sourceResumeId,
        sourceMode: input.sourceMode,
        importedAt: input.importedAt,
        updatedAt: input.updatedAt,
      })
      .where(
        and(documentsScopeFilter(), eq(designResumeDocuments.id, input.id)),
      );
  } else {
    await db.insert(designResumeDocuments).values({
      id: input.id,
      tenantId: scope.tenantId,
      userId: scope.userId,
      title: input.title,
      resumeJson: input.resumeJson,
      revision: input.revision,
      sourceResumeId: input.sourceResumeId,
      sourceMode: input.sourceMode,
      importedAt: input.importedAt,
      createdAt: input.createdAt ?? input.updatedAt,
      updatedAt: input.updatedAt,
    });
  }

  return getDesignResumeDocumentById(input.id);
}

export async function insertDesignResumeAsset(input: {
  id: string;
  documentId: string;
  kind: "picture";
  originalName: string;
  mimeType: string;
  byteSize: number;
  storagePath: string;
  createdAt?: string;
  updatedAt: string;
}) {
  const scope = getPrivateDataScope();
  await db.insert(designResumeAssets).values({
    id: input.id,
    tenantId: scope.tenantId,
    userId: scope.userId,
    documentId: input.documentId,
    kind: input.kind,
    originalName: input.originalName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    storagePath: input.storagePath,
    createdAt: input.createdAt ?? input.updatedAt,
    updatedAt: input.updatedAt,
  });

  return getDesignResumeAssetById(input.id);
}

export async function deleteDesignResumeAsset(id: string) {
  await db
    .delete(designResumeAssets)
    .where(and(assetsScopeFilter(), eq(designResumeAssets.id, id)));
}

export async function deleteDesignResumeAssetsForDocument(documentId: string) {
  await db
    .delete(designResumeAssets)
    .where(
      and(assetsScopeFilter(), eq(designResumeAssets.documentId, documentId)),
    );
}

export async function deleteDesignResumeDocument(id: string) {
  await db
    .delete(designResumeDocuments)
    .where(and(documentsScopeFilter(), eq(designResumeDocuments.id, id)));
}

export async function findDesignResumeAssetForDocument(args: {
  documentId: string;
  kind: "picture";
}) {
  const [row] = await db
    .select()
    .from(designResumeAssets)
    .where(
      and(
        eq(designResumeAssets.documentId, args.documentId),
        assetsScopeFilter(),
        eq(designResumeAssets.kind, args.kind),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getLatestDesignResumeTypstTemplate() {
  const [row] = await db
    .select()
    .from(designResumeTypstTemplates)
    .where(typstTemplatesScopeFilter())
    .orderBy(desc(designResumeTypstTemplates.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function upsertDesignResumeTypstTemplate(input: {
  id: string;
  fileName: string;
  content: string;
  byteSize: number;
  createdAt?: string;
  updatedAt: string;
}) {
  const scope = getPrivateDataScope();
  const existing = await getLatestDesignResumeTypstTemplate();
  if (existing) {
    await db
      .update(designResumeTypstTemplates)
      .set({
        fileName: input.fileName,
        content: input.content,
        byteSize: input.byteSize,
        updatedAt: input.updatedAt,
      })
      .where(
        and(
          typstTemplatesScopeFilter(),
          eq(designResumeTypstTemplates.id, existing.id),
        ),
      );
  } else {
    await db.insert(designResumeTypstTemplates).values({
      id: input.id,
      tenantId: scope.tenantId,
      userId: scope.userId,
      fileName: input.fileName,
      content: input.content,
      byteSize: input.byteSize,
      createdAt: input.createdAt ?? input.updatedAt,
      updatedAt: input.updatedAt,
    });
  }

  return getLatestDesignResumeTypstTemplate();
}

export async function deleteDesignResumeTypstTemplate() {
  await db
    .delete(designResumeTypstTemplates)
    .where(typstTemplatesScopeFilter());
}
