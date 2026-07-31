// Data-access layer. All SQL lives here so screens never touch the DB directly.
//
// Conventions:
//  - DB columns are snake_case; app models are camelCase. Row mappers below
//    translate between them.
//  - The app is single-profile for Phase 1: `getOrCreateProfile()` guarantees
//    exactly one profile row and returns its id.

import { getDb } from "./database";
import type {
  AdditionalInfo,
  AiSetting,
  Certification,
  CoverLetter,
  Education,
  Experience,
  FullProfile,
  NewCertification,
  NewCoverLetter,
  NewEducation,
  NewExperience,
  NewProject,
  NewVolunteer,
  Profile,
  Project,
  Skill,
  Volunteer,
} from "../types/models";

/* ------------------------------------------------------------------ */
/* Row mappers (snake_case DB row -> camelCase model)                  */
/* ------------------------------------------------------------------ */

type Row = Record<string, any>;

const toProfile = (r: Row): Profile => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  location: r.location,
  linkedin: r.linkedin,
  portfolio: r.portfolio,
});

const toEducation = (r: Row): Education => ({
  id: r.id,
  profileId: r.profile_id,
  school: r.school,
  degree: r.degree,
  major: r.major,
  minor: r.minor,
  graduationYear: r.graduation_year,
  coursework: r.coursework,
  gpa: r.gpa,
});

const toExperience = (r: Row): Experience => ({
  id: r.id,
  profileId: r.profile_id,
  company: r.company,
  role: r.role,
  dates: r.dates,
  description: r.description,
  achievements: r.achievements,
});

const toVolunteer = (r: Row): Volunteer => ({
  id: r.id,
  profileId: r.profile_id,
  organization: r.organization,
  role: r.role,
  dates: r.dates,
  description: r.description,
});

const toProject = (r: Row): Project => ({
  id: r.id,
  profileId: r.profile_id,
  name: r.name,
  technologies: r.technologies,
  description: r.description,
  results: r.results,
});

const toSkill = (r: Row): Skill => ({
  id: r.id,
  profileId: r.profile_id,
  skill: r.skill,
});

const toCertification = (r: Row): Certification => ({
  id: r.id,
  profileId: r.profile_id,
  name: r.name,
  organization: r.organization,
  date: r.date,
});

const toAdditional = (r: Row): AdditionalInfo => ({
  id: r.id,
  profileId: r.profile_id,
  awards: r.awards,
  publications: r.publications,
  languages: r.languages,
  leadership: r.leadership,
  other: r.other,
});

const toCoverLetter = (r: Row): CoverLetter => ({
  id: r.id,
  title: r.title,
  company: r.company,
  role: r.role,
  content: r.content,
  createdAt: r.created_at,
  limitType: r.limit_type,
  limitValue: r.limit_value,
  formatKey: r.format_key,
});

/* ------------------------------------------------------------------ */
/* Meta (small key/value flags, e.g. "model setup already offered")    */
/* ------------------------------------------------------------------ */

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT value FROM meta WHERE key = ?", key);
  return row ? row.value : null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
    key,
    value
  );
}

/* ------------------------------------------------------------------ */
/* Profile (single row)                                                */
/* ------------------------------------------------------------------ */

/** Returns the existing profile, or null if onboarding hasn't happened yet. */
export async function getProfile(): Promise<Profile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT * FROM profile LIMIT 1");
  return row ? toProfile(row) : null;
}

/** True once a profile exists — used to decide whether to show onboarding. */
export async function hasProfile(): Promise<boolean> {
  return (await getProfile()) !== null;
}

/**
 * Ensures a single profile row exists and returns its id.
 * Called at the start of onboarding so child sections have a profileId.
 */
export async function getOrCreateProfile(name = ""): Promise<number> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>("SELECT id FROM profile LIMIT 1");
  if (existing) return existing.id;
  const result = await db.runAsync("INSERT INTO profile (name) VALUES (?)", name);
  return result.lastInsertRowId;
}

/** Creates or updates the personal-info fields on the single profile row. */
export async function saveProfile(p: Omit<Profile, "id">): Promise<number> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>("SELECT id FROM profile LIMIT 1");
  if (existing) {
    await db.runAsync(
      `UPDATE profile SET name = ?, email = ?, phone = ?, location = ?,
         linkedin = ?, portfolio = ? WHERE id = ?`,
      p.name,
      p.email ?? null,
      p.phone ?? null,
      p.location ?? null,
      p.linkedin ?? null,
      p.portfolio ?? null,
      existing.id
    );
    return existing.id;
  }
  const result = await db.runAsync(
    `INSERT INTO profile (name, email, phone, location, linkedin, portfolio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    p.name,
    p.email ?? null,
    p.phone ?? null,
    p.location ?? null,
    p.linkedin ?? null,
    p.portfolio ?? null
  );
  return result.lastInsertRowId;
}

/* ------------------------------------------------------------------ */
/* Child collections (education / experience / volunteer / projects)  */
/* ------------------------------------------------------------------ */

export async function listEducation(profileId: number): Promise<Education[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM education WHERE profile_id = ? ORDER BY id DESC",
    profileId
  );
  return rows.map(toEducation);
}

export async function addEducation(profileId: number, e: NewEducation): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO education (profile_id, school, degree, major, minor, graduation_year, coursework, gpa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    profileId,
    e.school ?? null,
    e.degree ?? null,
    e.major ?? null,
    e.minor ?? null,
    e.graduationYear ?? null,
    e.coursework ?? null,
    e.gpa ?? null
  );
  return r.lastInsertRowId;
}

export async function listExperience(profileId: number): Promise<Experience[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM experience WHERE profile_id = ? ORDER BY id DESC",
    profileId
  );
  return rows.map(toExperience);
}

export async function addExperience(profileId: number, e: NewExperience): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO experience (profile_id, company, role, dates, description, achievements)
     VALUES (?, ?, ?, ?, ?, ?)`,
    profileId,
    e.company ?? null,
    e.role ?? null,
    e.dates ?? null,
    e.description ?? null,
    e.achievements ?? null
  );
  return r.lastInsertRowId;
}

export async function listVolunteer(profileId: number): Promise<Volunteer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM volunteer WHERE profile_id = ? ORDER BY id DESC",
    profileId
  );
  return rows.map(toVolunteer);
}

export async function addVolunteer(profileId: number, v: NewVolunteer): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO volunteer (profile_id, organization, role, dates, description)
     VALUES (?, ?, ?, ?, ?)`,
    profileId,
    v.organization ?? null,
    v.role ?? null,
    v.dates ?? null,
    v.description ?? null
  );
  return r.lastInsertRowId;
}

export async function listProjects(profileId: number): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM projects WHERE profile_id = ? ORDER BY id DESC",
    profileId
  );
  return rows.map(toProject);
}

export async function addProject(profileId: number, p: NewProject): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO projects (profile_id, name, technologies, description, results)
     VALUES (?, ?, ?, ?, ?)`,
    profileId,
    p.name ?? null,
    p.technologies ?? null,
    p.description ?? null,
    p.results ?? null
  );
  return r.lastInsertRowId;
}

export async function listCertifications(profileId: number): Promise<Certification[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM certifications WHERE profile_id = ? ORDER BY id DESC",
    profileId
  );
  return rows.map(toCertification);
}

export async function addCertification(
  profileId: number,
  c: NewCertification
): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO certifications (profile_id, name, organization, date)
     VALUES (?, ?, ?, ?)`,
    profileId,
    c.name ?? null,
    c.organization ?? null,
    c.date ?? null
  );
  return r.lastInsertRowId;
}

/* ---- Updates (edit an existing entry in place; used by the Profile page) ---- */

export async function updateEducation(id: number, e: NewEducation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE education SET school = ?, degree = ?, major = ?, minor = ?,
       graduation_year = ?, coursework = ?, gpa = ? WHERE id = ?`,
    e.school ?? null,
    e.degree ?? null,
    e.major ?? null,
    e.minor ?? null,
    e.graduationYear ?? null,
    e.coursework ?? null,
    e.gpa ?? null,
    id
  );
}

export async function updateExperience(id: number, e: NewExperience): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE experience SET company = ?, role = ?, dates = ?, description = ?,
       achievements = ? WHERE id = ?`,
    e.company ?? null,
    e.role ?? null,
    e.dates ?? null,
    e.description ?? null,
    e.achievements ?? null,
    id
  );
}

export async function updateVolunteer(id: number, v: NewVolunteer): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE volunteer SET organization = ?, role = ?, dates = ?, description = ?
       WHERE id = ?`,
    v.organization ?? null,
    v.role ?? null,
    v.dates ?? null,
    v.description ?? null,
    id
  );
}

export async function updateProject(id: number, p: NewProject): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE projects SET name = ?, technologies = ?, description = ?, results = ?
       WHERE id = ?`,
    p.name ?? null,
    p.technologies ?? null,
    p.description ?? null,
    p.results ?? null,
    id
  );
}

export async function updateCertification(id: number, c: NewCertification): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE certifications SET name = ?, organization = ?, date = ? WHERE id = ?`,
    c.name ?? null,
    c.organization ?? null,
    c.date ?? null,
    id
  );
}

/** Generic delete for any profile-owned child row. */
export async function deleteRow(
  table:
    | "education"
    | "experience"
    | "volunteer"
    | "projects"
    | "certifications"
    | "skills",
  id: number
): Promise<void> {
  const db = await getDb();
  // `table` is constrained by the union type above, so this is not user input.
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

/* ------------------------------------------------------------------ */
/* Skills (tag list)                                                   */
/* ------------------------------------------------------------------ */

export async function listSkills(profileId: number): Promise<Skill[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM skills WHERE profile_id = ? ORDER BY id ASC",
    profileId
  );
  return rows.map(toSkill);
}

export async function addSkill(profileId: number, skill: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO skills (profile_id, skill) VALUES (?, ?)",
    profileId,
    skill
  );
  return r.lastInsertRowId;
}

export async function removeSkill(id: number): Promise<void> {
  await deleteRow("skills", id);
}

/* ------------------------------------------------------------------ */
/* Additional info (single row per profile)                            */
/* ------------------------------------------------------------------ */

export async function getAdditional(profileId: number): Promise<AdditionalInfo | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    "SELECT * FROM additional_info WHERE profile_id = ? LIMIT 1",
    profileId
  );
  return row ? toAdditional(row) : null;
}

export async function saveAdditional(
  profileId: number,
  a: Omit<AdditionalInfo, "id" | "profileId">
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>(
    "SELECT id FROM additional_info WHERE profile_id = ? LIMIT 1",
    profileId
  );
  if (existing) {
    await db.runAsync(
      `UPDATE additional_info SET awards = ?, publications = ?, languages = ?,
         leadership = ?, other = ? WHERE id = ?`,
      a.awards ?? null,
      a.publications ?? null,
      a.languages ?? null,
      a.leadership ?? null,
      a.other ?? null,
      existing.id
    );
  } else {
    await db.runAsync(
      `INSERT INTO additional_info (profile_id, awards, publications, languages, leadership, other)
       VALUES (?, ?, ?, ?, ?, ?)`,
      profileId,
      a.awards ?? null,
      a.publications ?? null,
      a.languages ?? null,
      a.leadership ?? null,
      a.other ?? null
    );
  }
}

/* ------------------------------------------------------------------ */
/* Full profile aggregate                                              */
/* ------------------------------------------------------------------ */

/** Assembles the whole profile — used by Profile page and (later) the AI module. */
export async function getFullProfile(): Promise<FullProfile | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const [education, experience, volunteer, projects, skills, certifications, additional] =
    await Promise.all([
      listEducation(profile.id),
      listExperience(profile.id),
      listVolunteer(profile.id),
      listProjects(profile.id),
      listSkills(profile.id),
      listCertifications(profile.id),
      getAdditional(profile.id),
    ]);
  return { profile, education, experience, volunteer, projects, skills, certifications, additional };
}

/* ------------------------------------------------------------------ */
/* Cover letters (archive)                                             */
/* ------------------------------------------------------------------ */

export async function listCoverLetters(): Promise<CoverLetter[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM cover_letters ORDER BY created_at DESC"
  );
  return rows.map(toCoverLetter);
}

export async function getCoverLetter(id: number): Promise<CoverLetter | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>(
    "SELECT * FROM cover_letters WHERE id = ?",
    id
  );
  return row ? toCoverLetter(row) : null;
}

/** Auto-name a letter from its company/role (e.g. "Google Cover Letter"). */
export function defaultLetterTitle(company?: string | null, role?: string | null): string {
  const c = company?.trim();
  const r = role?.trim();
  if (c && r) return `${c} — ${r}`;
  if (c) return `${c} Cover Letter`;
  if (r) return `${r} Cover Letter`;
  return "Untitled Cover Letter";
}

export async function saveCoverLetter(letter: NewCoverLetter): Promise<number> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const title =
    letter.title?.trim() || defaultLetterTitle(letter.company, letter.role);
  const r = await db.runAsync(
    "INSERT INTO cover_letters (title, company, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    title,
    letter.company ?? null,
    letter.role ?? null,
    letter.content,
    createdAt
  );
  return r.lastInsertRowId;
}

export async function updateCoverLetter(id: number, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE cover_letters SET content = ? WHERE id = ?", content, id);
}

export async function updateCoverLetterTitle(id: number, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE cover_letters SET title = ? WHERE id = ?", title, id);
}

/** Set (or clear, with nulls) a letter's word/char length limit. */
export async function updateCoverLetterLimit(
  id: number,
  limitType: "word" | "char" | null,
  limitValue: number | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE cover_letters SET limit_type = ?, limit_value = ? WHERE id = ?",
    limitType,
    limitValue,
    id
  );
}

/** Persist the chosen layout preset for a letter. */
export async function updateCoverLetterFormat(id: number, formatKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE cover_letters SET format_key = ? WHERE id = ?", formatKey, id);
}

export async function deleteCoverLetter(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM cover_letters WHERE id = ?", id);
}

/* ------------------------------------------------------------------ */
/* AI settings (permanent instructions, spec section 15)              */
/* ------------------------------------------------------------------ */

export async function listAiSettings(): Promise<AiSetting[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM ai_settings ORDER BY id ASC");
  return rows.map((r) => ({ id: r.id, instruction: r.instruction }));
}

export async function addAiSetting(instruction: string): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    "INSERT INTO ai_settings (instruction) VALUES (?)",
    instruction
  );
  return r.lastInsertRowId;
}

export async function removeAiSetting(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM ai_settings WHERE id = ?", id);
}
