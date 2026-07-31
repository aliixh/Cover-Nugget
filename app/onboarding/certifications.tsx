// Onboarding Page 8: Certifications (spec section 3). Multiple entries.

import { RepeatableSection } from "../../src/components/RepeatableSection";
import {
  addCertification,
  deleteRow,
  listCertifications,
} from "../../src/db/repositories";

export default function CertificationsStep() {
  return (
    <RepeatableSection
      title="Certifications"
      subtitle="Add any professional certifications."
      step={6}
      total={7}
      nextRoute="/onboarding/additional"
      addLabel="+ Add Certification"
      fields={[
        { key: "name", label: "Certification name", placeholder: "AWS Certified Cloud Practitioner" },
        { key: "organization", label: "Organization", placeholder: "Amazon Web Services" },
        { key: "date", label: "Date", placeholder: "2026" },
      ]}
      load={listCertifications}
      add={(profileId, v) =>
        addCertification(profileId, {
          name: v.name,
          organization: v.organization,
          date: v.date,
        })
      }
      remove={(id) => deleteRow("certifications", id)}
      summarize={(e) => ({ primary: e.name, secondary: e.organization })}
    />
  );
}
