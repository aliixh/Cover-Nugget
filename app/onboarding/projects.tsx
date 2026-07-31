// Onboarding Page 6: Projects (spec section 3). Multiple entries.

import { RepeatableSection } from "../../src/components/RepeatableSection";
import { addProject, deleteRow, listProjects } from "../../src/db/repositories";

export default function ProjectsStep() {
  return (
    <RepeatableSection
      title="Projects"
      subtitle="Add projects you've built."
      step={4}
      total={7}
      nextRoute="/onboarding/skills"
      addLabel="+ Add Project"
      fields={[
        { key: "name", label: "Project name", placeholder: "Campus Maps" },
        { key: "technologies", label: "Technologies", placeholder: "React, TypeScript, AWS" },
        { key: "description", label: "Description", multiline: true, placeholder: "Built a campus navigation app." },
      ]}
      load={listProjects}
      add={(profileId, v) =>
        addProject(profileId, {
          name: v.name,
          technologies: v.technologies,
          description: v.description,
          results: v.results,
        })
      }
      remove={(id) => deleteRow("projects", id)}
      summarize={(e) => ({ primary: e.name, secondary: e.technologies })}
    />
  );
}
