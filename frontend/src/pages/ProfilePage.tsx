import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/context/AuthContext";

export function ProfilePage() {
  const { currentUser, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(undefined);
    setError(undefined);

    if (displayName.trim().length < 2) {
      setError("Veuillez indiquer votre nom.");
      return;
    }

    setIsSubmitting(true);
    const result = await updateProfile({ displayName: displayName.trim(), bio });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccessMessage("Profil mis à jour avec succès.");
  }

  return (
    <PageContainer className="max-w-xl py-16">
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={currentUser.displayName} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations personnelles.</p>
        </div>
      </div>

      <Card variant="elevated">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {successMessage && <Alert tone="success">{successMessage}</Alert>}
          {error && <Alert tone="error">{error}</Alert>}

          <Input
            label="Nom complet"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Adresse email"
            type="email"
            name="email"
            value={currentUser.email}
            disabled
            hint="L'email ne peut pas être modifié."
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
            disabled={isSubmitting}
          />

          <Button type="submit" isLoading={isSubmitting} fullWidth>
            Enregistrer
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
