import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";

const PRESET_AMOUNTS = [10, 25, 50, 100];

interface AmountPickerProps {
  selectedPreset: number | null;
  customAmount: string;
  onSelectPreset: (amount: number) => void;
  onCustomAmountChange: (value: string) => void;
  error?: string;
}

export function AmountPicker({
  selectedPreset,
  customAmount,
  onSelectPreset,
  onCustomAmountChange,
  error,
}: AmountPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gray-700">Montant du don</span>
      <div className="grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onSelectPreset(amount)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
              selectedPreset === amount
                ? "border-brand-primary bg-brand-primary text-white shadow-brand"
                : "border-gray-200 bg-white text-gray-700 hover:border-brand-primary-light",
            )}
          >
            {amount} €
          </button>
        ))}
      </div>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="Autre montant (ex : 35)"
        value={customAmount}
        onChange={(event) => onCustomAmountChange(event.target.value)}
        error={error}
      />
    </div>
  );
}
