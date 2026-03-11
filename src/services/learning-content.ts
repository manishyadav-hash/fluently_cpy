import type { LessonType } from "@prisma/client";
import { env } from "../config/env";

export interface DefaultLessonSeed {
  backgroundImageUrl: string | null;
  durationLabel: string;
  id: string;
  instructions: string;
  order: number;
  promptText: string;
  title: string;
  type: LessonType;
}

export interface DefaultModuleSeed {
  id: string;
  lessons: DefaultLessonSeed[];
  title: string;
  weekNumber: number;
}

export function getDefaultCurriculum(): DefaultModuleSeed[] {
  const lessonImage = (lessonId: string) => `${env.CDN_BASE_URL}/lessons/${lessonId}_bg.jpg`;

  return [
    {
      id: "mod_w1",
      title: "Week 1 - Basics of Speaking",
      weekNumber: 1,
      lessons: [
        {
          backgroundImageUrl: lessonImage("les_001"),
          durationLabel: "5 min",
          id: "les_001",
          instructions: "Record yourself speaking for 60 seconds about your day.",
          order: 1,
          promptText: "Hi! I'm your AI English tutor. Let's start by recording a quick introduction.",
          title: "Yesterday's activities",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_002"),
          durationLabel: "3 min",
          id: "les_002",
          instructions: "Share a short story about your weekend.",
          order: 2,
          promptText: "Tell me about something interesting you did over the weekend.",
          title: "Your weekend story",
          type: "audio_response",
        },
        {
          backgroundImageUrl: lessonImage("les_003"),
          durationLabel: "5 min",
          id: "les_003",
          instructions: "Describe one thing you plan to do tomorrow.",
          order: 3,
          promptText: "Talk about your plans for tomorrow using complete sentences.",
          title: "Plans for tomorrow",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_004"),
          durationLabel: "2 min",
          id: "les_004",
          instructions: "Speak continuously for 90 seconds without pausing for long.",
          order: 4,
          promptText: "Keep speaking for 90 seconds about your favorite daily routine.",
          title: "90-sec fluency drill",
          type: "fluency_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_005"),
          durationLabel: "5 min",
          id: "les_005",
          instructions: "Practice a guided conversation with your tutor.",
          order: 5,
          promptText: "Imagine you are meeting a new colleague for the first time.",
          title: "Week 1 conversation",
          type: "conversation",
        },
      ],
    },
    {
      id: "mod_w2",
      title: "Week 2 - Talk About Yesterday",
      weekNumber: 2,
      lessons: [
        {
          backgroundImageUrl: lessonImage("les_006"),
          durationLabel: "4 min",
          id: "les_006",
          instructions: "Explain what happened in a recent meeting.",
          order: 1,
          promptText: "Describe something that happened yesterday at work or school.",
          title: "What happened yesterday",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_007"),
          durationLabel: "3 min",
          id: "les_007",
          instructions: "Retell a short personal story clearly and confidently.",
          order: 2,
          promptText: "Tell a short story about a memorable weekend moment.",
          title: "Retell a memory",
          type: "audio_response",
        },
        {
          backgroundImageUrl: lessonImage("les_008"),
          durationLabel: "4 min",
          id: "les_008",
          instructions: "Practice speaking in the past tense with fewer pauses.",
          order: 3,
          promptText: "Explain what you did from morning until evening yesterday.",
          title: "Past tense practice",
          type: "fluency_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_009"),
          durationLabel: "3 min",
          id: "les_009",
          instructions: "Respond naturally in a casual back-and-forth exchange.",
          order: 4,
          promptText: "Pretend a friend asks how your day went. Respond naturally.",
          title: "Casual catch-up",
          type: "conversation",
        },
        {
          backgroundImageUrl: lessonImage("les_010"),
          durationLabel: "5 min",
          id: "les_010",
          instructions: "Summarize a recent experience with clear sequencing.",
          order: 5,
          promptText: "Summarize a recent event in three clear parts: start, middle, end.",
          title: "Weekly recap",
          type: "speaking_drill",
        },
      ],
    },
    {
      id: "mod_w3",
      title: "Week 3 - Office Conversations",
      weekNumber: 3,
      lessons: [
        {
          backgroundImageUrl: lessonImage("les_011"),
          durationLabel: "4 min",
          id: "les_011",
          instructions: "Practice introducing yourself in a professional setting.",
          order: 1,
          promptText: "Introduce yourself to a new teammate and explain your role.",
          title: "Introduce yourself at work",
          type: "conversation",
        },
        {
          backgroundImageUrl: lessonImage("les_012"),
          durationLabel: "5 min",
          id: "les_012",
          instructions: "Present one update from your current work in a clear structure.",
          order: 2,
          promptText: "Give a short project status update to your manager.",
          title: "Project update",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_013"),
          durationLabel: "3 min",
          id: "les_013",
          instructions: "Answer follow-up questions with specific details.",
          order: 3,
          promptText: "Explain a challenge at work and how you handled it.",
          title: "Describe a challenge",
          type: "audio_response",
        },
        {
          backgroundImageUrl: lessonImage("les_014"),
          durationLabel: "3 min",
          id: "les_014",
          instructions: "Practice confident meeting phrases without hesitation.",
          order: 4,
          promptText: "Use phrases for agreeing, disagreeing, and asking for clarification.",
          title: "Meeting phrases",
          type: "fluency_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_015"),
          durationLabel: "5 min",
          id: "les_015",
          instructions: "Simulate a full office conversation with polite turn-taking.",
          order: 5,
          promptText: "Role-play a conversation about deadlines and next steps.",
          title: "Office role-play",
          type: "conversation",
        },
      ],
    },
    {
      id: "mod_w4",
      title: "Week 4 - Confident Everyday English",
      weekNumber: 4,
      lessons: [
        {
          backgroundImageUrl: lessonImage("les_016"),
          durationLabel: "4 min",
          id: "les_016",
          instructions: "Practice starting a conversation in a public place.",
          order: 1,
          promptText: "Ask for directions and confirm what you heard.",
          title: "Ask for directions",
          type: "conversation",
        },
        {
          backgroundImageUrl: lessonImage("les_017"),
          durationLabel: "3 min",
          id: "les_017",
          instructions: "Describe a routine task using natural transitions.",
          order: 2,
          promptText: "Explain how you usually prepare for your day.",
          title: "Daily routine explanation",
          type: "speaking_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_018"),
          durationLabel: "4 min",
          id: "les_018",
          instructions: "Practice responding quickly with fewer filler words.",
          order: 3,
          promptText: "Answer common everyday questions in a fluent way.",
          title: "Quick response drill",
          type: "fluency_drill",
        },
        {
          backgroundImageUrl: lessonImage("les_019"),
          durationLabel: "3 min",
          id: "les_019",
          instructions: "Tell a short story from your day with a clear sequence.",
          order: 4,
          promptText: "Tell me about a small but interesting moment from your day.",
          title: "Tell a short story",
          type: "audio_response",
        },
        {
          backgroundImageUrl: lessonImage("les_020"),
          durationLabel: "5 min",
          id: "les_020",
          instructions: "Complete a final conversation that uses what you have practiced.",
          order: 5,
          promptText: "Have a confident, natural conversation about work and daily life.",
          title: "Final conversation",
          type: "conversation",
        },
      ],
    },
  ];
}
