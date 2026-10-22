import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageContainer } from "@/components/layout/PageContainer";
import { CameraView } from "@/components/features/auth/CameraView";
import { useFaceCamera } from "@/components/features/auth/useFaceCamera";
import { useAuth } from "@/context/AuthContext";
import { ApiError, faceEnroll, type FaceEnrollResult } from "@/lib/apiClient";

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

function enrollFailureMessage(data: FaceEnrollResult): string {
  if (data.error === "no_face") {
    return "Aucun visage détecté. Placez-vous bien en face de la caméra et réessayez.";
  }
  return data.message ?? "L'enregistrement du visage a échoué, réessayez.";
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const camera = useFaceCamera();

  const [phase, setPhase] = useState<"form" | "enroll">("form");
  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cameraOn, setCameraOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function activateCamera() {
    setServerError(undefined);
    try {
      await camera.start();
      setCameraOn(true);
    } catch {
      setServerError("Caméra indisponible ou accès refusé.");
    }
  }

  function enrollInput(image: string) {
    return {
      identifier: values.email.trim().toLowerCase(),
      image,
      displayName: values.name.trim(),
      role: "donor",
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setServerError(undefined);
    if (Object.keys(validationErrors).length > 0) return;
    if (!cameraOn) {
      setServerError("Activez la caméra pour enregistrer votre visage.");
      return;
    }

    setIsSubmitting(true);
    try {
      const image = camera.capture();
      if (!image) {
        setServerError("Capture du visage impossible, réessayez.");
        return;
      }
      const result = await register({
        email: values.email.trim(),
        password: values.password,
        displayName: values.name.trim(),
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      // Account created and logged in — now enrol the face for future face-login.
      const { data } = await faceEnroll(enrollInput(image));
      if (data.enrolled) {
        camera.stop();
        navigate("/");
        return;
      }
      setPhase("enroll");
      setInfo(enrollFailureMessage(data));
    } catch (caught) {
      // Enrolment network error — the account exists, let them retry the face step.
      setPhase("enroll");
      setServerError(
        caught instanceof ApiError ? caught.message : "Service de reconnaissance indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnroll() {
    setServerError(undefined);
    setInfo(undefined);
    setIsSubmitting(true);
    try {
      if (!cameraOn) await activateCamera();
      const image = camera.capture();
      if (!image) {
        setServerError("Capture du visage impossible, réessayez.");
        return;
      }
      const { data } = await faceEnroll(enrollInput(image));
      if (data.enrolled) {
        camera.stop();
        navigate("/");
        return;
      }
      setServerError(enrollFailureMessage(data));
    } catch (caught) {
      setServerError(
        caught instanceof ApiError ? caught.message : "Service de reconnaissance indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function skipEnrolment() {
    camera.stop();
    navigate("/");
  }

  return (
    <PageContainer className="flex min-h-[70vh] max-w-md items-center py-16">
      <Card variant="elevated" className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
        <p className="mt-1 text-sm text-gray-500">
          {phase === "form"
            ? "Rejoignez la communauté de donateurs Xijin Pink."
            : "Votre compte est créé. Enregistrez votre visage pour activer la connexion faciale."}
        </p>

        {serverError && (
          <div className="mt-4">
            <Alert tone="error">{serverError}</Alert>
          </div>
        )}
        {!serverError && info && <p className="mt-3 text-sm text-gray-500">{info}</p>}

        {phase === "form" ? (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">
                Visage (pour la connexion par reconnaissance faciale)
              </span>
              <CameraView videoRef={camera.videoRef} canvasRef={camera.canvasRef} />
              {!cameraOn && (
                <Button type="button" variant="outline" onClick={activateCamera} fullWidth>
                  Activer la caméra
                </Button>
              )}
            </div>

            <Button type="submit" isLoading={isSubmitting} fullWidth>
              Créer mon compte
            </Button>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <CameraView videoRef={camera.videoRef} canvasRef={camera.canvasRef} />
            <Button type="button" onClick={handleEnroll} isLoading={isSubmitting} fullWidth>
              Enregistrer mon visage
            </Button>
            <button
              type="button"
              onClick={skipEnrolment}
              className="text-sm text-gray-500 hover:underline"
            >
              Continuer sans enregistrer le visage
            </button>
          </div>
        )}

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
