type Node = Record<string, unknown>;

export function JsonLd({ data }: { data: Node | Node[] }) {
  // Several items go in one @graph; top-level arrays break some JSON-LD readers.
  const doc = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data.map((node) => Object.fromEntries(Object.entries(node).filter(([k]) => k !== "@context"))) }
    : { "@context": "https://schema.org", ...data };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so data can't close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(doc).replace(/</g, "\\u003c") }}
    />
  );
}
