import {
  createSupportAgentNote,
  listSupportAgentNotes,
  StoreError
} from "@/lib/store/mock-store";
import { ServiceError } from "@/lib/service-error";

export interface CreateSupportNoteBody {
  body?: string;
}

export async function getConversationNotesResult(
  conversationId: string,
  actorUserId: string
) {
  try {
    const notes = await listSupportAgentNotes(conversationId, actorUserId);
    return { notes };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to load support notes.");
  }
}

export async function createConversationNoteResult(
  conversationId: string,
  body: CreateSupportNoteBody,
  actorUserId: string
) {
  const noteBody = body.body?.trim();
  if (!noteBody) {
    throw new ServiceError(400, "body is required.");
  }

  try {
    const note = await createSupportAgentNote(conversationId, noteBody, actorUserId);
    return { note };
  } catch (error) {
    if (error instanceof StoreError) {
      throw new ServiceError(error.status, error.message);
    }
    throw new ServiceError(500, "Unable to create support note.");
  }
}
