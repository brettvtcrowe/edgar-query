import { z } from 'zod';

export const CompanySchema = z.object({
  cik: z.string(),
  ticker: z.string().optional(),
  name: z.string(),
});

export const FilingSchema = z.object({
  accessionNumber: z.string(),
  filingDate: z.string(),
  reportDate: z.string(),
  formType: z.string(),
  companyName: z.string(),
  cik: z.string(),
});

export type Company = z.infer<typeof CompanySchema>;
export type Filing = z.infer<typeof FilingSchema>;