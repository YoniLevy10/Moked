import type { VerticalPack } from "@/lib/verticals/types";
import {
  APPOINTMENTS_QUALIFICATION_QUESTIONS,
  applyAppointmentsPackToTenant,
  appointmentsKnowledgeRows,
  appointmentsProcessPreset,
  defaultAppointmentsAvailability,
} from "@/lib/verticals/appointments/pack";

/**
 * Second vertical pack — beauty / coach appointment businesses.
 * NOT medical clinics. Same runAgentTurn + process engine as trades;
 * booking model is in-place appointment (no site-visit address step).
 */
export const appointmentsVerticalPack: VerticalPack = {
  id: "appointments",
  /** Primary owned Tenant.vertical; coach also resolves to this pack. */
  vertical: "beauty",
  labelHe: "תורים / פגישות",
  applyToTenant(tenant, ctx) {
    return applyAppointmentsPackToTenant(tenant, ctx?.niche);
  },
  knowledgeSeed(tenantId, ctx) {
    return appointmentsKnowledgeRows(tenantId, ctx?.niche);
  },
  processPreset: appointmentsProcessPreset,
  availabilityDefaults: defaultAppointmentsAvailability,
  slotPolicy: {
    model: "appointment",
    collectAddress: false,
  },
  qualificationQuestions: APPOINTMENTS_QUALIFICATION_QUESTIONS,
  classifierVocab: {
    problemReport: [
      "תור",
      "לקבוע",
      "פגישה",
      "טיפול",
      "תספורת",
      "מניקור",
      "אימון",
      "מפגש",
      "זמין",
      "פנוי",
    ],
    serviceInfo: ["מה כולל", "שירות", "טיפולים", "מחירון", "סוגי תורים"],
  },
  evalFixtureTag: "appointments",
};

export {
  APPOINTMENT_PACKS,
  APPOINTMENTS_QUALIFICATION_QUESTIONS,
  applyAppointmentsPackToTenant,
  appointmentsKnowledgeRows,
  appointmentsLandingCopy,
  appointmentsProcessPreset,
  defaultAppointmentsAvailability,
  resolveAppointmentKind,
  type AppointmentKind,
  type AppointmentNichePack,
} from "@/lib/verticals/appointments/pack";

export { APPOINTMENTS_EVAL_FIXTURES } from "@/lib/verticals/appointments/eval-fixtures";
