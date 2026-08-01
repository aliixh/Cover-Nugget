// Profile page (spec §14). Organized into browser-style TABS (one section at a
// time) instead of one long scroll. Personal / Skills / additional info are
// inline forms; the collection sections use RepeatableEditor (edit in place,
// "+ Add" inserts a new blank entry).

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { SaveButton } from "../../src/components/SaveButton";
import { TextField } from "../../src/components/TextField";
import { TagInput } from "../../src/components/TagInput";
import { Card } from "../../src/components/Card";
import { RepeatableEditor } from "../../src/components/RepeatableEditor";
import {
  addCertification,
  addEducation,
  addExperience,
  addProject,
  addSkill,
  deleteRow,
  getFullProfile,
  listCertifications,
  listEducation,
  listExperience,
  listProjects,
  removeSkill,
  saveAdditional,
  saveProfile,
  updateCertification,
  updateEducation,
  updateExperience,
  updateProject,
} from "../../src/db/repositories";
import type { FullProfile } from "../../src/types/models";

type TabKey =
  | "personal"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "additional";

// Short labels keep the tab strip thin and scannable.
const TABS: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Me" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Work" },
  { key: "education", label: "Edu" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certs" },
  { key: "additional", label: "More" },
];

export default function ProfileScreen() {
  const [data, setData] = useState<FullProfile | null>(null);
  const [tab, setTab] = useState<TabKey>("personal");

  // Swipeable pager (tap a tab OR swipe left/right between them).
  const pagerRef = useRef<ScrollView>(null);
  const [pageW, setPageW] = useState(0);
  const [pageH, setPageH] = useState(0);
  // True when the active tab changed because of a swipe (so the sync effect
  // doesn't fight the gesture by scrolling again).
  const fromSwipe = useRef(false);

  // Personal-info form state.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");

  // Additional-info form state (leadership kept in state to preserve any prior
  // value, but no longer shown/edited).
  const [awards, setAwards] = useState("");
  const [publications, setPublications] = useState("");
  const [languages, setLanguages] = useState("");
  const [leadership, setLeadership] = useState("");
  const [other, setOther] = useState("");

  const load = useCallback(async () => {
    const full = await getFullProfile();
    setData(full);
    if (full) {
      const p = full.profile;
      setName(p.name ?? "");
      setEmail(p.email ?? "");
      setPhone(p.phone ?? "");
      setLocation(p.location ?? "");
      setLinkedin(p.linkedin ?? "");
      setPortfolio(p.portfolio ?? "");
      const a = full.additional;
      setAwards(a?.awards ?? "");
      setPublications(a?.publications ?? "");
      setLanguages(a?.languages ?? "");
      setLeadership(a?.leadership ?? "");
      setOther(a?.other ?? "");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Keep the pager in sync with the active tab. Runs after commit, so the
  // ScrollView ref + layout are ready (calling scrollTo inside the tap handler
  // was unreliable on the new architecture). Skips when the change came from a
  // swipe so it doesn't cancel the gesture.
  useEffect(() => {
    if (pageW <= 0) return;
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    const i = TABS.findIndex((t) => t.key === tab);
    if (i >= 0) pagerRef.current?.scrollTo({ x: i * pageW, animated: true });
  }, [tab, pageW]);

  const savePersonal = async (): Promise<boolean> => {
    if (name.trim().length === 0) {
      Alert.alert("Name required", "Please keep a name on your profile.");
      return false;
    }
    await saveProfile({ name: name.trim(), email, phone, location, linkedin, portfolio });
    return true;
  };

  const saveExtra = async (): Promise<boolean> => {
    if (!data) return false;
    await saveAdditional(data.profile.id, {
      awards,
      publications,
      languages,
      leadership, // preserved, not shown
      other,
    });
    return true;
  };

  const onAddSkill = async (t: string) => {
    if (!data) return;
    await addSkill(data.profile.id, t);
    load();
  };
  const onRemoveSkill = async (index: number) => {
    if (!data) return;
    const skill = data.skills[index];
    if (skill) {
      await removeSkill(skill.id);
      load();
    }
  };

  if (!data) {
    return (
      <ScreenContainer>
        <Text className="text-base text-muted dark:text-dark-muted">No profile yet.</Text>
      </ScreenContainer>
    );
  }

  const pid = data.profile.id;

  // Content for a single tab (rendered as one page in the pager).
  const tabContent = (key: TabKey) => {
    switch (key) {
      case "personal":
        return (
          <View>
            <Card>
              <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
              <TextField label="Email" value={email} onChangeText={setEmail} optional keyboardType="email-address" autoCapitalize="none" />
              <TextField label="Phone" value={phone} onChangeText={setPhone} optional keyboardType="phone-pad" />
              <TextField label="Location" value={location} onChangeText={setLocation} optional />
              <TextField label="LinkedIn" value={linkedin} onChangeText={setLinkedin} optional autoCapitalize="none" />
              <TextField label="Portfolio website" value={portfolio} onChangeText={setPortfolio} optional autoCapitalize="none" />
            </Card>
            <SaveButton onSave={savePersonal} className="mt-3" />
          </View>
        );
      case "skills":
        return (
          <View>
            <Card>
              <TagInput tags={data.skills.map((s) => s.skill)} onAdd={onAddSkill} onRemove={onRemoveSkill} />
            </Card>
            <SaveButton onSave={() => true} className="mt-3" />
          </View>
        );
      case "experience":
        return (
          <RepeatableEditor
            editable
            profileId={pid}
            addLabel="+ Add experience"
            fields={[
              { key: "company", label: "Company / Organization" },
              { key: "role", label: "Role" },
              { key: "dates", label: "Dates" },
              { key: "description", label: "What you did", multiline: true },
            ]}
            load={listExperience}
            add={(p, v) => addExperience(p, { company: v.company, role: v.role, dates: v.dates, description: v.description })}
            update={(id, v) => updateExperience(id, { company: v.company, role: v.role, dates: v.dates, description: v.description })}
            remove={(id) => deleteRow("experience", id)}
            summarize={(e) => ({ primary: [e.role, e.company].filter(Boolean).join(" @ ") })}
          />
        );
      case "education":
        return (
          <RepeatableEditor
            editable
            profileId={pid}
            addLabel="+ Add education"
            fields={[
              { key: "school", label: "School name" },
              { key: "degree", label: "Degree" },
              { key: "major", label: "Major" },
              { key: "minor", label: "Minor" },
              { key: "gpa", label: "GPA" },
              { key: "graduationYear", label: "Graduation year" },
              { key: "coursework", label: "Relevant coursework", multiline: true },
            ]}
            load={listEducation}
            add={(p, v) => addEducation(p, { school: v.school, degree: v.degree, major: v.major, minor: v.minor, gpa: v.gpa, graduationYear: v.graduationYear, coursework: v.coursework })}
            update={(id, v) => updateEducation(id, { school: v.school, degree: v.degree, major: v.major, minor: v.minor, gpa: v.gpa, graduationYear: v.graduationYear, coursework: v.coursework })}
            remove={(id) => deleteRow("education", id)}
            summarize={(e) => ({ primary: e.degree || e.school })}
          />
        );
      case "projects":
        return (
          <RepeatableEditor
            editable
            profileId={pid}
            addLabel="+ Add project"
            fields={[
              { key: "name", label: "Project name" },
              { key: "technologies", label: "Technologies" },
              { key: "description", label: "Description", multiline: true },
            ]}
            load={listProjects}
            add={(p, v) => addProject(p, { name: v.name, technologies: v.technologies, description: v.description })}
            update={(id, v) => updateProject(id, { name: v.name, technologies: v.technologies, description: v.description })}
            remove={(id) => deleteRow("projects", id)}
            summarize={(e) => ({ primary: e.name })}
          />
        );
      case "certifications":
        return (
          <RepeatableEditor
            editable
            profileId={pid}
            addLabel="+ Add certification"
            fields={[
              { key: "name", label: "Certification name" },
              { key: "organization", label: "Organization" },
              { key: "date", label: "Date" },
            ]}
            load={listCertifications}
            add={(p, v) => addCertification(p, { name: v.name, organization: v.organization, date: v.date })}
            update={(id, v) => updateCertification(id, { name: v.name, organization: v.organization, date: v.date })}
            remove={(id) => deleteRow("certifications", id)}
            summarize={(e) => ({ primary: e.name })}
          />
        );
      case "additional":
        return (
          <View>
            <Card>
              <TextField label="Awards" value={awards} onChangeText={setAwards} optional multiline />
              <TextField label="Publications" value={publications} onChangeText={setPublications} optional multiline />
              <TextField label="Languages" value={languages} onChangeText={setLanguages} optional />
              <TextField label="Other achievements" value={other} onChangeText={setOther} optional multiline />
            </Card>
            <SaveButton onSave={saveExtra} className="mt-3 mb-4" />
          </View>
        );
    }
  };

  // Tap a tab → set it; the effect above scrolls the pager to match.
  const goToTab = (i: number) => setTab(TABS[i].key);
  // Swipe → update the active tab (marked so the effect doesn't re-scroll).
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageW <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
    const key = TABS[i]?.key;
    if (key && key !== tab) {
      fromSwipe.current = true;
      setTab(key);
    }
  };

  return (
    <ScreenContainer scroll={false}>
      {/* Thin browser-style tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        className="mb-5 border-b border-border dark:border-dark-border"
      >
        {TABS.map((t, i) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => goToTab(i)}
              className={`mr-6 border-b-2 pb-2 ${active ? "border-accent" : "border-transparent"}`}
            >
              <Text
                className={`text-sm ${
                  active
                    ? "font-bold text-primary dark:text-dark-primary"
                    : "font-medium text-muted dark:text-dark-muted"
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Swipeable pages — one per tab. Each page is a fixed-size box so the
          horizontal pager can page; its inner ScrollView (bounded by that box)
          scrolls the tab's content vertically. */}
      <View
        className="flex-1"
        onLayout={(e) => {
          setPageW(e.nativeEvent.layout.width);
          setPageH(e.nativeEvent.layout.height);
        }}
      >
        {pageW > 0 && pageH > 0 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={onPagerEnd}
          >
            {TABS.map((t) => (
              <View key={t.key} style={{ width: pageW, height: pageH }}>
                <ScrollView
                  contentContainerStyle={{ paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  automaticallyAdjustKeyboardInsets
                  showsVerticalScrollIndicator={false}
                >
                  {tabContent(t.key)}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
