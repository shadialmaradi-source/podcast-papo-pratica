import { useAuth } from "./useAuth";
import { getTranslation, mapLanguageToCode, type LanguageCode } from "@/utils/translations";
import { translations } from "@/utils/translations";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectUILanguage } from "@/utils/browserLanguage";

export function useTranslation(preferredLanguage?: string | null) {
  const { user } = useAuth();
  const [languageCode, setLanguageCode] = useState<LanguageCode>(() => {
    const onboardingNative = localStorage.getItem("onboarding_native_language");
    return onboardingNative ? mapLanguageToCode(onboardingNative) : detectUILanguage();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (preferredLanguage) {
      setLanguageCode(mapLanguageToCode(preferredLanguage));
      setLoading(false);
      return;
    }

    const fetchUserLanguage = async () => {
      if (!user) {
        const onboardingNative = localStorage.getItem("onboarding_native_language");
        setLanguageCode(onboardingNative ? mapLanguageToCode(onboardingNative) : detectUILanguage());
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('user_id', user.id)
          .single();

        const onboardingNative = localStorage.getItem("onboarding_native_language");
        const uiLanguage = profile?.native_language || onboardingNative;
        if (uiLanguage) {
          setLanguageCode(mapLanguageToCode(uiLanguage));
        } else {
          setLanguageCode(detectUILanguage());
        }
      } catch (error) {
        console.error('Error fetching user language:', error);
        setLanguageCode(detectUILanguage());
      } finally {
        setLoading(false);
      }
    };

    fetchUserLanguage();
  }, [user, preferredLanguage]);

  const t = (key: keyof typeof translations.en): string => {
    return getTranslation(key, languageCode);
  };

  return { t, languageCode, loading };
}
