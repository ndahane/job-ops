import type { DesignResumeTypstTemplate } from "@shared/types";
import { FileUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MAX_TYPST_TEMPLATE_BYTES = 1024 * 1024;

type DesignResumeTypstTemplateDialogProps = {
  open: boolean;
  template: DesignResumeTypstTemplate | null;
  saving: boolean;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { fileName?: string; source: string }) => Promise<boolean>;
  onDelete: () => void;
};

function formatTemplateBytes(byteSize: number): string {
  if (byteSize < 1024) return `${byteSize} B`;
  return `${Math.round(byteSize / 1024)} KB`;
}

function sourceByteSize(source: string): number {
  return new TextEncoder().encode(source).length;
}

export function DesignResumeTypstTemplateDialog({
  open,
  template,
  saving,
  deleting,
  onOpenChange,
  onSave,
  onDelete,
}: DesignResumeTypstTemplateDialogProps) {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSource(template?.source ?? "");
    setFileName(template?.fileName ?? null);
    setLocalError(null);
  }, [open, template]);

  const handleChooseFile = async (file: File) => {
    setLocalError(null);
    if (file.size > MAX_TYPST_TEMPLATE_BYTES) {
      setLocalError(
        `That file is too large (${formatTemplateBytes(file.size)}). The limit is 1 MB.`,
      );
      return;
    }
    try {
      const text = await file.text();
      setSource(text);
      setFileName(file.name);
    } catch {
      setLocalError("That file could not be read as text.");
    }
  };

  const handleSave = async () => {
    if (!source.trim()) {
      setLocalError(
        "Paste your Typst source below or choose a .typ file first.",
      );
      return;
    }
    const bytes = sourceByteSize(source);
    if (bytes > MAX_TYPST_TEMPLATE_BYTES) {
      setLocalError(
        `The source is too large (${formatTemplateBytes(bytes)}). The limit is 1 MB.`,
      );
      return;
    }
    const saved = await onSave({ fileName: fileName ?? undefined, source });
    if (saved) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto border-border/70 bg-background/95 px-6 pb-6 pt-6">
        <DialogHeader>
          <DialogTitle>Custom Typst template</DialogTitle>
          <DialogDescription>
            Import your own CV written in Typst. The source is compiled as-is
            for the preview and downloaded PDFs, so your original layout is
            preserved. Studio edits and per-job tailoring do not apply to this
            render. Advanced templates may also read the studio document via
            json("resume-data.json").
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {template ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Current template:{" "}
              <span className="font-medium text-foreground">
                {template.fileName}
              </span>{" "}
              · {formatTemplateBytes(template.byteSize)} · updated{" "}
              {new Date(template.updatedAt).toLocaleString()}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".typ"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  void handleChooseFile(file);
                }
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Choose .typ file
            </Button>
            <span className="text-xs text-muted-foreground">
              {fileName ? fileName : "Or paste your Typst source below."}
            </span>
          </div>

          <Textarea
            value={source}
            onChange={(event) => {
              setSource(event.currentTarget.value);
              setLocalError(null);
            }}
            rows={16}
            spellCheck={false}
            placeholder={"= Experience\n\n#grid(...)\n"}
            className="font-mono text-xs"
            aria-label="Typst source"
          />

          {localError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {localError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={!template || deleting || saving}
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Removing" : "Remove template"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving"
                : template
                  ? "Replace template"
                  : "Save template"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
