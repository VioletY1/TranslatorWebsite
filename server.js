const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8000;
const HOST = '127.0.0.1';

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Constants
const SOURCE_LANGUAGES = ['english', 'spanish', 'french'];
const TARGET_LANGUAGES = ['chinese', 'spanish', 'french'];

const LANGUAGE_LABELS = {
  english: 'English',
  spanish: 'Spanish',
  french: 'French',
  chinese: 'Chinese'
};

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

function htmlEscape(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

function selectedOptions(languages, activeLanguage) {
  return languages
    .map((language) => {
      const selected = language === activeLanguage ? ' selected' : '';
      return `<option value="${language}"${selected}>${LANGUAGE_LABELS[language]}</option>`;
    })
    .join('\n');
}

function phraseButtons(sourceLanguage) {
  return PHRASE_BOOK.map((phrase) => {
    const phraseText = htmlEscape(phrase[sourceLanguage]);
    const englishText = htmlEscape(phrase['english']);
    return `<button name="text" value="${phraseText}" type="submit">${englishText}</button>`;
  }).join('\n');
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

function renderPage(formData = {}) {
  const sourceLanguage = formData.source_language || 'english';
  const targetLanguage = formData.target_language || 'chinese';
  const text = formData.text || '';

  // Validate languages
  const validSourceLanguage = SOURCE_LANGUAGES.includes(sourceLanguage) ? sourceLanguage : 'english';
  const validTargetLanguage = TARGET_LANGUAGES.includes(targetLanguage) ? targetLanguage : 'chinese';

  let translation, isEmpty;
  if (text) {
    const result = translate(text, validSourceLanguage, validTargetLanguage);
    translation = result.translation;
    isEmpty = result.isEmpty;
  } else {
    translation = 'Your translation will appear here.';
    isEmpty = true;
  }

  // Read template
  const templatePath = path.join(__dirname, 'index.html');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders
  template = template
    .replace('{{ source_options }}', selectedOptions(SOURCE_LANGUAGES, validSourceLanguage))
    .replace('{{ target_options }}', selectedOptions(TARGET_LANGUAGES, validTargetLanguage))
    .replace('{{ source_text }}', htmlEscape(text))
    .replace('{{ translation }}', htmlEscape(translation))
    .replace('{{ output_class }}', isEmpty ? ' empty' : '')
    .replace('{{ phrase_buttons }}', phraseButtons(validSourceLanguage));

  return template;
}

// Routes
app.get('/', (req, res) => {
  res.send(renderPage());
});

app.post('/', (req, res) => {
  res.send(renderPage(req.body));
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Translator website running at http://${HOST}:${PORT}`);
});
