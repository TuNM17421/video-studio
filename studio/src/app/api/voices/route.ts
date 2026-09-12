import { handle } from "@/lib/server/http";
import { envVoiceId, listVoices } from "@/lib/server/voice";

/** The account's voices for the picker, plus the id already set for the CLI as a starting point. */
export const GET = handle(async () => Response.json({ voices: await listVoices(), envVoiceId: envVoiceId() }));
