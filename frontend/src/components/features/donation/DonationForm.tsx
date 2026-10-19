import type { FormEvent } from "react";
import { HandHeart } from "lucide-react";
import { AmountPicker } from "@/components/features/donation/AmountPicker";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export interface DonationFormValues {
  selectedPreset: number | null;
  customAmount: string;
  name: string;
  email: string;
  message: string;
}

export interface DonationFormErrors {
  amount?: string;
  name?: string;
  email?: string;
}

interface DonationFormProps {
  values: DonationFormValues;
  errors: DonationFormErrors;
  isSubmitting: boolean;
  failureNotice?: string;
  onChange: (values: DonationFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function DonationForm({
  values,
  errors,
  isSubmitting,
  failureNotice,
  onChange,
  onSubmit,
}: DonationFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {failureNotice && <Alert tone="error">{failureNotice}</Alert>}

      <AmountPicker
        selectedPreset={values.selectedPreset}
        customAmount={values.customAmount}
        onSelectPreset={(amount) =>
          onChange({ ...values, selectedPreset: amount, customAmount: "" })
        }
        onCustomAmountChange={(customAmount) =>
          onChange({ ...values, customAmount, selectedPreset: null })
        }
        error={errors.amount}
      />

      <Input
        label="Nom complet"
        name="name"
        placeholder="Jeanne Lefort"
        value={values.name}
        onChange={(event) => onChange({ ...values, name: event.target.value })}
        error={errors.name}
        disabled={isSubmitting}
      />

      <Input
        label="Adresse email"
        name="email"
        type="email"
        placeholder="vous@example.fr"
        value={values.email}
        onChange={(event) => onChange({ ...values, email: event.target.value })}
        error={errors.email}
        disabled={isSubmitting}
      />

      <Textarea
        label="Message de soutien (optionnel)"
        name="message"
        placeholder="Un mot d'encouragement pour les patientes..."
        maxLength={280}
        rows={3}
        value={values.message}
        onChange={(event) => onChange({ ...values, message: event.target.value })}
        hint={`${values.message.length}/280 caractères`}
        disabled={isSubmitting}
      />

      <Button
        type="submit"
        size="lg"
        isLoading={isSubmitting}
        leftIcon={<HandHeart className="h-5 w-5" />}
        fullWidth
      >
        {isSubmitting ? "Traitement en cours…" : "Faire mon don"}
      </Button>
    </form>
  );
}
