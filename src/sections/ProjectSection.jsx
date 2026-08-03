import { ProjectCard } from '../components/Helper';

export default function ProjectSection({ project }) {
  if (!project || project.length === 0) return <p className='muted'>Loading projects…</p>;

  return (
    <>
      {project.slice(0, 2).map((item) => (
        <ProjectCard key={item.id || item.name} item={item} />
      ))}
    </>
  );
}
