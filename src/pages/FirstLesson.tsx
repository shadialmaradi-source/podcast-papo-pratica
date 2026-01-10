import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LessonIntro from "@/components/lesson/LessonIntro";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import LessonExercises from "@/components/lesson/LessonExercises";
import LessonSpeaking from "@/components/lesson/LessonSpeaking";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import LessonComplete from "@/components/lesson/LessonComplete";

type LessonStep = 'intro' | 'video' | 'exercises' | 'speaking' | 'flashcards' | 'complete';

interface VideoData {
  youtubeId: string;
  startTime: number;
  duration: number;
  suggestedSpeed: number;
  transcript: string;
}

interface SpeakingPhrase {
  phrase: string;
  translation: string;
  why: string;
}

interface Exercise {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'sequencing' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface Flashcard {
  phrase: string;
  translation: string;
  why: string;
}

// Hardcoded lesson content by level
const lessonContent: Record<string, {
  video: VideoData;
  exercises: Exercise[];
  speakingPhrases: SpeakingPhrase[];
  flashcards: Flashcard[];
}> = {
  absolute_beginner: {
    video: {
      youtubeId: '8mGM4wAu6Aw',
      startTime: 30,
      duration: 60,
      suggestedSpeed: 0.8,
      transcript: 'Mujer: Hola, ¿una mesa para uno? Camarero: Sí, aquí. Mujer: Quiero un café con leche.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: '¿Qué pide la mujer al principio?', options: ['Una mesa', 'Un café', 'La cuenta'], correctAnswer: 'Una mesa', explanation: 'La mujer dice "Hola, ¿una mesa para uno?" al llegar al restaurante.' },
      { id: '2', type: 'multiple_choice', question: '¿Para cuántas personas es la mesa?', options: ['Una persona', 'Dos personas', 'Tres personas'], correctAnswer: 'Una persona', explanation: 'La mujer pide "una mesa para uno", indicando que está sola.' },
      { id: '3', type: 'multiple_choice', question: '¿Qué bebida pide la mujer?', options: ['Agua', 'Café con leche', 'Vino'], correctAnswer: 'Café con leche', explanation: 'La mujer dice "Quiero un café con leche".' },
      { id: '4', type: 'fill_blank', question: 'Completa: "Hola, ¿una ___ para uno?"', correctAnswer: 'mesa', explanation: '"Mesa" significa "table" en inglés. Es la palabra clave para pedir una mesa en un restaurante.' },
      { id: '5', type: 'multiple_choice', question: '¿Quién trabaja en el restaurante?', options: ['La mujer', 'El camarero', 'El cocinero'], correctAnswer: 'El camarero', explanation: 'El camarero es la persona que atiende a los clientes en el restaurante.' },
      { id: '6', type: 'multiple_choice', question: '¿Dónde está la escena?', options: ['En casa', 'En un restaurante', 'En la calle'], correctAnswer: 'En un restaurante', explanation: 'La conversación sobre mesas y café indica que están en un restaurante o cafetería.' },
      { id: '7', type: 'fill_blank', question: 'Completa: "Quiero un ___ con leche"', correctAnswer: 'café', explanation: '"Café con leche" es una bebida muy popular en España y Latinoamérica.' },
      { id: '8', type: 'multiple_choice', question: '¿Qué palabra significa "waiter" en español?', options: ['Mesa', 'Café', 'Camarero'], correctAnswer: 'Camarero', explanation: 'Camarero es la persona que sirve en un restaurante.' },
      { id: '9', type: 'sequencing', question: '¿Cuál es el orden correcto?', options: ['Llegar → Pedir mesa → Pedir bebida', 'Pedir bebida → Llegar → Pedir mesa', 'Pedir mesa → Pedir bebida → Llegar'], correctAnswer: 'Llegar → Pedir mesa → Pedir bebida', explanation: 'Primero llegas, luego pides una mesa, y finalmente pides tu bebida.' },
      { id: '10', type: 'matching', question: '¿Qué significa "Quiero"?', options: ['I have', 'I want', 'I like'], correctAnswer: 'I want', explanation: '"Quiero" viene del verbo "querer" que significa "to want".' }
    ],
    speakingPhrases: [
      { phrase: 'Hola, una mesa por favor', translation: 'Hello, a table please', why: 'Use this in any restaurant across Spain/Latin America' },
      { phrase: 'Quiero un café con leche', translation: 'I want a coffee with milk', why: 'Order any drink by saying "Quiero un/una..."' },
      { phrase: 'La cuenta, por favor', translation: 'The bill, please', why: 'Essential phrase for asking for the bill' }
    ],
    flashcards: [
      { phrase: 'Hola', translation: 'Hello', why: 'The most common Spanish greeting - use it everywhere!' },
      { phrase: 'Una mesa para uno', translation: 'A table for one', why: 'Change "uno" to "dos, tres, cuatro" for more people' },
      { phrase: 'Quiero', translation: 'I want', why: 'Essential verb for ordering anything' },
      { phrase: 'Café con leche', translation: 'Coffee with milk', why: 'A popular coffee order throughout the Spanish-speaking world' },
      { phrase: 'Por favor', translation: 'Please', why: 'Always add this to be polite!' }
    ]
  },
  beginner: {
    video: {
      youtubeId: '8mGM4wAu6Aw',
      startTime: 60,
      duration: 75,
      suggestedSpeed: 1.0,
      transcript: 'Cliente: Hola, una mesa. Mesero: ¿Para cuántos? Cliente: Para uno. Quiero el menú del día.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: '¿Qué pregunta el mesero?', options: ['¿Qué quiere?', '¿Para cuántos?', '¿Cómo está?'], correctAnswer: '¿Para cuántos?', explanation: 'El mesero pregunta cuántas personas van a comer.' },
      { id: '2', type: 'multiple_choice', question: '¿Qué pide el cliente?', options: ['Una bebida', 'El menú del día', 'La cuenta'], correctAnswer: 'El menú del día', explanation: 'El cliente pide "el menú del día", un menú especial con precio fijo.' },
      { id: '3', type: 'fill_blank', question: 'Completa: "¿Para ___?"', correctAnswer: 'cuántos', explanation: '"¿Para cuántos?" pregunta el número de personas.' },
      { id: '4', type: 'multiple_choice', question: '¿Cuántas personas van a comer?', options: ['Una', 'Dos', 'Tres'], correctAnswer: 'Una', explanation: 'El cliente dice "Para uno".' },
      { id: '5', type: 'multiple_choice', question: '¿Qué es "el menú del día"?', options: ['Menú especial diario', 'Menú de desayuno', 'Menú infantil'], correctAnswer: 'Menú especial diario', explanation: 'Es un menú con precio fijo que cambia cada día.' },
      { id: '6', type: 'fill_blank', question: 'Completa: "Quiero el ___ del día"', correctAnswer: 'menú', explanation: '"Menú del día" es una oferta especial en restaurantes españoles.' },
      { id: '7', type: 'multiple_choice', question: '¿Quién atiende al cliente?', options: ['El cocinero', 'El mesero', 'El dueño'], correctAnswer: 'El mesero', explanation: 'El mesero (o camarero) es quien atiende las mesas.' },
      { id: '8', type: 'matching', question: '¿Qué significa "menú"?', options: ['Drink', 'Menu', 'Table'], correctAnswer: 'Menu', explanation: '"Menú" en español es lo mismo que "menu" en inglés.' },
      { id: '9', type: 'sequencing', question: 'Ordena la conversación:', options: ['Saludo → Pregunta del mesero → Respuesta del cliente', 'Respuesta → Saludo → Pregunta', 'Pregunta → Respuesta → Saludo'], correctAnswer: 'Saludo → Pregunta del mesero → Respuesta del cliente', explanation: 'Primero saludas, el mesero pregunta, y luego respondes.' },
      { id: '10', type: 'multiple_choice', question: '¿Dónde ocurre esta conversación?', options: ['En casa', 'En un restaurante', 'En una tienda'], correctAnswer: 'En un restaurante', explanation: 'La conversación sobre mesa y menú indica un restaurante.' }
    ],
    speakingPhrases: [
      { phrase: 'Hola, una mesa por favor', translation: 'Hello, a table please', why: 'Start every restaurant visit with this phrase' },
      { phrase: 'Para uno, por favor', translation: 'For one, please', why: 'Change the number for your group size' },
      { phrase: 'Quiero el menú del día', translation: 'I want the daily menu', why: 'A great way to try local dishes at a fixed price' }
    ],
    flashcards: [
      { phrase: '¿Para cuántos?', translation: 'For how many?', why: 'Common question at restaurants' },
      { phrase: 'El menú del día', translation: 'The daily menu', why: 'A set menu offered at many Spanish restaurants' },
      { phrase: 'Para uno', translation: 'For one', why: 'Change "uno" to any number' },
      { phrase: 'Mesero/Camarero', translation: 'Waiter', why: 'Mesero is used in Latin America, Camarero in Spain' },
      { phrase: 'Por favor', translation: 'Please', why: 'Essential politeness word' }
    ]
  },
  intermediate: {
    video: {
      youtubeId: '8mGM4wAu6Aw',
      startTime: 120,
      duration: 75,
      suggestedSpeed: 1.0,
      transcript: 'Cliente: Pedí el pollo pero me trajeron pescado. Mesero: Lo siento mucho. Se lo cambio ahora mismo.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: '¿Cuál es el problema del cliente?', options: ['La comida está fría', 'Le trajeron el plato equivocado', 'La cuenta está mal'], correctAnswer: 'Le trajeron el plato equivocado', explanation: 'El cliente pidió pollo pero recibió pescado.' },
      { id: '2', type: 'multiple_choice', question: '¿Qué pidió el cliente originalmente?', options: ['Pescado', 'Pollo', 'Carne'], correctAnswer: 'Pollo', explanation: 'El cliente dice "Pedí el pollo".' },
      { id: '3', type: 'fill_blank', question: 'Completa: "Lo ___ mucho"', correctAnswer: 'siento', explanation: '"Lo siento" es la forma de disculparse en español.' },
      { id: '4', type: 'multiple_choice', question: '¿Qué significa "Se lo cambio"?', options: ['I\'ll bring you more', 'I\'ll change it for you', 'I\'ll give you a discount'], correctAnswer: 'I\'ll change it for you', explanation: 'El mesero ofrece cambiar el plato incorrecto.' },
      { id: '5', type: 'multiple_choice', question: '¿Qué recibió el cliente por error?', options: ['Pollo', 'Pescado', 'Carne'], correctAnswer: 'Pescado', explanation: 'Le trajeron pescado en lugar de pollo.' },
      { id: '6', type: 'fill_blank', question: 'Completa: "Se lo cambio ___ mismo"', correctAnswer: 'ahora', explanation: '"Ahora mismo" significa "right now".' },
      { id: '7', type: 'multiple_choice', question: '¿Cómo reacciona el mesero?', options: ['Se enoja', 'Se disculpa', 'Ignora al cliente'], correctAnswer: 'Se disculpa', explanation: 'El mesero dice "Lo siento mucho" mostrando disculpas.' },
      { id: '8', type: 'matching', question: '¿Qué significa "pedí"?', options: ['I asked', 'I ordered', 'I wanted'], correctAnswer: 'I ordered', explanation: '"Pedí" es el pasado del verbo "pedir" (to order).' },
      { id: '9', type: 'sequencing', question: '¿Cuál es el orden lógico?', options: ['Error → Queja → Disculpa → Solución', 'Queja → Error → Solución → Disculpa', 'Solución → Queja → Error → Disculpa'], correctAnswer: 'Error → Queja → Disculpa → Solución', explanation: 'Primero ocurre el error, luego la queja, la disculpa, y finalmente la solución.' },
      { id: '10', type: 'multiple_choice', question: '¿Esta conversación es formal o informal?', options: ['Formal', 'Informal', 'Muy informal'], correctAnswer: 'Formal', explanation: 'El uso de "usted" implícito y "Se lo cambio" indica formalidad.' }
    ],
    speakingPhrases: [
      { phrase: 'Pedí el pollo pero me trajeron pescado', translation: 'I ordered chicken but they brought me fish', why: 'Pattern: "Pedí X pero me trajeron Y" for any order mistake' },
      { phrase: 'Lo siento mucho', translation: 'I\'m very sorry', why: 'Standard apology phrase' },
      { phrase: 'Se lo cambio ahora mismo', translation: 'I\'ll change it for you right now', why: 'Professional way to offer a solution' }
    ],
    flashcards: [
      { phrase: 'Pedí', translation: 'I ordered', why: 'Past tense of "pedir" - use for what you ordered' },
      { phrase: 'Me trajeron', translation: 'They brought me', why: 'Use this to describe what was delivered' },
      { phrase: 'Lo siento mucho', translation: 'I\'m very sorry', why: 'Stronger than just "lo siento"' },
      { phrase: 'Ahora mismo', translation: 'Right now', why: 'Emphasizes immediacy' },
      { phrase: 'Se lo cambio', translation: 'I\'ll change it for you', why: 'Formal way of offering to fix something' }
    ]
  },
  advanced: {
    video: {
      youtubeId: '8mGM4wAu6Aw',
      startTime: 200,
      duration: 90,
      suggestedSpeed: 1.2,
      transcript: 'Cliente: Mire, llevo esperando media hora y todavía no me han traído la comida. Esto es inaceptable. Quiero hablar con el gerente. Mesero: Tiene toda la razón, señor. Permítame verificar qué pasó con su pedido.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: '¿Cuánto tiempo ha esperado el cliente?', options: ['15 minutos', '30 minutos', '1 hora'], correctAnswer: '30 minutos', explanation: 'El cliente dice "llevo esperando media hora".' },
      { id: '2', type: 'multiple_choice', question: '¿Cómo describe el cliente la situación?', options: ['Normal', 'Aceptable', 'Inaceptable'], correctAnswer: 'Inaceptable', explanation: 'El cliente dice explícitamente "Esto es inaceptable".' },
      { id: '3', type: 'fill_blank', question: 'Completa: "Quiero hablar con el ___"', correctAnswer: 'gerente', explanation: '"Gerente" es el manager o responsable del establecimiento.' },
      { id: '4', type: 'multiple_choice', question: '¿Qué significa "Tiene toda la razón"?', options: ['You\'re wrong', 'You\'re absolutely right', 'I don\'t understand'], correctAnswer: 'You\'re absolutely right', explanation: 'Es una forma formal de dar la razón al cliente.' },
      { id: '5', type: 'multiple_choice', question: '¿Qué ofrece hacer el mesero?', options: ['Traer la comida', 'Verificar el pedido', 'Llamar al gerente'], correctAnswer: 'Verificar el pedido', explanation: 'El mesero dice "Permítame verificar qué pasó con su pedido".' },
      { id: '6', type: 'fill_blank', question: 'Completa: "Llevo esperando ___ hora"', correctAnswer: 'media', explanation: '"Media hora" significa 30 minutos.' },
      { id: '7', type: 'multiple_choice', question: '¿Qué registro de lenguaje usa el cliente?', options: ['Muy informal', 'Neutral', 'Formal con queja firme'], correctAnswer: 'Formal con queja firme', explanation: 'Usa "Mire", "usted" implícito y vocabulario formal.' },
      { id: '8', type: 'matching', question: '¿Qué significa "Permítame"?', options: ['Let me', 'Excuse me', 'Help me'], correctAnswer: 'Let me', explanation: '"Permítame" es una forma formal de "let me".' },
      { id: '9', type: 'sequencing', question: '¿Cuál es la estructura de la queja?', options: ['Problema → Tiempo → Evaluación → Demanda', 'Demanda → Problema → Tiempo → Evaluación', 'Evaluación → Tiempo → Problema → Demanda'], correctAnswer: 'Problema → Tiempo → Evaluación → Demanda', explanation: 'El cliente primero explica el problema, cuánto tiempo, su opinión, y finalmente qué quiere.' },
      { id: '10', type: 'multiple_choice', question: '¿Cómo maneja la situación el mesero?', options: ['Defensivamente', 'Profesionalmente', 'Indiferentemente'], correctAnswer: 'Profesionalmente', explanation: 'El mesero valida la queja y ofrece investigar.' }
    ],
    speakingPhrases: [
      { phrase: 'Llevo esperando media hora', translation: 'I\'ve been waiting for half an hour', why: 'Pattern: "Llevo + gerund + time" for ongoing duration' },
      { phrase: 'Quiero hablar con el gerente', translation: 'I want to speak with the manager', why: 'Direct but formal way to escalate an issue' },
      { phrase: 'Tiene toda la razón', translation: 'You\'re absolutely right', why: 'Professional way to acknowledge a valid complaint' }
    ],
    flashcards: [
      { phrase: 'Llevo esperando', translation: 'I\'ve been waiting', why: 'Present progressive for ongoing actions' },
      { phrase: 'Media hora', translation: 'Half an hour', why: 'Common time expression' },
      { phrase: 'Inaceptable', translation: 'Unacceptable', why: 'Strong word for formal complaints' },
      { phrase: 'El gerente', translation: 'The manager', why: 'Person in charge of a business' },
      { phrase: 'Permítame verificar', translation: 'Let me verify', why: 'Formal way to offer to check on something' }
    ]
  }
};

const FirstLesson = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LessonStep>('intro');
  const [exerciseScore, setExerciseScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(10);
  const [phrasesLearned, setPhrasesLearned] = useState(0);
  const [flashcardsLearned, setFlashcardsLearned] = useState(0);

  // Get user's level from localStorage
  const userLevel = localStorage.getItem('onboarding_level') || 'absolute_beginner';
  const content = lessonContent[userLevel] || lessonContent.absolute_beginner;

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('lesson_step', step);
  }, [step]);

  // Restore progress on mount
  useEffect(() => {
    const savedStep = localStorage.getItem('lesson_step');
    if (savedStep && savedStep !== 'complete') {
      // Optionally restore progress
      // setStep(savedStep as LessonStep);
    }
  }, []);

  const handleExercisesComplete = (score: number, total: number) => {
    setExerciseScore(score);
    setTotalExercises(total);
    setStep('speaking');
  };

  const handleSpeakingComplete = () => {
    setPhrasesLearned(content.speakingPhrases.length);
    setStep('flashcards');
  };

  const handleFlashcardsComplete = () => {
    setFlashcardsLearned(content.flashcards.length);
    localStorage.removeItem('lesson_step');
    setStep('complete');
  };

  switch (step) {
    case 'intro':
      return <LessonIntro level={userLevel} onStart={() => setStep('video')} />;
    
    case 'video':
      return <LessonVideoPlayer video={content.video} onComplete={() => setStep('exercises')} />;
    
    case 'exercises':
      return <LessonExercises exercises={content.exercises} onComplete={handleExercisesComplete} />;
    
    case 'speaking':
      return (
        <LessonSpeaking 
          level={userLevel} 
          phrases={content.speakingPhrases}
          videoTranscript={content.video.transcript}
          onComplete={handleSpeakingComplete} 
        />
      );
    
    case 'flashcards':
      return <LessonFlashcards flashcards={content.flashcards} onComplete={handleFlashcardsComplete} />;
    
    case 'complete':
      return (
        <LessonComplete 
          exerciseScore={exerciseScore}
          totalExercises={totalExercises}
          phrasesLearned={phrasesLearned}
          flashcardsLearned={flashcardsLearned}
        />
      );
    
    default:
      return <LessonIntro level={userLevel} onStart={() => setStep('video')} />;
  }
};

export default FirstLesson;
