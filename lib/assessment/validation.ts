import { z } from 'zod';

export const assessmentStartSchema = z.object({
  attribution: z.record(z.string()).optional(),
  utm: z.record(z.string()).optional(),
}).strict();

export const assessmentSessionPatchSchema = z.object({
  resumeToken: z.string().min(1),
  answers: z.record(z.string()).optional(),
  currentStep: z.number().int().min(1).max(6).optional(),
  completedStep: z.number().int().min(1).max(6).optional(),
}).strict();

export const contactCaptureSchema = z.object({
  resumeToken: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  businessName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
  website: z.string().url(),
  city: z.string().min(1),
  state: z.string().min(1),
  consentEmail: z.boolean(),
  consentSms: z.boolean().optional(),
  campaignAttribution: z.record(z.string()).optional(),
  utm: z.record(z.string()).optional(),
}).strict();

export const assessmentCompleteSchema = z.object({
  resumeToken: z.string().min(1),
}).strict();

export const assessmentRecalculateSchema = z.object({
  reportToken: z.string().min(1),
  monthlyInquiries: z.number().int().min(1).max(5000).optional(),
  averageValue: z.number().int().min(50).max(10000).optional(),
  bookingRate: z.number().min(0.1).max(1.0).optional(),
  noShowRate: z.number().min(0).max(1.0).optional(),
  dormantPool: z.number().int().min(50).max(1500).optional(),
}).strict();

export const eventRecordSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.unknown()).optional(),
  resumeToken: z.string().min(1).optional(),
  reportToken: z.string().min(1).optional(),
}).strict();
