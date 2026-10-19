import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAuth } from "@/context/AuthContext";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (values.name.trim().length < 2) {
    errors.name = "Veuillez indiquer votre nom.";
  }
  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Adresse email invalide.";
  }
  if (values.password.length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }
  return errors;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setServerError(undefined);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const result = await register({
      email: values.email.trim(),
      password: values.password,
      displayName: values.name.trim(),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    navigate("/");
  }

  return (
    <PageContainer className="flex min-h-[70vh] max-w-md items-center py-16">
      <Card variant="elevated" className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-gray-500">
          Rejoignez la communauté de donateurs Xijin Pink.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {serverError && <Alert tone="error">{serverError}</Alert>}

          <Input
            label="Nom complet"
            name="name"
            placeholder="Jeanne Lefort"
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            error={errors.name}
          />

          <Input
            label="Adresse email"
            type="email"
            name="email"
            placeholder="vous@example.fr"
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            error={errors.email}
          />

          <Input
            label="Mot de passe"
            type="password"
            name="password"
            placeholder="••••••••"
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            error={errors.password}
            hint="8 caractères minimum."
          />

          <Input
            label="Confirmer le mot de passe"
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            value={values.confirmPassword}
            onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })}
            error={errors.confirmPassword}
          />

          <Button type="submit" isLoading={isSubmitting} fullWidth>
            Créer mon compte
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Déjà un compte ?{" "}
          <Link to="/connexion" className="font-medium text-brand-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}
