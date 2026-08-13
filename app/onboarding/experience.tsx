// Onboarding Page 4: Work / Volunteer experience (spec §3) — one combined
// section. Add as many roles as you like (paid or volunteer).

import { RepeatableSection } from "../../src/components/RepeatableSection";
import {
  addExperience,
  deleteRow,
  listExperience,
  updateExperience,
} from "../../src/db/repositories";

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
        { key: "startDate", label: "Start (MM/YYYY)", placeholder: "06/2025" },
        { key: "current", label: "I currently work here", type: "switch" },
        { key: "endDate", label: "End (MM/YYYY)", placeholder: "09/2025", hidden: (v) => v.current === "1" },
        { key: "description", label: "What you did", multiline: true, placeholder: "Built internal tools using React." },
      ]}
      load={async (p) => (await listExperience(p)).map((e) => ({ ...e, current: e.isCurrent ? "1" : "" }))}
      add={(profileId, v) =>
        addExperience(profileId, {
          company: v.company,
          role: v.role,
          startDate: v.startDate,
          endDate: v.endDate,
          isCurrent: v.current === "1",
          description: v.description,
        })
      }
      update={(id, v) =>
        updateExperience(id, {
          company: v.company,
          role: v.role,
          startDate: v.startDate,
          endDate: v.endDate,
          isCurrent: v.current === "1",
          description: v.description,
        })
      }
      remove={(id) => deleteRow("experience", id)}
      summarize={(e) => ({
        primary: [e.role, e.company].filter(Boolean).join(" @ "),
        secondary: e.isCurrent ? "Current" : [e.startDate, e.endDate].filter(Boolean).join(" – ") || e.dates,
      })}
    />
  );
}
