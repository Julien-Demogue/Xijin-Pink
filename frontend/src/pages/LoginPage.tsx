import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatusLed, type LedState } from "@/components/features/auth/StatusLed";
import { CameraView } from "@/components/features/auth/CameraView";
import { useFaceCamera } from "@/components/features/auth/useFaceCamera";
import { useAuth } from "@/context/AuthContext";
import { ApiError, faceIdentify, facePassword } from "@/lib/apiClient";

interface LocationState {
  from?: Location;
}

type Step = "identify" | "password";

export function LoginPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const camera = useFaceCamera();

  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [led, setLed] = useState<LedState>("off");
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  function resetToIdentify() {
    setStep("identify");
    setPassword("");
    setLed("off");
    setInfo(undefined);
  }

  function goToTarget() {
    const state = location.state as LocationState | null;
    navigate(state?.from?.pathname ?? "/");
  }

  async function handleIdentify() {
    setError(undefined);
    if (!email.trim()) {
      setError("Saisissez votre adresse email.");
      return;
    }
    setIsBusy(true);
    try {
      setInfo("Activation de la caméra…");
      await camera.start();
      setInfo("Analyse du visage…");
      const image = camera.capture();
      const { data } = await faceIdentify({ identifier: email.trim().toLowerCase(), image });
      camera.stop();

      if (data.recognized) {
        setLed("green-blink");
        setStep("password");
        setInfo(
          `Visage reconnu${data.score ? ` (score ${data.score})` : ""}. Saisissez votre mot de passe.`,
        );
      } else if (data.locked) {
        setLed("red");
        setInfo(undefined);
        setError(`Trop de tentatives — réessayez dans ${data.lockedForSeconds ?? 0} s.`);
      } else if (data.reason === "no_face") {
        setLed("off");
        setInfo(undefined);
        setError("Aucun visage détecté, placez-vous bien en face de la caméra.");
      } else {
        setLed("red");
        setInfo(undefined);
        const left =
          typeof data.attemptsLeft === "number" ? ` Essais restants : ${data.attemptsLeft}.` : "";
        setError(`Visage non reconnu.${left}`);
      }
    } catch (caught) {
      camera.stop();
      setLed("off");
      setInfo(undefined);
      setError(
        caught instanceof ApiError ? caught.message : "Caméra indisponible ou accès refusé.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsBusy(true);
    try {
      const { status, data } = await facePassword({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (data.ok && data.token) {
        setLed("green");
        setInfo("Accès autorisé.");
        const result = await loginWithToken(data.token);
        if (result.ok) {
          goToTarget();
          return;
        }
        setError(result.error);
      } else if (status === 403) {
        setLed("off");
        setError("Reconnaissance faciale expirée — nouvelle identification requise.");
        setTimeout(resetToIdentify, 1500);
      } else {
        setLed("red");
        setInfo(undefined);
        setError("Mot de passe refusé. Nouvelle identification requise.");
        setTimeout(resetToIdentify, 2500);
      }
    } catch (caught) {
      setLed("red");
      setError(caught instanceof ApiError ? caught.message : "Erreur de connexion.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <PageContainer className="flex min-h-[70vh] max-w-md items-center py-16">
      <Card variant="elevated" className="w-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="mt-1 text-sm text-gray-500">
              Accès sécurisé : reconnaissance faciale, puis mot de passe.
            </p>
          </div>
          <StatusLed state={led} />
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        {!error && info && <p className="mt-3 text-sm text-gray-500">{info}</p>}

        {step === "identify" ? (
          <div className="mt-5 flex flex-col gap-4">
            <Input
              label="Adresse email"
              type="email"
              name="email"
              placeholder="vous@example.fr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <CameraView videoRef={camera.videoRef} canvasRef={camera.canvasRef} />
            <Button type="button" onClick={handleIdentify} isLoading={isBusy} fullWidth>
              Vérifier mon visage
            </Button>
          </div>
        ) : (
          <form onSubmit={handlePassword} className="mt-5 flex flex-col gap-4">
            <Input
              label="Mot de passe"
              type="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" isLoading={isBusy} fullWidth>
              Se connecter
            </Button>
            <button
              type="button"
              onClick={resetToIdentify}
              className="text-sm text-gray-500 hover:underline"
            >
              Recommencer l'identification
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-medium text-brand-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}
