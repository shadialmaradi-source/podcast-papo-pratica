import { useAuth } from "./useAuth";
import { getTranslation, mapLanguageToCode, type LanguageCode } from "@/utils/translations";
import { translations } from "@/utils/translations";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectUILanguage } from "@/utils/browserLanguage";

export function useTranslation() {
  const { user } = useAuth();
  const [languageCode, setLanguageCode] = useState<LanguageCode>(() => detectUILanguage());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!user) {
        setLanguageCode(detectUILanguage());
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('selected_language')
          .eq('user_id', user.id)
          .single();

        if (profile?.selected_language) {
          setLanguageCode(mapLanguageToCode(profile.selected_language));
        }
      } catch (error) {
        console.error('Error fetching user language:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserLanguage();
  }, [user]);

  const t = (key: keyof typeof translations.en): string => {
    return getTranslation(key, languageCode);
  };

  return { t, languageCode, loading };
}
