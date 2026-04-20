import ReactMarkdown from "react-markdown";

export default function MarkdownArticle({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        components={{
          a: ({ href, ...props }) => {
            const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
            return (
              <a
                {...props}
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
              />
            );
          },
          h1: ({ ...props }) => (
            <h1
              className="mt-10 text-[length:var(--site-h3)] leading-[0.98] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="mt-10 text-[length:var(--site-h4)] leading-[1.02] tracking-[-0.03em] text-[#212120] text-[color:var(--site-black)]"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="mt-8 text-[length:var(--site-h5)] leading-[1.08] tracking-[-0.02em] text-[#212120] text-[color:var(--site-black)]"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="mt-5 text-[length:var(--site-h6)] leading-[1.9] text-[#4f5560] text-[color:var(--site-text-muted)]" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul
              className="mt-5 list-disc space-y-3 pl-6 text-[length:var(--site-h6)] text-[#4f5560] text-[color:var(--site-text-muted)]"
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <ol
              className="mt-5 list-decimal space-y-3 pl-6 text-[length:var(--site-h6)] text-[#4f5560] text-[color:var(--site-text-muted)]"
              {...props}
            />
          ),
          li: ({ ...props }) => <li className="leading-[1.8]" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="mt-6 border-l-4 border-[#dbe2e8] border-[color:var(--site-border-soft)] pl-5 text-[length:var(--site-body-large)] leading-[1.7] text-[#212120] text-[color:var(--site-black)]"
              {...props}
            />
          ),
          hr: ({ ...props }) => <hr className="mt-10 border-[#dbe2e8]" {...props} />,
          strong: ({ ...props }) => <strong className="font-bold text-[#212120] text-[color:var(--site-black)]" {...props} />,
          code: ({ ...props }) => (
            <code
              className="rounded bg-[#eef3f7] bg-[color:var(--site-gray-light-5)] px-1.5 py-0.5 font-mono text-[0.9em] text-[#0A1628] text-[color:var(--site-black)]"
              {...props}
            />
          ),
          pre: ({ ...props }) => (
            <pre
              className="mt-6 overflow-x-auto rounded-[var(--site-radius-corner)] bg-[#0A1628] bg-[color:var(--site-black)] px-[var(--site-card-padding-tight)] py-[var(--site-button-py-sm)] text-[length:var(--site-paragraph)] text-white"
              {...props}
            />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
