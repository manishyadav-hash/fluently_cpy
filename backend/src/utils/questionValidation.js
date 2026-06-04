const QUESTION_TYPES = {
  MCQ: 'mcq',
  SINGLE_CHOICE: 'single_choice',
  SPEAK_TO_TEXT: 'speak_to_text',
  TEXT_TO_SPEECH: 'text_to_speech',
  FILL_IN_BLANK: 'fill_in_blank'
};

const validateQuestionByType = ({
  question_type,
  question,
  correct_answer,
  audio_url
}) => {
  const validTypes = Object.values(QUESTION_TYPES);

  if (!validTypes.includes(question_type)) {
    return 'Invalid question type';
  }

  if (!question) {
    return 'Question text is required';
  }

  if (question_type === QUESTION_TYPES.MCQ && !correct_answer) {
    return 'Correct answer is required for MCQ';
  }

  if (question_type === QUESTION_TYPES.SINGLE_CHOICE && !correct_answer) {
    return 'Correct answer is required for single choice';
  }

  if (question_type === QUESTION_TYPES.SPEAK_TO_TEXT && !correct_answer) {
    return 'Expected sentence is required for speak to text';
  }

  if (question_type === QUESTION_TYPES.TEXT_TO_SPEECH && !audio_url) {
    return 'Audio URL is required for text to speech';
  }

  if (question_type === QUESTION_TYPES.FILL_IN_BLANK && !correct_answer) {
    return 'Correct answer is required for fill in the blank';
  }

  return null;
};

module.exports = {
  QUESTION_TYPES,
  validateQuestionByType
};

