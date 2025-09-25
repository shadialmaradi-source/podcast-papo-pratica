// Translation system for exercise completion screen
export type LanguageCode = 'en' | 'it' | 'pt';

export const translations = {
  en: {
    exerciseComplete: 'Exercise Complete!',
    xpEarned: 'XP Earned',
    accuracy: 'Accuracy',
    correct: 'Correct',
    whatsNext: "What's Next?",
    continueJourney: 'Continue your learning journey!',
    tryIntenseMode: 'Try Intense Mode',
    continueToIntermediate: 'Continue to Intermediate',
    continueToAdvanced: 'Continue to Advanced',
    continueLearning: 'Continue Learning',
    chooseAnotherPodcast: 'Choose another podcast',
    backToEpisode: 'Back to Episode',
    congratulations: 'Congratulations!',
    correctAnswer: 'Correct!',
    incorrectAnswer: 'Incorrect',
    tryAgain: 'Try again'
  },
  it: {
    exerciseComplete: 'Esercizio Completato!',
    xpEarned: 'XP Guadagnati',
    accuracy: 'Precisione',
    correct: 'Corrette',
    whatsNext: 'Cosa Facciamo Dopo?',
    continueJourney: 'Continua il tuo percorso di apprendimento!',
    tryIntenseMode: 'Prova la Modalità Intensa',
    continueToIntermediate: 'Continua al Livello Intermedio',
    continueToAdvanced: 'Continua al Livello Avanzato',
    continueLearning: 'Continua ad Imparare',
    chooseAnotherPodcast: 'Scegli un altro podcast',
    backToEpisode: 'Torna all\'Episodio',
    congratulations: 'Congratulazioni!',
    correctAnswer: 'Corretto!',
    incorrectAnswer: 'Sbagliato',
    tryAgain: 'Riprova'
  },
  pt: {
    exerciseComplete: 'Exercício Completo!',
    xpEarned: 'XP Ganhos',
    accuracy: 'Precisão',
    correct: 'Corretas',
    whatsNext: 'O Que Vem Agora?',
    continueJourney: 'Continue sua jornada de aprendizado!',
    tryIntenseMode: 'Experimente o Modo Intenso',
    continueToIntermediate: 'Continue para Intermediário',
    continueToAdvanced: 'Continue para Avançado',
    continueLearning: 'Continue Aprendendo',
    chooseAnotherPodcast: 'Escolha outro podcast',
    backToEpisode: 'Voltar ao Episódio',
    congratulations: 'Parabéns!',
    correctAnswer: 'Correto!',
    incorrectAnswer: 'Incorreto',
    tryAgain: 'Tente novamente'
  }
};

export function getTranslation(key: keyof typeof translations.en, languageCode: LanguageCode = 'en'): string {
  return translations[languageCode]?.[key] || translations.en[key];
}

export function mapLanguageToCode(language: string): LanguageCode {
  const mapping: Record<string, LanguageCode> = {
    'italian': 'it',
    'portuguese': 'pt',
    'english': 'en',
    'it': 'it',
    'pt': 'pt',
    'en': 'en'
  };
  return mapping[language.toLowerCase()] || 'en';
}