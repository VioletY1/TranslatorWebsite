import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class TranslatorWebsite {
    private static final String HOST = "127.0.0.1";
    private static final int PORT = 8000;
    private static final Path ROOT = Path.of(".").toAbsolutePath().normalize();

    private static final List<String> SOURCE_LANGUAGES = List.of("english", "spanish", "french");
    private static final List<String> TARGET_LANGUAGES = List.of("chinese", "spanish", "french");

    private static final Map<String, String> LANGUAGE_LABELS = Map.of(
            "english", "English",
            "spanish", "Spanish",
            "french", "French",
            "chinese", "Chinese"
    );

    private static final List<Map<String, String>> PHRASE_BOOK = new ArrayList<>();

    static {
        addPhrase("Hello", "Hola", "Bonjour", "你好");
        addPhrase("Good morning", "Buenos dias", "Bonjour", "早上好");
        addPhrase("Thank you", "Gracias", "Merci", "谢谢");
        addPhrase("How are you?", "Como estas?", "Comment ca va ?", "你好吗？");
        addPhrase("Where is the train station?", "Donde esta la estacion de tren?", "Ou est la gare ?", "火车站在哪里？");
        addPhrase("I would like a coffee", "Quisiera un cafe", "Je voudrais un cafe", "我想要一杯咖啡");
        addPhrase("See you later", "Hasta luego", "A plus tard", "回头见");
        addPhrase("Please help me", "Por favor ayudame", "Aidez-moi s'il vous plait", "请帮帮我");
    }

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(HOST, PORT), 0);
        server.createContext("/", new TranslatorHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("Translator website running at http://" + HOST + ":" + PORT);
    }

    private static void addPhrase(String english, String spanish, String french, String chinese) {
        Map<String, String> phrase = new LinkedHashMap<>();
        phrase.put("english", english);
        phrase.put("spanish", spanish);
        phrase.put("french", french);
        phrase.put("chinese", chinese);
        PHRASE_BOOK.add(phrase);
    }

    private static final class TranslatorHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("GET".equals(method) && ("/".equals(path) || "/index.html".equals(path))) {
                sendHtml(exchange, renderPage(Map.of()));
                return;
            }

            if ("POST".equals(method) && "/".equals(path)) {
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                sendHtml(exchange, renderPage(parseForm(body)));
                return;
            }

            if ("GET".equals(method)) {
                sendStaticFile(exchange, path);
                return;
            }

            exchange.sendResponseHeaders(405, -1);
        }
    }

    private static Map<String, String> parseForm(String body) {
        Map<String, String> form = new LinkedHashMap<>();
        if (body.isBlank()) {
            return form;
        }

        for (String pair : body.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = decode(parts[0]);
            String value = parts.length > 1 ? decode(parts[1]) : "";
            form.put(key, value);
        }
        return form;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static String renderPage(Map<String, String> formData) throws IOException {
        String sourceLanguage = formData.getOrDefault("source_language", "english");
        String targetLanguage = formData.getOrDefault("target_language", "chinese");
        String text = formData.getOrDefault("text", "");

        if (!SOURCE_LANGUAGES.contains(sourceLanguage)) {
            sourceLanguage = "english";
        }
        if (!TARGET_LANGUAGES.contains(targetLanguage)) {
            targetLanguage = "chinese";
        }

        TranslationResult result = text.isBlank()
                ? new TranslationResult("Your translation will appear here.", true)
                : translate(text, sourceLanguage, targetLanguage);

        String template = Files.readString(ROOT.resolve("index.html"), StandardCharsets.UTF_8);
        return template
                .replace("{{ source_options }}", selectedOptions(SOURCE_LANGUAGES, sourceLanguage))
                .replace("{{ target_options }}", selectedOptions(TARGET_LANGUAGES, targetLanguage))
                .replace("{{ source_text }}", escapeHtml(text))
                .replace("{{ translation }}", escapeHtml(result.message()))
                .replace("{{ output_class }}", result.empty() ? " empty" : "")
                .replace("{{ phrase_buttons }}", phraseButtons(sourceLanguage));
    }

    private static TranslationResult translate(String text, String sourceLanguage, String targetLanguage) {
        String trimmedText = text.trim();

        if (sourceLanguage.equals(targetLanguage)) {
            return new TranslationResult(trimmedText, false);
        }

        String cleanText = normalize(trimmedText);
        for (Map<String, String> phrase : PHRASE_BOOK) {
            if (normalize(phrase.get(sourceLanguage)).equals(cleanText)) {
                return new TranslationResult(phrase.get(targetLanguage), false);
            }
        }

        return new TranslationResult("I do not know that exact phrase yet. Try one of the suggested phrases.", true);
    }

    private static String normalize(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        String normalized = Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return normalized.replaceAll("[¿¡.,!?;:'\"]", "").replaceAll("\\s+", " ").trim();
    }

    private static String selectedOptions(List<String> languages, String activeLanguage) {
        StringBuilder options = new StringBuilder();
        for (String language : languages) {
            String selected = language.equals(activeLanguage) ? " selected" : "";
            options.append("<option value=\"")
                    .append(language)
                    .append("\"")
                    .append(selected)
                    .append(">")
                    .append(LANGUAGE_LABELS.get(language))
                    .append("</option>\n");
        }
        return options.toString();
    }

    private static String phraseButtons(String sourceLanguage) {
        StringBuilder buttons = new StringBuilder();
        for (Map<String, String> phrase : PHRASE_BOOK) {
            buttons.append("<button name=\"text\" value=\"")
                    .append(escapeHtml(phrase.get(sourceLanguage)))
                    .append("\" type=\"submit\">")
                    .append(escapeHtml(phrase.get("english")))
                    .append("</button>\n");
        }
        return buttons.toString();
    }

    private static void sendHtml(HttpExchange exchange, String html) throws IOException {
        byte[] response = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(200, response.length);
        try (OutputStream stream = exchange.getResponseBody()) {
            stream.write(response);
        }
    }

    private static void sendStaticFile(HttpExchange exchange, String requestPath) throws IOException {
        Path filePath = ROOT.resolve(requestPath.substring(1)).normalize();
        if (!filePath.startsWith(ROOT) || !Files.isRegularFile(filePath)) {
            exchange.sendResponseHeaders(404, -1);
            return;
        }

        byte[] response = Files.readAllBytes(filePath);
        exchange.getResponseHeaders().set("Content-Type", contentType(filePath));
        exchange.sendResponseHeaders(200, response.length);
        try (OutputStream stream = exchange.getResponseBody()) {
            stream.write(response);
        }
    }

    private static String contentType(Path filePath) {
        String fileName = filePath.getFileName().toString();
        if (fileName.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (fileName.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        return "application/octet-stream";
    }

    private static String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private record TranslationResult(String message, boolean empty) {
    }
}
