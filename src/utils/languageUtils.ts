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
    description: "Learn Brazilian Portuguese through podcasts"
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