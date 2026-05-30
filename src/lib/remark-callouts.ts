import type { Root } from "mdast";
import { visit } from "unist-util-visit";

const CALLOUT_MAP: Record<string, string> = {
  cta: "cta-box",
  tip: "tip-box",
  warning: "warning-box",
  checklist: "checklist",
};

type DirectiveNode = {
  type: string;
  name?: string;
  data?: Record<string, unknown>;
  attributes?: Record<string, string>;
  children?: unknown[];
};

export function remarkCallouts() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: Root) => {
    visit(tree, (node: any) => {
      const d = node as DirectiveNode;
      if (
        d.type !== "containerDirective" &&
        d.type !== "leafDirective"
      ) {
        return;
      }

      const cssClass = CALLOUT_MAP[d.name ?? ""];
      if (!cssClass) return;

      const data = d.data || (d.data = {});
      data.hName = "div";
      data.hProperties = { className: cssClass };

      if (d.attributes?.["label"]) {
        const label = d.attributes["label"];
        const children = d.children ?? [];
        d.children = [
          {
            type: "paragraph",
            data: { hProperties: { className: "callout-label" } },
            children: [{ type: "strong", children: [{ type: "text", value: label }] }],
          },
          ...children,
        ];
        delete d.attributes["label"];
      }
    });
  };
}
