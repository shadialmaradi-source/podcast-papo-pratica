import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { languages } from "@/utils/languageUtils";
import { useTranslation } from "@/hooks/useTranslation";

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLanguageSelect: (languageCode: string) => void;
  currentLanguage?: string;
}

export const LanguageSelectionModal = ({ 
  isOpen, 
  onClose, 
  onLanguageSelect, 
  currentLanguage 
}: LanguageSelectionModalProps) => {
  const { t } = useTranslation();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl sm:text-3xl font-bold">
            {t('switchLanguage')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
          {languages.map((language) => (
            <Card 
              key={language.code}
              className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                currentLanguage === language.code 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'bg-card/50 backdrop-blur-sm border-border/50'
              }`}
              onClick={() => onLanguageSelect(language.code)}
            >
              <CardHeader className="text-center pb-3">
                <div className="text-4xl sm:text-5xl mb-3">{language.flag}</div>
                <CardTitle className="text-lg sm:text-xl">
                  {language.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-sm mb-4 px-2">
                  {language.description}
                </CardDescription>
                <Button 
                  variant={currentLanguage === language.code ? "default" : "outline"}
                  className="w-full text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLanguageSelect(language.code);
                  }}
                >
                  {currentLanguage === language.code ? t('currentLanguage') : `${t('switchTo')} ${language.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};