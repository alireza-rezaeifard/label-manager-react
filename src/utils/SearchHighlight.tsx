function SearchHighlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const testRegex = new RegExp(`^${escaped}$`, 'i');

  return (
    <>
      {parts.map((part, i) =>
        testRegex.test(part) ? <mark key={i}>{part}</mark> : part
      )}
    </>
  );
}

export default SearchHighlight;
