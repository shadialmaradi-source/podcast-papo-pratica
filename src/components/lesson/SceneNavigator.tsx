import React from 'react';
import { CheckCircle, PlayCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoScene {
  id: string;
  video_id: string;
  scene_index: number;
  start_time: number;
  end_time: number;
  scene_title: string;
  scene_transcript: string;
}

interface SceneNavigatorProps {
  scenes: VideoScene[];
  currentSceneIndex: number;
  completedScenes: number[];
  onSceneSelect: (sceneIndex: number) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SceneNavigator: React.FC<SceneNavigatorProps> = ({
  scenes,
  currentSceneIndex,
  completedScenes,
  onSceneSelect,
}) => {
  if (scenes.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Scenes ({completedScenes.length}/{scenes.length} completed)
      </h3>
      <div className="space-y-1">
        {scenes.map((scene) => {
          const isCompleted = completedScenes.includes(scene.scene_index);
          const isCurrent = scene.scene_index === currentSceneIndex;
          const isFuture = !isCompleted && !isCurrent;
          const duration = Math.round(scene.end_time - scene.start_time);

          return (
            <button
              key={scene.id}
              onClick={() => {
                if (isCompleted || isCurrent) {
                  onSceneSelect(scene.scene_index);
                }
              }}
              disabled={isFuture}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm",
                isCurrent && "bg-primary/10 border border-primary/30 text-foreground",
                isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground hover:bg-muted/80 cursor-pointer",
                isFuture && "opacity-50 cursor-not-allowed text-muted-foreground"
              )}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isCurrent ? (
                  <PlayCircle className="h-4 w-4 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium truncate text-xs",
                  isCurrent && "text-primary"
                )}>
                  Scene {scene.scene_index + 1} – {scene.scene_title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(scene.start_time)} – {formatTime(scene.end_time)} ({duration}s)
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SceneNavigator;
