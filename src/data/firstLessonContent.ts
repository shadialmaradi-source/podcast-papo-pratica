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
  why: string;
}

export interface LessonContent {
  video: VideoData;
  exercises: Exercise[];
  speakingPhrases: SpeakingPhrase[];
  flashcards: Flashcard[];
}

// Spanish lesson content by level
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

// English lesson content by level
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
      { id: '6', type: 'multiple_choice', question: 'Where is this conversation?', options: ['At home', 'At a café', 'At a school'], correctAnswer: 'At a café', explanation: 'Ordering coffee from a barista indicates a café setting.' },
      { id: '7', type: 'fill_blank', question: 'Complete: "No, that\'s ___"', correctAnswer: 'all', explanation: '"That\'s all" means you don\'t want anything more.' },
      { id: '8', type: 'multiple_choice', question: 'What does "Anything else?" mean?', options: ['How are you?', 'Do you want more?', 'What\'s your name?'], correctAnswer: 'Do you want more?', explanation: 'The barista asks if she wants to order something additional.' },
      { id: '9', type: 'sequencing', question: 'What is the correct order?', options: ['Greet → Order → Choose size → Pay', 'Pay → Greet → Order → Choose size', 'Choose size → Pay → Greet → Order'], correctAnswer: 'Greet → Order → Choose size → Pay', explanation: 'First you greet, then order, choose details, and pay.' },
      { id: '10', type: 'matching', question: 'What does "please" express?', options: ['Anger', 'Politeness', 'Sadness'], correctAnswer: 'Politeness', explanation: '"Please" is used to make requests polite.' }
    ],
    speakingPhrases: [
      { phrase: 'Can I get a coffee please?', translation: 'Puedo pedir un café por favor?', why: 'The most common way to order in English-speaking countries' },
      { phrase: 'A medium, please', translation: 'Un mediano, por favor', why: 'Use sizes: small, medium, large when ordering' },
      { phrase: 'That\'s all, thank you', translation: 'Eso es todo, gracias', why: 'Polite way to finish your order' }
    ],
    flashcards: [
      { phrase: 'Can I get...', translation: 'Puedo pedir...', why: 'The go-to phrase for ordering anything' },
      { phrase: 'What size?', translation: '¿Qué tamaño?', why: 'Common question when ordering drinks or food' },
      { phrase: 'Anything else?', translation: '¿Algo más?', why: 'You\'ll hear this at every café and restaurant' },
      { phrase: 'That\'s all', translation: 'Eso es todo', why: 'Use this to say you\'re done ordering' },
      { phrase: 'Thank you', translation: 'Gracias', why: 'Essential politeness in any interaction' }
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
      { id: '6', type: 'fill_blank', question: 'Complete: "Could we ___ some water?"', correctAnswer: 'get', explanation: '"Could we get" is a polite way to ask for something.' },
      { id: '7', type: 'multiple_choice', question: 'Who seats the customers?', options: ['The chef', 'The host', 'The manager'], correctAnswer: 'The host', explanation: 'The host greets and seats guests at a restaurant.' },
      { id: '8', type: 'matching', question: 'What does "follow me" mean?', options: ['Wait here', 'Come with me', 'Go away'], correctAnswer: 'Come with me', explanation: 'The host says "follow me" to guide the customer to their table.' },
      { id: '9', type: 'sequencing', question: 'Order the conversation:', options: ['Request table → Follow host → Get menu → Order drinks', 'Order drinks → Follow host → Request table → Get menu', 'Get menu → Request table → Order drinks → Follow host'], correctAnswer: 'Request table → Follow host → Get menu → Order drinks', explanation: 'First request a table, follow the host, receive the menu, then order drinks.' },
      { id: '10', type: 'multiple_choice', question: 'Where does this take place?', options: ['At home', 'At a restaurant', 'At a store'], correctAnswer: 'At a restaurant', explanation: 'Tables, menus, and hosts indicate a restaurant.' }
    ],
    speakingPhrases: [
      { phrase: 'I\'d like a table for two', translation: 'Me gustaría una mesa para dos', why: '"I\'d like" is the polite go-to for requests' },
      { phrase: 'Yes please', translation: 'Sí, por favor', why: 'Short and polite — use it everywhere' },
      { phrase: 'Could we get some water?', translation: '¿Podríamos pedir agua?', why: '"Could we get..." is great for group requests' }
    ],
    flashcards: [
      { phrase: 'I\'d like', translation: 'Me gustaría', why: 'The most polite way to request something' },
      { phrase: 'Follow me', translation: 'Sígueme', why: 'You\'ll hear this when being seated' },
      { phrase: 'A table for two', translation: 'Una mesa para dos', why: 'Change the number for your group' },
      { phrase: 'Could we get...', translation: '¿Podríamos pedir...', why: 'Polite group request format' },
      { phrase: 'Yes please', translation: 'Sí, por favor', why: 'Always polite and appropriate' }
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
      { id: '6', type: 'fill_blank', question: 'Complete: "Let me fix it right ___"', correctAnswer: 'away', explanation: '"Right away" means immediately.' },
      { id: '7', type: 'multiple_choice', question: 'How does the waiter respond?', options: ['Defensively', 'Apologetically', 'Indifferently'], correctAnswer: 'Apologetically', explanation: 'The waiter says "I\'m so sorry" showing an apology.' },
      { id: '8', type: 'matching', question: 'What does "Excuse me" express here?', options: ['Greeting', 'Polite attention-getter', 'Goodbye'], correctAnswer: 'Polite attention-getter', explanation: '"Excuse me" politely gets someone\'s attention.' },
      { id: '9', type: 'sequencing', question: 'What\'s the logical order?', options: ['Wrong dish → Complaint → Apology → Solution', 'Complaint → Wrong dish → Solution → Apology', 'Solution → Complaint → Wrong dish → Apology'], correctAnswer: 'Wrong dish → Complaint → Apology → Solution', explanation: 'First the error happens, then complaint, apology, and solution.' },
      { id: '10', type: 'multiple_choice', question: 'Is this conversation formal or informal?', options: ['Formal', 'Informal', 'Very casual'], correctAnswer: 'Formal', explanation: 'Using "Excuse me" and "I\'m so sorry" indicates formality.' }
    ],
    speakingPhrases: [
      { phrase: 'Excuse me, I ordered the steak but this looks like chicken', translation: 'Disculpe, pedí el filete pero esto parece pollo', why: 'Pattern: "I ordered X but this looks like Y"' },
      { phrase: 'I\'m so sorry about that', translation: 'Lo siento mucho', why: 'Strong apology for mistakes' },
      { phrase: 'Let me fix it right away', translation: 'Déjeme arreglarlo de inmediato', why: 'Professional way to offer a solution' }
    ],
    flashcards: [
      { phrase: 'I ordered', translation: 'Pedí / Ordené', why: 'Past tense — use for what you requested' },
      { phrase: 'This looks like', translation: 'Esto parece', why: 'Use to describe what something appears to be' },
      { phrase: 'I\'m so sorry', translation: 'Lo siento mucho', why: 'Stronger than just "sorry"' },
      { phrase: 'Right away', translation: 'De inmediato', why: 'Emphasizes doing something immediately' },
      { phrase: 'Let me fix it', translation: 'Déjeme arreglarlo', why: 'Offering to correct a mistake' }
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
      { id: '6', type: 'fill_blank', question: 'Complete: "I\'ve been waiting for ___ an hour"', correctAnswer: 'half', explanation: '"Half an hour" means 30 minutes.' },
      { id: '7', type: 'multiple_choice', question: 'What tone does the customer use?', options: ['Very casual', 'Neutral', 'Formal but firm'], correctAnswer: 'Formal but firm', explanation: 'Using "Look" and "I\'d like to" shows firmness with formality.' },
      { id: '8', type: 'matching', question: 'What does "Let me check" mean?', options: ['Let me verify', 'Let me leave', 'Let me pay'], correctAnswer: 'Let me verify', explanation: '"Let me check" means to investigate or verify.' },
      { id: '9', type: 'sequencing', question: 'What\'s the complaint structure?', options: ['Problem → Duration → Evaluation → Demand', 'Demand → Problem → Duration → Evaluation', 'Evaluation → Duration → Problem → Demand'], correctAnswer: 'Problem → Duration → Evaluation → Demand', explanation: 'First state the problem, how long, your opinion, then what you want.' },
      { id: '10', type: 'multiple_choice', question: 'How does the waiter handle the situation?', options: ['Defensively', 'Professionally', 'Indifferently'], correctAnswer: 'Professionally', explanation: 'The waiter validates the complaint and offers to investigate.' }
    ],
    speakingPhrases: [
      { phrase: 'I\'ve been waiting for half an hour', translation: 'Llevo esperando media hora', why: 'Present perfect continuous for ongoing duration' },
      { phrase: 'I\'d like to speak with the manager', translation: 'Me gustaría hablar con el gerente', why: 'Formal way to escalate an issue' },
      { phrase: 'You\'re absolutely right', translation: 'Tiene toda la razón', why: 'Professional way to acknowledge a valid complaint' }
    ],
    flashcards: [
      { phrase: 'I\'ve been waiting', translation: 'He estado esperando', why: 'Present perfect continuous for ongoing actions' },
      { phrase: 'Half an hour', translation: 'Media hora', why: 'Common time expression' },
      { phrase: 'Unacceptable', translation: 'Inaceptable', why: 'Strong word for formal complaints' },
      { phrase: 'The manager', translation: 'El gerente', why: 'Person in charge of a business' },
      { phrase: 'Let me check', translation: 'Déjeme verificar', why: 'Professional way to offer to investigate' }
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
