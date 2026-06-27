// Translation data
const PHRASE_BOOK = [
  {
    english: 'Hello',
    spanish: 'Hola',
    french: 'Bonjour',
    chinese: '你好'
  },
  {
    english: 'Good morning',
    spanish: 'Buenos dias',
    french: 'Bonjour',
    chinese: '早上好'
  },
  {
    english: 'Thank you',
    spanish: 'Gracias',
    french: 'Merci',
    chinese: '谢谢'
  },
  {
    english: 'How are you?',
    spanish: 'Como estas?',
    french: 'Comment ca va ?',
    chinese: '你好吗？'
  },
  {
    english: 'Where is the train station?',
    spanish: 'Donde esta la estacion de tren?',
    french: 'Ou est la gare ?',
    chinese: '火车站在哪里？'
  },
  {
    english: 'I would like a coffee',
    spanish: 'Quisiera un cafe',
    french: 'Je voudrais un cafe',
    chinese: '我想要一杯咖啡'
  },
  {
    english: 'See you later',
    spanish: 'Hasta luego',
    french: 'A plus tard',
    chinese: '回头见'
  },
  {
    english: 'Please help me',
    spanish: 'Por favor ayudame',
    french: "Aidez-moi s'il vous plait",
    chinese: '请帮帮我'
  }
];

// DOM Elements
const sourceLanguageSelect = document.getElementById('sourceLanguage');
const targetLanguageSelect = document.getElementById('targetLanguage');
const sourceText = document.getElementById('sourceText');
const translationOutput = document.getElementById('translationOutput');
const translateButton = document.getElementById('translateButton');
const clearButton = document.getElementById('clearButton');
const phraseButtonsContainer = document.getElementById('phraseButtons');

// Helper functions
function normalize(text) {
  // Remove accents and diacritics
  const withoutAccents = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Convert to lowercase and remove special characters
  return withoutAccents
    .toLowerCase()
    .replace(/[¿¡.,!?;:'"]/g, '')
    .trim();
}

function translate(text, sourceLanguage, targetLanguage) {
  if (!text.trim()) {
    return { translation: 'Type something to translate.', isEmpty: true };
  }

  if (sourceLanguage === targetLanguage) {
    return { translation: text, isEmpty: false };
  }

  const cleanedText = normalize(text);
  
  for (const phrase of PHRASE_BOOK) {
    if (normalize(phrase[sourceLanguage]) === cleanedText) {
      return { translation: phrase[targetLanguage], isEmpty: false };
    }
  }

  return {
    translation: 'I do not know that exact phrase yet. Try one of the suggested phrases.',
    isEmpty: true
  };
}

function performTranslation() {
  const sourceLanguage = sourceLanguageSelect.value;
  const targetLanguage = targetLanguageSelect.value;
  const text = sourceText.value;

  const result = translate(text, sourceLanguage, targetLanguage);
  
  translationOutput.textContent = result.translation;
  
  if (result.isEmpty) {
    translationOutput.classList.add('empty');
  } else {
    translationOutput.classList.remove('empty');
  }
}

function clearAll() {
  sourceText.value = '';
  translationOutput.textContent = 'Your translation will appear here.';
  translationOutput.classList.add('empty');
}

function createPhraseButtons() {
  const sourceLanguage = sourceLanguageSelect.value;
  
  phraseButtonsContainer.innerHTML = '';
  
  PHRASE_BOOK.forEach((phrase) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = phrase.english;
    
    button.addEventListener('click', () => {
      sourceText.value = phrase[sourceLanguage];
      performTranslation();
    });
    
    phraseButtonsContainer.appendChild(button);
  });
}

// Event listeners
translateButton.addEventListener('click', performTranslation);

clearButton.addEventListener('click', clearAll);

sourceLanguageSelect.addEventListener('change', () => {
  createPhraseButtons();
});

// Allow Enter key to trigger translation (but allow Shift+Enter for new lines)
sourceText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    performTranslation();
  }
});

// Initialize
createPhraseButtons();
