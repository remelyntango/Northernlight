import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cx } from "@/lib/utils";

/**
 * Renders user-authored Markdown.
 *
 * Sanitisation is non-negotiable: the body comes from members, so raw HTML has
 * to be filtered before it reaches the DOM. `rehype-sanitize` runs on the
 * generated tree with a schema allowlist, which is why `dangerouslySetInnerHTML`
 * never appears anywhere in this app.
 *
 * The same component renders both the published page and the editor preview, so
 * what an author sees while writing is what readers get.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      // Force safe link behaviour regardless of what the author typed.
      ["target", "_blank"],
      ["rel", "nofollow noopener noreferrer"],
    ],
    img: [...(defaultSchema.attributes?.img ?? []), "loading", "alt", "src"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["http", "https"],
    href: ["http", "https", "mailto"],
  },
};

export function Prose({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div className={cx("prose-nordlys", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="nofollow noopener noreferrer">
              {children}
            </a>
          ),
          // eslint-disable-next-line @next/next/no-img-element
          img: (props) => <img {...props} loading="lazy" alt={props.alt ?? ""} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Compact renderer for comments: same sanitising pipeline, tighter type, and
 * headings are downgraded so a commenter can't shout over the article.
 */
export function CommentProse({ markdown }: { markdown: string }) {
  return (
    <div className="prose-nordlys text-[14.5px] leading-[1.55] [&>*+*]:mt-2 [&_blockquote]:my-3 [&_blockquote]:text-[15px] [&_h2]:text-[17px] [&_h3]:text-[16px] [&_h4]:text-[15px] [&_pre]:text-[13px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          h1: ({ children }) => <h4>{children}</h4>,
          h2: ({ children }) => <h4>{children}</h4>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="nofollow noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
