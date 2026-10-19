export interface DonationSummary {
  totalCents: number;
  donationCount: number;
  title: string | null;
  nextTitle: {
    label: string;
    thresholdCents: number;
    remainingCents: number;
  } | null;
}
