// Onboarding Page 4: Work / Volunteer experience (spec §3) — one combined
// section. Add as many roles as you like (paid or volunteer).

import { RepeatableSection } from "../../src/components/RepeatableSection";
import { addExperience, deleteRow, listExperience } from "../../src/db/repositories";

export default function ExperienceStep() {
  return (
    <RepeatableSection
      title="Work / Volunteer"
      subtitle="Add your work and volunteer experience. Add as many as you like."
      step={3}
      total={7}
      nextRoute="/onboarding/projects"
      addLabel="+ Add experience"
      fields={[
        { key: "company", label: "Company / Organization", placeholder: "Amazon / Local Food Bank" },
        { key: "role", label: "Role", placeholder: "Software Engineering Intern" },
        { key: "dates", label: "Dates", placeholder: "Jun 2025 – Sep 2025" },
        { key: "description", label: "What you did", multiline: true, placeholder: "Built internal tools using React." },
      ]}
      load={listExperience}
      add={(profileId, v) =>
        addExperience(profileId, {
          company: v.company,
          role: v.role,
          dates: v.dates,
          description: v.description,
        })
      }
      remove={(id) => deleteRow("experience", id)}
      summarize={(e) => ({
        primary: [e.role, e.company].filter(Boolean).join(" @ "),
        secondary: e.dates,
      })}
    />
  );
}
