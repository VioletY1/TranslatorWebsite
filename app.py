from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs
import mimetypes
import unicodedata


ROOT = Path(__file__).parent
HOST = "127.0.0.1"
PORT = 8000

SOURCE_LANGUAGES = ("english", "spanish", "french")
TARGET_LANGUAGES = ("chinese", "spanish", "french")

LANGUAGE_LABELS = {
    "english": "English",
    "spanish": "Spanish",
    "french": "French",
    "chinese": "Chinese",
}

PHRASE_BOOK = [
    {
        "english": "Hello",
        "spanish": "Hola",
        "french": "Bonjour",
        "chinese": "你好",
    },
    {
        "english": "Good morning",
        "spanish": "Buenos dias",
        "french": "Bonjour",
        "chinese": "早上好",
    },
    {
        "english": "Thank you",
        "spanish": "Gracias",
        "french": "Merci",
        "chinese": "谢谢",
    },
    {
        "english": "How are you?",
        "spanish": "Como estas?",
        "french": "Comment ca va ?",
        "chinese": "你好吗？",
    },
    {
        "english": "Where is the train station?",
        "spanish": "Donde esta la estacion de tren?",
        "french": "Ou est la gare ?",
        "chinese": "火车站在哪里？",
    },
    {
        "english": "I would like a coffee",
        "spanish": "Quisiera un cafe",
        "french": "Je voudrais un cafe",
        "chinese": "我想要一杯咖啡",
    },
    {
        "english": "See you later",
        "spanish": "Hasta luego",
        "french": "A plus tard",
        "chinese": "回头见",
    },
    {
        "english": "Please help me",
        "spanish": "Por favor ayudame",
        "french": "Aidez-moi s'il vous plait",
        "chinese": "请帮帮我",
    },
]


def normalize(text):
    without_accents = unicodedata.normalize("NFD", text.lower())
    letters = "".join(char for char in without_accents if unicodedata.category(char) != "Mn")
    return "".join(char for char in letters if char not in "¿¡.,!?;:'\"").strip()


def selected_options(languages, active_language):
    options = []
    for language in languages:
        selected = " selected" if language == active_language else ""
        options.append(f'<option value="{language}"{selected}>{LANGUAGE_LABELS[language]}</option>')
    return "\n".join(options)


def phrase_buttons(source_language):
    buttons = []
    for phrase in PHRASE_BOOK:
        phrase_text = escape(phrase[source_language])
        buttons.append(
            f'<button name="text" value="{phrase_text}" type="submit">{escape(phrase["english"])}</button>'
        )
    return "\n".join(buttons)


def translate(text, source_language, target_language):
    if not text.strip():
        return "Type something to translate.", True

    if source_language == target_language:
        return text, False

    cleaned_text = normalize(text)
    for phrase in PHRASE_BOOK:
        if normalize(phrase[source_language]) == cleaned_text:
            return phrase[target_language], False

    return "I do not know that exact phrase yet. Try one of the suggested phrases.", True


def render_page(form_data=None):
    form_data = form_data or {}
    source_language = form_data.get("source_language", "english")
    target_language = form_data.get("target_language", "chinese")
    text = form_data.get("text", "")

    if source_language not in SOURCE_LANGUAGES:
        source_language = "english"
    if target_language not in TARGET_LANGUAGES:
        target_language = "chinese"

    translation, is_empty = translate(text, source_language, target_language) if text else (
        "Your translation will appear here.",
        True,
    )

    template = (ROOT / "index.html").read_text(encoding="utf-8")
    return template.replace("{{ source_options }}", selected_options(SOURCE_LANGUAGES, source_language)).replace(
        "{{ target_options }}", selected_options(TARGET_LANGUAGES, target_language)
    ).replace("{{ source_text }}", escape(text)).replace(
        "{{ translation }}", escape(translation)
    ).replace(
        "{{ output_class }}", " empty" if is_empty else ""
    ).replace(
        "{{ phrase_buttons }}", phrase_buttons(source_language)
    )


class TranslatorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_html(render_page())
            return

        self.send_static_file()

    def do_POST(self):
        body_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(body_length).decode("utf-8")
        parsed = parse_qs(body)
        form_data = {key: values[0] for key, values in parsed.items()}
        self.send_html(render_page(form_data))

    def send_html(self, html):
        encoded = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_static_file(self):
        requested_path = self.path.lstrip("/")
        file_path = (ROOT / requested_path).resolve()

        if not str(file_path).startswith(str(ROOT.resolve())) or not file_path.is_file():
            self.send_error(404)
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), TranslatorHandler)
    print(f"Translator website running at http://{HOST}:{PORT}")
    server.serve_forever()
