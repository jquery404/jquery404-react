import { ResearchCard } from '../components/Helper';

export default function ResearchSection({ research, homeResearch }) {
  if (!research || research.length === 0) return <p className='muted'>Loading research…</p>;

  const flattened = research.flatMap((item) => item.publications || []);

  let featured;
  if (homeResearch && homeResearch.length > 0) {
    featured = homeResearch
      .map((url) => flattened.find((item) => item.url === url || item.links?.project === url))
      .filter(Boolean);
  } else {
    featured = flattened.slice(0, 2);
  }

  return (
    <>
      {featured.map((item) => (
        <ResearchCard key={item.id || item.title} item={item} />
      ))}
    </>
  );
}
