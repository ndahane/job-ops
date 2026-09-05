import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe.sequential("design resume typst template service", () => {
  const originalEnv = { ...process.env };
  let tempDir = "";
  let closeDb: (() => void) | null = null;

  beforeEach(async () => {
    vi.resetModules();
    tempDir = await mkdtemp(join(tmpdir(), "job-ops-typst-template-test-"));
    process.env = {
      ...originalEnv,
      DATA_DIR: tempDir,
      NODE_ENV: "test",
    };

    await import("@server/db/migrate");
    const dbModule = await import("@server/db");
    closeDb = dbModule.closeDb;

    await dbModule.db.insert(dbModule.schema.tenants).values({
      id: "tenant-other",
      name: "Other Tenant",
      slug: "tenant-other",
    });
  });

  afterEach(async () => {
    closeDb?.();
    closeDb = null;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
    process.env = { ...originalEnv };
  });

  async function withUser<T>(
    tenantId: string,
    userId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const { runWithRequestContext } = await import("@infra/request-context");
    return runWithRequestContext(
      {
        requestId: `req-${tenantId}-${userId}`,
        tenantId,
        userId,
        username: userId,
      },
      fn,
    );
  }

  it("saves, returns, and replaces the current template", async () => {
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      expect(await service.getDesignResumeTypstTemplate()).toBeNull();

      const saved = await service.saveDesignResumeTypstTemplate({
        fileName: "my cv.typ",
        source: "= Hello\n",
      });
      expect(saved.fileName).toBe("my_cv.typ");
      expect(saved.source).toBe("= Hello\n");
      expect(saved.byteSize).toBe(Buffer.byteLength("= Hello\n", "utf8"));

      const replaced = await service.saveDesignResumeTypstTemplate({
        source: "= Version 2\n",
      });
      expect(replaced.fileName).toBe("resume.typ");

      const current = await service.getDesignResumeTypstTemplate();
      expect(current?.source).toBe("= Version 2\n");
    });
  });

  it("rejects empty and oversized sources", async () => {
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      await expect(
        service.saveDesignResumeTypstTemplate({ source: "   \n  " }),
      ).rejects.toThrow(/cannot be empty/i);

      await expect(
        service.saveDesignResumeTypstTemplate({
          source: "x".repeat(1024 * 1024 + 1),
        }),
      ).rejects.toThrow(/too large/i);
    });
  });

  it("keeps templates scoped to their tenant", async () => {
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      await service.saveDesignResumeTypstTemplate({
        fileName: "a.typ",
        source: "= Tenant default\n",
      });
    });

    await withUser("tenant-other", "user-b", async () => {
      expect(await service.getDesignResumeTypstTemplate()).toBeNull();

      await service.saveDesignResumeTypstTemplate({
        fileName: "b.typ",
        source: "= Tenant other\n",
      });
      expect((await service.getDesignResumeTypstTemplate())?.fileName).toBe(
        "b.typ",
      );
    });

    await withUser("tenant_default", "user-a", async () => {
      expect((await service.getDesignResumeTypstTemplate())?.fileName).toBe(
        "a.typ",
      );
    });
  });

  it("deletes the current template", async () => {
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      await service.saveDesignResumeTypstTemplate({
        source: "= Bye\n",
      });
      await service.removeDesignResumeTypstTemplate();
      expect(await service.getDesignResumeTypstTemplate()).toBeNull();
      await expect(
        service.removeDesignResumeTypstTemplate(),
      ).resolves.toBeUndefined();
    });
  });

  it("refuses custom templates in hosted mode", async () => {
    process.env.JOBOPS_APP_MODE = "hosted";
    process.env.JOBOPS_HOSTED_TENANT_ID = "tenant_default";
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      await expect(
        service.saveDesignResumeTypstTemplate({ source: "= Hosted\n" }),
      ).rejects.toThrow(/not available in hosted mode/i);
      await expect(service.removeDesignResumeTypstTemplate()).rejects.toThrow(
        /not available in hosted mode/i,
      );
    });
  });

  it("requireDesignResumeTypstSource returns the source or throws clearly", async () => {
    const service = await import("./typst-template");

    await withUser("tenant_default", "user-a", async () => {
      await expect(service.requireDesignResumeTypstSource()).rejects.toThrow(
        /no custom typst template has been imported/i,
      );

      await service.saveDesignResumeTypstTemplate({
        fileName: "final.typ",
        source: "= Ready\n",
      });
      await expect(service.requireDesignResumeTypstSource()).resolves.toBe(
        "= Ready\n",
      );
    });
  });
});
