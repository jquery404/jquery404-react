import { Link } from 'react-router-dom';
import { BlogCard } from '../components/Helper';

export default function BlogSection({ inthelab }) {
  if (!inthelab || inthelab.length === 0) return <p>Loading blog data...</p>;

  return (
    <>
      {inthelab.slice(0, 2).map((item) => (
        <BlogCard key={item.id} item={item} />
      ))}
      <Link to="/blog">
        <small>Show All Posts...</small>
      </Link>
    </>
  );
}
