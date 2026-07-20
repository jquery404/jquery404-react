import { ResearchCard } from '../components/Helper';

export default function ResearchSection({ research }) {
  if (!research || research.length === 0) return <p className='muted'>Loading research…</p>;
  const flattened = research.flatMap((item) => item.publications);
  return (
    <>
      {flattened.slice(0, 2).map((item) => (
        <ResearchCard key={item.id || item.title} item={item} />
      ))}
    </>
  );
}
