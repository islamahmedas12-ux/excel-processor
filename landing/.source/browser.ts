// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"async-jobs.mdx": () => import("../content/docs/async-jobs.mdx?collection=docs"), "authentication.mdx": () => import("../content/docs/authentication.mdx?collection=docs"), "batch-edit.mdx": () => import("../content/docs/batch-edit.mdx?collection=docs"), "edit-cells.mdx": () => import("../content/docs/edit-cells.mdx?collection=docs"), "export-pdf.mdx": () => import("../content/docs/export-pdf.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "insert-image-qr.mdx": () => import("../content/docs/insert-image-qr.mdx?collection=docs"), "merge-pdf.mdx": () => import("../content/docs/merge-pdf.mdx?collection=docs"), "read-cells.mdx": () => import("../content/docs/read-cells.mdx?collection=docs"), "run-formulas.mdx": () => import("../content/docs/run-formulas.mdx?collection=docs"), "templates.mdx": () => import("../content/docs/templates.mdx?collection=docs"), "upload-files.mdx": () => import("../content/docs/upload-files.mdx?collection=docs"), "verify-documents.mdx": () => import("../content/docs/verify-documents.mdx?collection=docs"), }),
};
export default browserCollections;