export interface Language {
  code: string;
  name: string;
  flag: string;
  description: string;
}

export const languages: Language[] = [
  {
    code: "portuguese",
    name: "Português",
    flag: "🇧🇷",
    description: "Aprenda português brasileiro através de podcasts"
  },
  {
    code: "english", 
    name: "English",
    flag: "🇬🇧",
    description: "Learn English through podcasts"
  },
  {
    code: "italian",
    name: "Italiano", 
    flag: "🇮🇹",
    description: "Impara l'italiano attraverso i podcast"
  },
  {
    code: "spanish",
    name: "Español",
    flag: "🇪🇸",
    description: "Aprende español a través de podcasts"
  }
];

export const getLanguageFlag = (languageCode: string): string => {
  const language = languages.find(lang => lang.code === languageCode);
  return language?.flag || "🌐";
};

export const getLanguageName = (languageCode: string): string => {
  const language = languages.find(lang => lang.code === languageCode);
  return language?.name || languageCode;
};

export const getLanguageDescription = (languageCode: string): string => {
  const language = languages.find(lang => lang.code === languageCode);
  return language?.description || `Learn ${languageCode}`;
};

export const getLanguageByCode = (languageCode: string): Language | undefined => {
  return languages.find(lang => lang.code === languageCode);
};

// Map app language codes to Web Speech API BCP 47 language tags with correct regional accents
export const getLanguageSpeechCode = (languageCode: string): string => {
  const speechCodes: Record<string, string> = {
    portuguese: 'pt-BR',  // Brazilian Portuguese
    english: 'en-GB',     // British English
    spanish: 'es-ES',     // Spanish from Spain
    italian: 'it-IT',     // Italian
  };
  return speechCodes[languageCode.toLowerCase()] || 'en-GB';
};