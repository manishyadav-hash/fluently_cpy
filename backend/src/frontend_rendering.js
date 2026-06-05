const renderQuestion = (question) => {
  switch (question.question_type) {
    case 'mcq':
      return 'Render MCQ UI with options';

    case 'single_choice':
      return 'Render single choice UI';

    case 'speak_to_text':
      return 'Render microphone recording UI';

    case 'text_to_speech':
      return 'Render audio player UI';

    case 'fill_in_blank':
      return 'Render input box UI';

    default:
      return 'Unsupported question type';
  }
};