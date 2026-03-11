interface TutorReplyInput {
  content: string;
  userId: string;
}

export interface ChatTutorServiceContract {
  generateReply(input: TutorReplyInput): Promise<string>;
  streamReply(input: TutorReplyInput): AsyncIterable<string>;
}

export class PlaceholderChatTutorService implements ChatTutorServiceContract {
  async generateReply(input: TutorReplyInput): Promise<string> {
    const content = input.content.toLowerCase();

    if (content.includes("travel") || content.includes("london")) {
      return "That's exciting! London is beautiful. Let's start with navigating public transport. Try saying: 'Where is the nearest Underground station?'";
    }

    if (content.includes("grammar")) {
      return "Sure. Share one sentence you're unsure about, and I'll help you fix the grammar and explain why.";
    }

    if (content.includes("vocabulary")) {
      return "Let's grow your vocabulary. Tell me a topic you want to talk about, and I'll give you useful words and phrases.";
    }

    return "Absolutely. Tell me a little more about what you want to practice, and I'll guide you step by step.";
  }

  async *streamReply(input: TutorReplyInput): AsyncIterable<string> {
    const reply = await this.generateReply(input);
    const chunks = reply.match(/[^.!?]+[.!?]?\s*/g) ?? [reply];

    for (const chunk of chunks) {
      yield chunk;
    }
  }
}
