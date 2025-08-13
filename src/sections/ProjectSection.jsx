import { Link } from 'react-router-dom';
import { ProjectCard } from '../components/Helper';

export default function ProjectSection({ project }) {
  if (!project || project.length === 0) return <p>Loading project data...</p>;

  return (
    <>
      {project.slice(0, 2).map((item) => (
        <ProjectCard key={item.id || item.name} item={item} />
      ))}
      <Link className="px-4" to="/project">
        <small>Show All Projects...</small>
      </Link>
    </>
  );
}
