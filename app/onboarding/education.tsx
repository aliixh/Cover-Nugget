// Onboarding Page 3: Education (spec section 3). Supports multiple entries.

import { RepeatableSection } from "../../src/components/RepeatableSection";
import {
  addEducation,
  deleteRow,
  listEducation,
  updateEducation,
} from "../../src/db/repositories";

export default function EducationStep() {
  return (
    <RepeatableSection
      title="Education"
      subtitle="Add your academic background."
      step={2}
      total={7}
      nextRoute="/onboarding/experience"
      // Keep onboarding light — just the essentials. Major/minor/coursework can
      // be added later in Profile.
      fields={[
        { key: "school", label: "School name", placeholder: "University of Washington" },
        { key: "degree", label: "Degree", placeholder: "B.S. Computer Science" },
        { key: "gpa", label: "GPA", placeholder: "3.8" },
        { key: "graduationYear", label: "Graduation year", placeholder: "2027" },
      ]}
      load={listEducation}
      add={(profileId, v) =>
        addEducation(profileId, {
          school: v.school,
          degree: v.degree,
          gpa: v.gpa,
          graduationYear: v.graduationYear,
        })
      }
      update={(id, v) =>
        updateEducation(id, {
          school: v.school,
          degree: v.degree,
          gpa: v.gpa,
          graduationYear: v.graduationYear,
        })
      }
      remove={(id) => deleteRow("education", id)}
      summarize={(e) => ({
        primary: e.degree || e.school,
        secondary: [e.school, e.graduationYear].filter(Boolean).join(" · "),
      })}
    />
  );
}
