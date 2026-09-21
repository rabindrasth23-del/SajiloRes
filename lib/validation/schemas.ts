

import { z } from "zod";

// UUID v4 regex for client_id validation
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Enums per TRD §7 + docs/DECISIONS.md §4, §7 ───
export const INCIDENT_TYPES = [
  "building_collapse",
  "flood_landslide",
  "fire",
  "medical",
  "road_blockage",
  "other",
] as const;

export const LOCATION_SOURCES = [
  "gps",
  "typed",
  "map_selection",
  "none",
] as const;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_SIZE = 8 * 1024 * 1024; // 8MB per TRD §14

// ─── POST /api/incidents ───
export const CreateIncidentSchema = z
  .object({
    client_id: z
      .string()
      .regex(UUID_V4_REGEX, "client_id must be a valid UUID v4"),
    incident_type: z.enum(INCIDENT_TYPES).optional(),
    raw_text: z
      .string()
      .min(1, "raw_text is required")
      .max(2000, "raw_text must be 2000 characters or fewer"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    location_text: z.string().nullish(),
    location_source: z.enum(LOCATION_SOURCES).default("none"),
    attachment_paths: z
      .array(
        z.object({
          storage_path: z.string().min(1),
          mime_type: z.enum(ALLOWED_MIME_TYPES),
          size_bytes: z.number().int().positive().max(MAX_UPLOAD_SIZE),
        })
      )
      .default([]),
    offline_created: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Both latitude and longitude must be present, or both absent
      const hasLat = data.latitude !== undefined;
      const hasLng = data.longitude !== undefined;
      return hasLat === hasLng;
    },
    {
      message: "latitude and longitude must both be provided or both omitted",
      path: ["latitude"],
    }
  );

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

// ─── POST /api/uploads/sign ───
export const SignUploadSchema = z.object({
  client_id: z
    .string()
    .regex(UUID_V4_REGEX, "client_id must be a valid UUID v4"),
  mime_type: z.enum(ALLOWED_MIME_TYPES, {
    error: `mime_type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`,
  }),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_SIZE, `size_bytes must be <= ${MAX_UPLOAD_SIZE} (8MB)`),
});

export type SignUploadInput = z.infer<typeof SignUploadSchema>;

// ─── Any UUID (for params like responder_id, incident_id) ───
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── POST /api/incidents/[id]/status ───
export const TRIAGE_VALUES = [
  "immediate",
  "delayed",
  "minor",
  "unknown",
] as const;

export const ChangeStatusSchema = z.object({
  status: z.string().min(1, "status is required"),
  reason: z.string().min(1, "reason is required").max(2000),
});

// ─── POST /api/incidents/[id]/assign ───
export const AssignResponderSchema = z.object({
  responder_id: z
    .string()
    .regex(UUID_REGEX, "responder_id must be a valid UUID"),
  notes: z.string().max(2000).optional(),
});

// ─── POST /api/incidents/[id]/modify ───
export const ModifyIncidentSchema = z
  .object({
    triage: z.enum(TRIAGE_VALUES).optional(),
    incident_type: z.enum(INCIDENT_TYPES).optional(),
    recommended_action: z.string().max(2000).optional(),
    reason: z.string().min(1, "reason is required").max(2000),
  })
  .refine(
    (data) => data.triage || data.incident_type || data.recommended_action,
    { message: "At least one of triage, incident_type, or recommended_action must be provided" }
  );

// ─── POST /api/incidents/[id]/duplicate ───
export const DuplicateActionSchema = z.object({
  possible_duplicate_of: z
    .string()
    .regex(UUID_REGEX, "possible_duplicate_of must be a valid UUID"),
  action: z.enum(["merge", "keep_separate"]),
});

// ─── GET /api/incidents (query params) ───
export const ListIncidentsQuerySchema = z.object({
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : v.split(",")) : undefined)),
  triage: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : v.split(",")) : undefined)),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// ─── GET /api/responders/nearby ───
export const NearbyRespondersSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  serviceTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : v.split(",")) : undefined)),
});
