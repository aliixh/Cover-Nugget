// Domain models for Cover Nugget.
//
// These TypeScript interfaces mirror the SQLite tables defined in
// src/db/schema.ts (spec section 18). Every profile-owned row carries a
// `profileId` foreign key. The app is single-profile for now, but the schema
// keeps the door open for multiple profiles later.

export interface Profile {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
}

export interface Education {
  id: number;
  profileId: number;
  school?: string | null;
  degree?: string | null;
  major?: string | null;
  minor?: string | null;
  graduationYear?: string | null;
  coursework?: string | null;
  gpa?: string | null;
}

export interface Experience {
  id: number;
  profileId: number;
  company?: string | null;
  role?: string | null;
  dates?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string | null;
}

export interface Volunteer {
  id: number;
  profileId: number;
  organization?: string | null;
  role?: string | null;
  dates?: string | null;
  description?: string | null;
}

export interface Project {
  id: number;
  profileId: number;
  name?: string | null;
  technologies?: string | null;
  description?: string | null;
  results?: string | null;
}

export interface Skill {
  id: number;
  profileId: number;
  skill: string;
}

export interface Certification {
  id: number;
  profileId: number;
  name?: string | null;
  organization?: string | null;
  date?: string | null;
}

export interface AdditionalInfo {
  id: number;
  profileId: number;
  awards?: string | null;
  publications?: string | null;
  languages?: string | null;
  leadership?: string | null;
  other?: string | null;
}

export interface CoverLetter {
  id: number;
  title?: string | null;
  company?: string | null;
  role?: string | null;
  content: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp of the last edit
  /** Optional length limit: "word" | "char" (null = no limit). */
  limitType?: "word" | "char" | null;
  limitValue?: number | null;
  /** Chosen layout preset key (null = default Classic Block). */
  formatKey?: string | null;
}

export interface AiSetting {
  id: number;
  instruction: string;
}

/**
 * Full profile aggregate — everything needed to generate a cover letter.
 * Assembled by the repository layer and later fed to the AI module.
 */
export interface FullProfile {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  volunteer: Volunteer[];
  projects: Project[];
  skills: Skill[];
  certifications: Certification[];
  additional: AdditionalInfo | null;
}

// Input shapes for creating rows (id/profileId assigned by the repository).
export type NewEducation = Omit<Education, "id" | "profileId">;
export type NewExperience = Omit<Experience, "id" | "profileId">;
export type NewVolunteer = Omit<Volunteer, "id" | "profileId">;
export type NewProject = Omit<Project, "id" | "profileId">;
export type NewCertification = Omit<Certification, "id" | "profileId">;
export type NewCoverLetter = Omit<CoverLetter, "id" | "createdAt">;
