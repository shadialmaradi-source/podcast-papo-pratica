import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Search, 
  Plus, 
  Star, 
  TrendingUp,
  ArrowLeft,
  Brain,
  Target,
  Calendar,
  BarChart3
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  getVocabularyStats,
  getVocabularyByLevel,
  searchVocabulary,
  getUserVocabularyProgress,
  VocabularyWord,
  VocabularyProgress 
} from "@/services/vocabularyService";

interface VocabularyManagerProps {
  onBack: () => void;
  onStartReview: () => void;
}

export const VocabularyManager = ({ onBack, onStartReview }: VocabularyManagerProps) => {
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("italian");
  const [selectedLevel, setSelectedLevel] = useState("beginner");
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [userProgress, setUserProgress] = useState<VocabularyProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedLanguage, selectedLevel]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const vocabularyStats = await getVocabularyStats();
      setStats(vocabularyStats);
      
      // Load vocabulary words by level
      const words = await getVocabularyByLevel(selectedLanguage, selectedLevel);
      setVocabularyWords(words);
      
      // Load user progress for these words
      if (words.length > 0) {
        const wordIds = words.map(w => w.id);
        const progress = await getUserVocabularyProgress(wordIds);
        setUserProgress(progress);
      }
      
    } catch (error) {
      console.error('Error loading vocabulary data:', error);
      toast({
        title: "Error",
        description: "Failed to load vocabulary data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    try {
      const results = await searchVocabulary(searchQuery, selectedLanguage);
      setVocabularyWords(results);
      
      if (results.length > 0) {
        const wordIds = results.map(w => w.id);
        const progress = await getUserVocabularyProgress(wordIds);
        setUserProgress(progress);
      } else {
        setUserProgress([]);
      }
    } catch (error) {
      console.error('Error searching vocabulary:', error);
      toast({
        title: "Error",
        description: "Failed to search vocabulary",
        variant: "destructive",
      });
    }
  };

  const getProgressForWord = (wordId: string) => {
    return userProgress.find(p => p.word_id === wordId);
  };

  const getMasteryColor = (level: number) => {
    if (level === 0) return "bg-gray-200";
    if (level < 3) return "bg-yellow-200";
    if (level < 5) return "bg-blue-200";
    return "bg-green-200";
  };

  const getMasteryText = (level: number) => {
    if (level === 0) return "New";
    if (level < 3) return "Learning";
    if (level < 5) return "Familiar";
    return "Mastered";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Vocabulary Manager</h1>
        </div>
        
        <Button onClick={onStartReview} className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Start Review
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats.total_words}</p>
              <p className="text-sm text-muted-foreground">Total Words</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.learned_words}</p>
              <p className="text-sm text-muted-foreground">Learned</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{Math.round(stats.accuracy)}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats.review_due}</p>
              <p className="text-sm text-muted-foreground">Due Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Words</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Find Vocabulary</CardTitle>
              <CardDescription>Search and filter vocabulary words</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search words</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="Search vocabulary..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Level</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vocabulary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vocabularyWords.map((word) => {
              const progress = getProgressForWord(word.id);
              const masteryLevel = progress?.mastery_level || 0;
              
              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{word.word}</CardTitle>
                        <Badge 
                          variant="secondary" 
                          className={getMasteryColor(masteryLevel)}
                        >
                          {getMasteryText(masteryLevel)}
                        </Badge>
                      </div>
                      <CardDescription>{word.definition}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {word.translation && (
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Translation:</strong> {word.translation}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{word.difficulty_level}</Badge>
                        
                        {progress && (
                          <div className="text-right text-xs text-muted-foreground">
                            <p>Seen {progress.times_seen}x</p>
                            <p>{progress.times_correct}/{progress.times_seen} correct</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          
          {vocabularyWords.length === 0 && (
            <Card>
              <CardContent className="text-center p-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No vocabulary found</p>
                <p className="text-muted-foreground">
                  Try searching or changing the filters
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
              <CardDescription>Track your vocabulary mastery over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-4 h-4 bg-gray-200 rounded mx-auto mb-1"></div>
                  <p className="text-sm">New</p>
                  <p className="font-bold">{userProgress.filter(p => p.mastery_level === 0).length}</p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-yellow-200 rounded mx-auto mb-1"></div>
                  <p className="text-sm">Learning</p>
                  <p className="font-bold">{userProgress.filter(p => p.mastery_level > 0 && p.mastery_level < 3).length}</p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-blue-200 rounded mx-auto mb-1"></div>
                  <p className="text-sm">Familiar</p>
                  <p className="font-bold">{userProgress.filter(p => p.mastery_level >= 3 && p.mastery_level < 5).length}</p>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-200 rounded mx-auto mb-1"></div>
                  <p className="text-sm">Mastered</p>
                  <p className="font-bold">{userProgress.filter(p => p.mastery_level >= 5).length}</p>
                </div>
              </div>
              
              <Button onClick={onStartReview} className="w-full">
                <Brain className="h-4 w-4 mr-2" />
                Review Vocabulary ({userProgress.filter(p => !p.is_learned).length} words due)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  By Language
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.entries(stats.by_language).map(([lang, count]) => (
                  <div key={lang} className="flex justify-between items-center mb-2">
                    <span className="capitalize">{lang}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Difficulty Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  By Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.entries(stats.by_difficulty).map(([diff, count]) => (
                  <div key={diff} className="flex justify-between items-center mb-2">
                    <span className="capitalize">{diff}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};