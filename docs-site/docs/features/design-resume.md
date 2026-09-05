---
id: design-resume
title: Resume Studio
description: Edit the local resume document that JobOps uses for tailoring, scoring, and PDF generation.
sidebar_position: 4
---

## What it is

Resume Studio is JobOps' local-first resume editor.

It stores an exact Reactive Resume v5 document inside JobOps. JobOps does not convert that document into a separate internal resume format. JobOps uses this local RR v5 document as the primary source of truth for:

- profile context
- project catalogs
- tailoring inputs
- scoring inputs
- PDF generation

## Why it exists

Depending on Reactive Resume for every profile lookup, project read, and PDF flow makes JobOps more fragile than it needs to be.

Resume Studio reduces that dependency by letting you:

- import from Reactive Resume once
- keep editing locally inside JobOps
- preserve the original Reactive Resume v5 structure
- export back out when needed

## How to use it

1. Open **Resume Studio** from the main navigation.
2. If this is your first time, click **Import from Reactive Resume**.
3. Edit the left-panel fields directly.
4. Use the sparkle button beside eligible fields when you want a focused AI draft.
5. Watch for the local save indicator in the header.
6. Use **Export** when you want the current Reactive Resume v5 JSON.

AI-assisted field editing is available for writing-heavy fields such as headline, summary, item names/titles/positions, rich descriptions, and skill keywords. It is not shown for contact details, URLs, picture settings, icons, toggles, or numeric style fields.

The AI assistant is ephemeral. Closing the field assistant clears that short conversation. Empty fields are filled automatically when the AI response arrives; fields that already contain content show an **Apply** action so you can review the suggestion before it changes the resume.

AI field editing uses the same LLM connection, tailoring model overrides, writing style, and output language settings used by resume tailoring. It edits the reusable baseline resume only; job-specific rewrites still belong in job tailoring and Ghostwriter.

When Resume Studio changes, ready jobs with system-generated PDFs are queued for automatic regeneration. Until the queue catches up, those jobs show a `PDF stale` indicator and keep the old PDF available as **View old PDF** / **Download old PDF**.

Current v1 scope:

- left-panel editing only
- local editing of the stored RR v5 document
- ephemeral AI-assisted editing for eligible fields
- export of the stored RR v5 document
- PDF preview and PDF download using the selected renderer

### Custom Typst templates

If you already maintain your CV as a Typst source file, Resume Studio can render your PDF from that source as-is:

1. In **Resume Studio**, set the template renderer to **Local Typst**.
2. Click **Manage template** next to the Typst theme selector.
3. Choose a `.typ` file or paste your Typst source, then **Save template**.

Saving a template stores it locally (one template per workspace, up to 1 MB), switches the Typst theme to **Custom (imported template)**, and re-renders the preview. Removing the template switches the theme back to **Classic**.

Behavior and limits:

- The PDF is compiled from your source exactly as written, so your original layout is preserved.
- Studio edits and per-job tailoring do **not** change this render; use the built-in themes if you want data-driven rendering.
- The normalized studio document is still written next to your template as `resume-data.json` (Typst-escaped), so an advanced template may read it with `json("resume-data.json")`.
- Custom templates are a self-hosted feature and are disabled in hosted mode.
- Compiling requires the Typst binary (bundled in Docker; otherwise install `typst` or set `TYPST_BIN`).

## Common problems

- Import button fails:
  Verify your Reactive Resume mode, URL, credentials, and selected base resume in **Settings**.
- You already had a local Resume Studio document from an older JobOps build:
  Re-import from a Reactive Resume v5 base resume. Older local documents are no longer auto-converted.
- Changes do not appear in a generated PDF:
  Ready jobs that already use system-generated PDFs are auto-queued for regeneration after Resume Studio edits. If a job shows `PDF stale`, JobOps is keeping the old PDF available while the new one is queued or regenerating.
- AI field editing fails:
  Check the LLM provider and tailoring model settings in **Settings**. The assistant uses the same model configuration as resume tailoring.
- Picture upload fails:
  Use `png`, `jpeg`, or `webp` images.
- Custom Typst template fails to compile:
  The preview shows the Typst compiler error. Fix the reported line in your source, then save the template again. Also make sure `typst` is installed (or `TYPST_BIN` is set) when you are not using Docker.
- You changed the upstream resume and want that copied over:
  Use **Re-import** to replace the local document with the current Reactive Resume base resume.

## Related pages

- [Reactive Resume](./reactive-resume)
- [Settings](./settings)
- [Orchestrator](./orchestrator)
