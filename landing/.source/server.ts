// @ts-nocheck
import * as __fd_glob_13 from "../content/docs/verify-documents.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/upload-files.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/templates.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/run-formulas.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/read-cells.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/merge-pdf.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/insert-image-qr.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/export-pdf.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/edit-cells.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/batch-edit.mdx?collection=docs"
import * as __fd_glob_2 from "../content/docs/authentication.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/async-jobs.mdx?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, }, {"async-jobs.mdx": __fd_glob_1, "authentication.mdx": __fd_glob_2, "batch-edit.mdx": __fd_glob_3, "edit-cells.mdx": __fd_glob_4, "export-pdf.mdx": __fd_glob_5, "index.mdx": __fd_glob_6, "insert-image-qr.mdx": __fd_glob_7, "merge-pdf.mdx": __fd_glob_8, "read-cells.mdx": __fd_glob_9, "run-formulas.mdx": __fd_glob_10, "templates.mdx": __fd_glob_11, "upload-files.mdx": __fd_glob_12, "verify-documents.mdx": __fd_glob_13, });