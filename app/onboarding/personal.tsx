// Onboarding Page 2: Personal Information (spec section 3).
// Name is the only required field; it creates the single profile row that all
// later sections attach to.

import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { OnboardingScaffold } from "../../src/components/OnboardingScaffold";
import { TextField } from "../../src/components/TextField";
import { saveProfile } from "../../src/db/repositories";

export default function PersonalInfo() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");

  const next = async () => {
    if (name.trim().length === 0) {
      Alert.alert("Name required", "Please enter your name to continue.");
      return;
    }
    // Persist immediately - creates the profile row used by every later step.
    await saveProfile({
      name: name.trim(),
      email,
      phone,
      location,
      linkedin,
      portfolio,
    });
    router.push("/onboarding/education");
  };

  return (
    <OnboardingScaffold
      title="Personal Information"
      subtitle="The basics for your letter header."
      step={1}
      total={7}
      onBack={() => router.back()}
      onNext={next}
    >
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Alex Chen" autoCapitalize="words" />
      <TextField label="Email" value={email} onChangeText={setEmail} optional keyboardType="email-address" autoCapitalize="none" placeholder="alex@example.com" />
      <TextField label="Phone" value={phone} onChangeText={setPhone} optional keyboardType="phone-pad" />
      <TextField label="Location" value={location} onChangeText={setLocation} optional placeholder="Seattle, WA" />
      <TextField label="LinkedIn" value={linkedin} onChangeText={setLinkedin} optional keyboardType="url" autoCapitalize="none" />
      <TextField label="Portfolio website" value={portfolio} onChangeText={setPortfolio} optional keyboardType="url" autoCapitalize="none" />
    </OnboardingScaffold>
  );
}
