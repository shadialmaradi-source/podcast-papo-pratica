export interface VideoData {
  youtubeId: string;
  startTime: number;
  duration: number;
  suggestedSpeed: number;
  transcript: string;
}

export interface SpeakingPhrase {
  phrase: string;
  translation: string;
  translations?: Record<string, string>;
  why: string;
}

export interface Exercise {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'sequencing' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Flashcard {
  phrase: string;
  translation: string;
  translations?: Record<string, string>;
  why: string;
}

export interface LessonContent {
  video: VideoData;
  exercises: Exercise[];
  speakingPhrases: SpeakingPhrase[];
  flashcards: Flashcard[];
}

// Helper: resolve translations to the user's native language
export function getLocalizedContent(content: LessonContent, nativeLanguageCode: string): LessonContent {
  const resolve = (translations: Record<string, string> | undefined, fallback: string): string => {
    if (!translations) return fallback;
    return translations[nativeLanguageCode] || translations['en'] || fallback;
  };

  return {
    ...content,
    speakingPhrases: content.speakingPhrases.map(p => ({
      ...p,
      translation: resolve(p.translations, p.translation),
    })),
    flashcards: content.flashcards.map(f => ({
      ...f,
      translation: resolve(f.translations, f.translation),
    })),
  };
}

// Spanish lesson content by level (trimmed to 5 exercises)
const spanishContent: Record<string, LessonContent> = {
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
    ],
    speakingPhrases: [
      { phrase: 'Hola, una mesa por favor', translations: { en: 'Hello, a table please', es: 'Hola, una mesa por favor', pt: 'Olá, uma mesa por favor' }, translation: 'Hello, a table please', why: 'Use this in any restaurant across Spain/Latin America' },
      { phrase: 'Quiero un café con leche', translations: { en: 'I want a coffee with milk', es: 'Quiero un café con leche', pt: 'Quero um café com leite' }, translation: 'I want a coffee with milk', why: 'Order any drink by saying "Quiero un/una..."' },
      { phrase: 'La cuenta, por favor', translations: { en: 'The bill, please', es: 'La cuenta, por favor', pt: 'A conta, por favor' }, translation: 'The bill, please', why: 'Essential phrase for asking for the bill' }
    ],
    flashcards: [
      { phrase: 'Hola', translations: { en: 'Hello', es: 'Hola', pt: 'Olá' }, translation: 'Hello', why: 'The most common Spanish greeting - use it everywhere!' },
      { phrase: 'Una mesa para uno', translations: { en: 'A table for one', es: 'Una mesa para uno', pt: 'Uma mesa para um' }, translation: 'A table for one', why: 'Change "uno" to "dos, tres, cuatro" for more people' },
      { phrase: 'Quiero', translations: { en: 'I want', es: 'Quiero', pt: 'Eu quero' }, translation: 'I want', why: 'Essential verb for ordering anything' },
      { phrase: 'Café con leche', translations: { en: 'Coffee with milk', es: 'Café con leche', pt: 'Café com leite' }, translation: 'Coffee with milk', why: 'A popular coffee order throughout the Spanish-speaking world' },
      { phrase: 'Por favor', translations: { en: 'Please', es: 'Por favor', pt: 'Por favor' }, translation: 'Please', why: 'Always add this to be polite!' }
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
    ],
    speakingPhrases: [
      { phrase: 'Hola, una mesa por favor', translations: { en: 'Hello, a table please', es: 'Hola, una mesa por favor', pt: 'Olá, uma mesa por favor' }, translation: 'Hello, a table please', why: 'Start every restaurant visit with this phrase' },
      { phrase: 'Para uno, por favor', translations: { en: 'For one, please', es: 'Para uno, por favor', pt: 'Para um, por favor' }, translation: 'For one, please', why: 'Change the number for your group size' },
      { phrase: 'Quiero el menú del día', translations: { en: 'I want the daily menu', es: 'Quiero el menú del día', pt: 'Quero o menu do dia' }, translation: 'I want the daily menu', why: 'A great way to try local dishes at a fixed price' }
    ],
    flashcards: [
      { phrase: '¿Para cuántos?', translations: { en: 'For how many?', es: '¿Para cuántos?', pt: 'Para quantos?' }, translation: 'For how many?', why: 'Common question at restaurants' },
      { phrase: 'El menú del día', translations: { en: 'The daily menu', es: 'El menú del día', pt: 'O menu do dia' }, translation: 'The daily menu', why: 'A set menu offered at many Spanish restaurants' },
      { phrase: 'Para uno', translations: { en: 'For one', es: 'Para uno', pt: 'Para um' }, translation: 'For one', why: 'Change "uno" to any number' },
      { phrase: 'Mesero/Camarero', translations: { en: 'Waiter', es: 'Mesero/Camarero', pt: 'Garçom' }, translation: 'Waiter', why: 'Mesero is used in Latin America, Camarero in Spain' },
      { phrase: 'Por favor', translations: { en: 'Please', es: 'Por favor', pt: 'Por favor' }, translation: 'Please', why: 'Essential politeness word' }
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
    ],
    speakingPhrases: [
      { phrase: 'Pedí el pollo pero me trajeron pescado', translations: { en: 'I ordered chicken but they brought me fish', es: 'Pedí el pollo pero me trajeron pescado', pt: 'Pedi frango mas me trouxeram peixe' }, translation: 'I ordered chicken but they brought me fish', why: 'Pattern: "Pedí X pero me trajeron Y" for any order mistake' },
      { phrase: 'Lo siento mucho', translations: { en: 'I\'m very sorry', es: 'Lo siento mucho', pt: 'Sinto muito' }, translation: 'I\'m very sorry', why: 'Standard apology phrase' },
      { phrase: 'Se lo cambio ahora mismo', translations: { en: 'I\'ll change it for you right now', es: 'Se lo cambio ahora mismo', pt: 'Vou trocar agora mesmo' }, translation: 'I\'ll change it for you right now', why: 'Professional way to offer a solution' }
    ],
    flashcards: [
      { phrase: 'Pedí', translations: { en: 'I ordered', es: 'Pedí', pt: 'Eu pedi' }, translation: 'I ordered', why: 'Past tense of "pedir" - use for what you ordered' },
      { phrase: 'Me trajeron', translations: { en: 'They brought me', es: 'Me trajeron', pt: 'Me trouxeram' }, translation: 'They brought me', why: 'Use this to describe what was delivered' },
      { phrase: 'Lo siento mucho', translations: { en: 'I\'m very sorry', es: 'Lo siento mucho', pt: 'Sinto muito' }, translation: 'I\'m very sorry', why: 'Stronger than just "lo siento"' },
      { phrase: 'Ahora mismo', translations: { en: 'Right now', es: 'Ahora mismo', pt: 'Agora mesmo' }, translation: 'Right now', why: 'Emphasizes immediacy' },
      { phrase: 'Se lo cambio', translations: { en: 'I\'ll change it for you', es: 'Se lo cambio', pt: 'Vou trocar para você' }, translation: 'I\'ll change it for you', why: 'Formal way of offering to fix something' }
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
    ],
    speakingPhrases: [
      { phrase: 'Llevo esperando media hora', translations: { en: 'I\'ve been waiting for half an hour', es: 'Llevo esperando media hora', pt: 'Estou esperando há meia hora' }, translation: 'I\'ve been waiting for half an hour', why: 'Pattern: "Llevo + gerund + time" for ongoing duration' },
      { phrase: 'Quiero hablar con el gerente', translations: { en: 'I want to speak with the manager', es: 'Quiero hablar con el gerente', pt: 'Quero falar com o gerente' }, translation: 'I want to speak with the manager', why: 'Direct but formal way to escalate an issue' },
      { phrase: 'Tiene toda la razón', translations: { en: 'You\'re absolutely right', es: 'Tiene toda la razón', pt: 'O senhor tem toda razão' }, translation: 'You\'re absolutely right', why: 'Professional way to acknowledge a valid complaint' }
    ],
    flashcards: [
      { phrase: 'Llevo esperando', translations: { en: 'I\'ve been waiting', es: 'Llevo esperando', pt: 'Estou esperando' }, translation: 'I\'ve been waiting', why: 'Present progressive for ongoing actions' },
      { phrase: 'Media hora', translations: { en: 'Half an hour', es: 'Media hora', pt: 'Meia hora' }, translation: 'Half an hour', why: 'Common time expression' },
      { phrase: 'Inaceptable', translations: { en: 'Unacceptable', es: 'Inaceptable', pt: 'Inaceitável' }, translation: 'Unacceptable', why: 'Strong word for formal complaints' },
      { phrase: 'El gerente', translations: { en: 'The manager', es: 'El gerente', pt: 'O gerente' }, translation: 'The manager', why: 'Person in charge of a business' },
      { phrase: 'Permítame verificar', translations: { en: 'Let me verify', es: 'Permítame verificar', pt: 'Permita-me verificar' }, translation: 'Let me verify', why: 'Formal way to offer to check on something' }
    ]
  }
};

// English lesson content by level (trimmed to 5 exercises)
const englishContent: Record<string, LessonContent> = {
  absolute_beginner: {
    video: {
      youtubeId: 'W1fKGyrmVKU',
      startTime: 0,
      duration: 60,
      suggestedSpeed: 0.8,
      transcript: 'Woman: Hi, can I get a coffee please? Barista: Sure! What size? Woman: A medium, please. Barista: Anything else? Woman: No, that\'s all. Thank you!'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: 'What does the woman order?', options: ['Tea', 'Coffee', 'Juice'], correctAnswer: 'Coffee', explanation: 'The woman says "Can I get a coffee please?"' },
      { id: '2', type: 'multiple_choice', question: 'What size does she want?', options: ['Small', 'Medium', 'Large'], correctAnswer: 'Medium', explanation: 'She says "A medium, please."' },
      { id: '3', type: 'fill_blank', question: 'Complete: "Can I ___ a coffee please?"', correctAnswer: 'get', explanation: '"Can I get..." is a common way to order in English.' },
      { id: '4', type: 'multiple_choice', question: 'Does she order anything else?', options: ['Yes, a muffin', 'Yes, water', 'No, nothing else'], correctAnswer: 'No, nothing else', explanation: 'She says "No, that\'s all."' },
      { id: '5', type: 'multiple_choice', question: 'Who works at the café?', options: ['The woman', 'The barista', 'The chef'], correctAnswer: 'The barista', explanation: 'The barista is the person who makes and serves coffee.' },
    ],
    speakingPhrases: [
      { phrase: 'Can I get a coffee please?', translations: { es: '¿Puedo pedir un café por favor?', pt: 'Posso pedir um café por favor?', en: 'Can I get a coffee please?' }, translation: '¿Puedo pedir un café por favor?', why: 'The most common way to order in English-speaking countries' },
      { phrase: 'A medium, please', translations: { es: 'Un mediano, por favor', pt: 'Um médio, por favor', en: 'A medium, please' }, translation: 'Un mediano, por favor', why: 'Use sizes: small, medium, large when ordering' },
      { phrase: 'That\'s all, thank you', translations: { es: 'Eso es todo, gracias', pt: 'É tudo, obrigado', en: 'That\'s all, thank you' }, translation: 'Eso es todo, gracias', why: 'Polite way to finish your order' }
    ],
    flashcards: [
      { phrase: 'Can I get...', translations: { es: 'Puedo pedir...', pt: 'Posso pedir...', en: 'Can I get...' }, translation: 'Puedo pedir...', why: 'The go-to phrase for ordering anything' },
      { phrase: 'What size?', translations: { es: '¿Qué tamaño?', pt: 'Qual tamanho?', en: 'What size?' }, translation: '¿Qué tamaño?', why: 'Common question when ordering drinks or food' },
      { phrase: 'Anything else?', translations: { es: '¿Algo más?', pt: 'Mais alguma coisa?', en: 'Anything else?' }, translation: '¿Algo más?', why: 'You\'ll hear this at every café and restaurant' },
      { phrase: 'That\'s all', translations: { es: 'Eso es todo', pt: 'É tudo', en: 'That\'s all' }, translation: 'Eso es todo', why: 'Use this to say you\'re done ordering' },
      { phrase: 'Thank you', translations: { es: 'Gracias', pt: 'Obrigado/a', en: 'Thank you' }, translation: 'Gracias', why: 'Essential politeness in any interaction' }
    ]
  },
  beginner: {
    video: {
      youtubeId: 'W1fKGyrmVKU',
      startTime: 60,
      duration: 75,
      suggestedSpeed: 1.0,
      transcript: 'Customer: Hi, I\'d like a table for two. Host: Sure, follow me. Would you like a menu? Customer: Yes please. And could we get some water?'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: 'How many people will eat?', options: ['One', 'Two', 'Three'], correctAnswer: 'Two', explanation: 'The customer says "a table for two."' },
      { id: '2', type: 'multiple_choice', question: 'What does the host offer?', options: ['Water', 'A menu', 'Dessert'], correctAnswer: 'A menu', explanation: 'The host asks "Would you like a menu?"' },
      { id: '3', type: 'fill_blank', question: 'Complete: "I\'d ___ a table for two"', correctAnswer: 'like', explanation: '"I\'d like" is a polite way to request something.' },
      { id: '4', type: 'multiple_choice', question: 'What drink does the customer request?', options: ['Coffee', 'Juice', 'Water'], correctAnswer: 'Water', explanation: 'The customer asks "Could we get some water?"' },
      { id: '5', type: 'multiple_choice', question: 'What does "I\'d like" mean?', options: ['I need', 'I would like', 'I must have'], correctAnswer: 'I would like', explanation: '"I\'d like" is the contraction of "I would like" — very polite.' },
    ],
    speakingPhrases: [
      { phrase: 'I\'d like a table for two', translations: { es: 'Me gustaría una mesa para dos', pt: 'Gostaria de uma mesa para dois', en: 'I\'d like a table for two' }, translation: 'Me gustaría una mesa para dos', why: '"I\'d like" is the polite go-to for requests' },
      { phrase: 'Yes please', translations: { es: 'Sí, por favor', pt: 'Sim, por favor', en: 'Yes please' }, translation: 'Sí, por favor', why: 'Short and polite — use it everywhere' },
      { phrase: 'Could we get some water?', translations: { es: '¿Podríamos pedir agua?', pt: 'Poderíamos pedir água?', en: 'Could we get some water?' }, translation: '¿Podríamos pedir agua?', why: '"Could we get..." is great for group requests' }
    ],
    flashcards: [
      { phrase: 'I\'d like', translations: { es: 'Me gustaría', pt: 'Eu gostaria', en: 'I\'d like' }, translation: 'Me gustaría', why: 'The most polite way to request something' },
      { phrase: 'Follow me', translations: { es: 'Sígueme', pt: 'Siga-me', en: 'Follow me' }, translation: 'Sígueme', why: 'You\'ll hear this when being seated' },
      { phrase: 'A table for two', translations: { es: 'Una mesa para dos', pt: 'Uma mesa para dois', en: 'A table for two' }, translation: 'Una mesa para dos', why: 'Change the number for your group' },
      { phrase: 'Could we get...', translations: { es: '¿Podríamos pedir...', pt: 'Poderíamos pedir...', en: 'Could we get...' }, translation: '¿Podríamos pedir...', why: 'Polite group request format' },
      { phrase: 'Yes please', translations: { es: 'Sí, por favor', pt: 'Sim, por favor', en: 'Yes please' }, translation: 'Sí, por favor', why: 'Always polite and appropriate' }
    ]
  },
  intermediate: {
    video: {
      youtubeId: 'W1fKGyrmVKU',
      startTime: 120,
      duration: 75,
      suggestedSpeed: 1.0,
      transcript: 'Customer: Excuse me, I ordered the steak but this looks like chicken. Waiter: I\'m so sorry about that. Let me fix it right away.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: 'What is the customer\'s problem?', options: ['The food is cold', 'They got the wrong dish', 'The bill is wrong'], correctAnswer: 'They got the wrong dish', explanation: 'The customer ordered steak but received chicken.' },
      { id: '2', type: 'multiple_choice', question: 'What did the customer originally order?', options: ['Chicken', 'Steak', 'Fish'], correctAnswer: 'Steak', explanation: 'The customer says "I ordered the steak."' },
      { id: '3', type: 'fill_blank', question: 'Complete: "I\'m so ___ about that"', correctAnswer: 'sorry', explanation: '"I\'m so sorry" is a strong apology.' },
      { id: '4', type: 'multiple_choice', question: 'What does "Let me fix it" mean?', options: ['I\'ll bring more food', 'I\'ll correct the mistake', 'I\'ll give a discount'], correctAnswer: 'I\'ll correct the mistake', explanation: 'The waiter offers to replace the wrong dish.' },
      { id: '5', type: 'multiple_choice', question: 'What did the customer receive by mistake?', options: ['Steak', 'Chicken', 'Fish'], correctAnswer: 'Chicken', explanation: 'The customer says "this looks like chicken."' },
    ],
    speakingPhrases: [
      { phrase: 'Excuse me, I ordered the steak but this looks like chicken', translations: { es: 'Disculpe, pedí el filete pero esto parece pollo', pt: 'Com licença, pedi o bife mas isto parece frango', en: 'Excuse me, I ordered the steak but this looks like chicken' }, translation: 'Disculpe, pedí el filete pero esto parece pollo', why: 'Pattern: "I ordered X but this looks like Y"' },
      { phrase: 'I\'m so sorry about that', translations: { es: 'Lo siento mucho', pt: 'Sinto muito por isso', en: 'I\'m so sorry about that' }, translation: 'Lo siento mucho', why: 'Strong apology for mistakes' },
      { phrase: 'Let me fix it right away', translations: { es: 'Déjeme arreglarlo de inmediato', pt: 'Deixe-me resolver isso imediatamente', en: 'Let me fix it right away' }, translation: 'Déjeme arreglarlo de inmediato', why: 'Professional way to offer a solution' }
    ],
    flashcards: [
      { phrase: 'I ordered', translations: { es: 'Pedí / Ordené', pt: 'Eu pedi', en: 'I ordered' }, translation: 'Pedí / Ordené', why: 'Past tense — use for what you requested' },
      { phrase: 'This looks like', translations: { es: 'Esto parece', pt: 'Isto parece', en: 'This looks like' }, translation: 'Esto parece', why: 'Use to describe what something appears to be' },
      { phrase: 'I\'m so sorry', translations: { es: 'Lo siento mucho', pt: 'Sinto muito', en: 'I\'m so sorry' }, translation: 'Lo siento mucho', why: 'Stronger than just "sorry"' },
      { phrase: 'Right away', translations: { es: 'De inmediato', pt: 'Imediatamente', en: 'Right away' }, translation: 'De inmediato', why: 'Emphasizes doing something immediately' },
      { phrase: 'Let me fix it', translations: { es: 'Déjeme arreglarlo', pt: 'Deixe-me consertar', en: 'Let me fix it' }, translation: 'Déjeme arreglarlo', why: 'Offering to correct a mistake' }
    ]
  },
  advanced: {
    video: {
      youtubeId: 'W1fKGyrmVKU',
      startTime: 200,
      duration: 90,
      suggestedSpeed: 1.2,
      transcript: 'Customer: Look, I\'ve been waiting for half an hour and my food still hasn\'t arrived. This is unacceptable. I\'d like to speak with the manager. Waiter: You\'re absolutely right, sir. Let me check what happened with your order.'
    },
    exercises: [
      { id: '1', type: 'multiple_choice', question: 'How long has the customer been waiting?', options: ['15 minutes', '30 minutes', '1 hour'], correctAnswer: '30 minutes', explanation: 'The customer says "I\'ve been waiting for half an hour."' },
      { id: '2', type: 'multiple_choice', question: 'How does the customer describe the situation?', options: ['Normal', 'Acceptable', 'Unacceptable'], correctAnswer: 'Unacceptable', explanation: 'The customer explicitly says "This is unacceptable."' },
      { id: '3', type: 'fill_blank', question: 'Complete: "I\'d like to speak with the ___"', correctAnswer: 'manager', explanation: 'The manager is the person in charge.' },
      { id: '4', type: 'multiple_choice', question: 'What does "You\'re absolutely right" mean?', options: ['You\'re wrong', 'I completely agree', 'I don\'t understand'], correctAnswer: 'I completely agree', explanation: 'It\'s a formal way to validate the customer\'s complaint.' },
      { id: '5', type: 'multiple_choice', question: 'What does the waiter offer to do?', options: ['Bring the food', 'Check the order', 'Call the manager'], correctAnswer: 'Check the order', explanation: 'The waiter says "Let me check what happened with your order."' },
    ],
    speakingPhrases: [
      { phrase: 'I\'ve been waiting for half an hour', translations: { es: 'Llevo esperando media hora', pt: 'Estou esperando há meia hora', en: 'I\'ve been waiting for half an hour' }, translation: 'Llevo esperando media hora', why: 'Present perfect continuous for ongoing duration' },
      { phrase: 'I\'d like to speak with the manager', translations: { es: 'Me gustaría hablar con el gerente', pt: 'Gostaria de falar com o gerente', en: 'I\'d like to speak with the manager' }, translation: 'Me gustaría hablar con el gerente', why: 'Formal way to escalate an issue' },
      { phrase: 'You\'re absolutely right', translations: { es: 'Tiene toda la razón', pt: 'O senhor tem toda razão', en: 'You\'re absolutely right' }, translation: 'Tiene toda la razón', why: 'Professional way to acknowledge a valid complaint' }
    ],
    flashcards: [
      { phrase: 'I\'ve been waiting', translations: { es: 'He estado esperando', pt: 'Estou esperando', en: 'I\'ve been waiting' }, translation: 'He estado esperando', why: 'Present perfect continuous for ongoing actions' },
      { phrase: 'Half an hour', translations: { es: 'Media hora', pt: 'Meia hora', en: 'Half an hour' }, translation: 'Media hora', why: 'Common time expression' },
      { phrase: 'Unacceptable', translations: { es: 'Inaceptable', pt: 'Inaceitável', en: 'Unacceptable' }, translation: 'Inaceptable', why: 'Strong word for formal complaints' },
      { phrase: 'The manager', translations: { es: 'El gerente', pt: 'O gerente', en: 'The manager' }, translation: 'El gerente', why: 'Person in charge of a business' },
      { phrase: 'Let me check', translations: { es: 'Déjeme verificar', pt: 'Deixe-me verificar', en: 'Let me check' }, translation: 'Déjeme verificar', why: 'Professional way to offer to investigate' }
    ]
  }
};

// All lesson content organized by language then level
export const allLessonContent: Record<string, Record<string, LessonContent>> = {
  spanish: spanishContent,
  english: englishContent,
};

export const getLanguageDisplayName = (code: string): string => {
  const names: Record<string, string> = {
    spanish: 'Spanish',
    english: 'English',
  };
  return names[code] || code;
};
