/**
 * Emits schema.org JSON-LD. Rendered server-side so crawlers and answer-engine
 * fetchers (which usually don't execute JS) see it in the raw HTML.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Schema is built from our own code, not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}
