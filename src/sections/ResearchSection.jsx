import { Link } from 'react-router-dom';
import { ResearchCard } from '../components/Helper';

export default function ResearchSection({ research }) {
  if (!research || research.length === 0) return <p>Loading research data...</p>;
  const flattened = research.flatMap((item) => item.publications);
  return (
    <>
      {flattened.slice(0, 2).map((item) => (
        <ResearchCard key={item.id || item.title} item={item} />
      ))}
      <Link className='px-4' to='/research'>
        <small>Show All Research...</small>
      </Link>
    </>
  );
}
