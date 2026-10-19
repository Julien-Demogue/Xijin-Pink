import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProfilePage() {
  const { currentUser, updateProfile } = useAuth();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [serverError, setServerError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  if (!currentUser) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(undefined);
    setServerError(undefined);

    const nextErrors: { name?: string; email?: string } = {};
    if (name.trim().length < 2) nextErrors.name = "Veuillez indiquer votre nom.";
    if (!EMAIL_REGEX.test(email.trim())) nextErrors.email = "Adresse email invalide.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = updateProfile({ name, email, bio });
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    setSuccessMessage("Profil mis à jour avec succès.");
  }

  return (
    <PageContainer className="max-w-xl py-16">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={currentUser.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations personnelles.</p>
        </div>
      </div>

      <Card variant="elevated">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {successMessage && <Alert tone="success">{successMessage}</Alert>}
          {serverError && <Alert tone="error">{serverError}</Alert>}

          <Input
            label="Nom complet"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
          />

          <Input
            label="Adresse email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />

          <Textarea
            label="Bio"
            name="bio"
            rows={3}
            maxLength={280}
            placeholder="Parlez-nous de votre engagement..."
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            hint={`${bio.length}/280 caractères`}
          />

          <Button type="submit" fullWidth>
            Enregistrer
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
