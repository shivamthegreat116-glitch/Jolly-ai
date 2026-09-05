import { NextResponse } from "next/server";

export async function GET() {
  const referrals = [
    {
      name: "Tele-MANAS (Mental Health Helpline)",
      contact: "14416 or 1800-891-4416",
      service_type: "helpline",
      notes: "Free 24x7 mental health support by Government of India (MoHFW / NIMHANS).",
    },
    {
      name: "National Emergency Number",
      contact: "112",
      service_type: "emergency",
      notes: "Immediate police, fire, medical ambulance assistance across India.",
    },
    {
      name: "National Helpline Against Atrocities (NHAA)",
      contact: "14566",
      service_type: "government",
      notes: "Toll-free 24x7 support for victims of discrimination or atrocities (MoSJE).",
    },
    {
      name: "KIRAN Mental Health Rehabilitation",
      contact: "1800-599-0019",
      service_type: "helpline",
      notes: "24x7 psychosocial rehabilitation helpline by DEPwD.",
    },
  ];
  return NextResponse.json(referrals);
}
