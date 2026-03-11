import type { ChatConversationRecord, ChatMessageRecord } from "../repositories/chat.repository";

export function serializeChatSuggestion(suggestion: { id: string; label: string; prompt: string }) {
  return suggestion;
}

export function serializeConversation(conversation: ChatConversationRecord) {
  return {
    id: conversation.id,
    user_id: conversation.userId,
    created_at: conversation.createdAt.toISOString(),
    last_message_at: conversation.lastMessageAt ? conversation.lastMessageAt.toISOString() : null,
    message_count: conversation.messageCount,
  };
}

export function serializeChatMessage(message: ChatMessageRecord) {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt.toISOString(),
  };
}

export function serializeChatMessages(messages: ChatMessageRecord[]) {
  return messages.map(serializeChatMessage);
}

export function serializeSendMessageResult(result: {
  tutorMessage: ChatMessageRecord;
  userMessage: ChatMessageRecord;
}) {
  return {
    user_message: serializeChatMessage(result.userMessage),
    tutor_message: serializeChatMessage(result.tutorMessage),
  };
}
