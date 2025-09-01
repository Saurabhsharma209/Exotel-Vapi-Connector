import java.net.URI;
import java.net.http.*;
import java.time.Duration;

public class _Client {
    
    /**
     * Get the base URL for Exotel API calls
     */
    static String base() {
        String authKey = System.getenv("EXO_AUTH_KEY");
        String authToken = System.getenv("EXO_AUTH_TOKEN");
        String domain = System.getenv("EXO_SUBSCRIBIX_DOMAIN");
        String accountSid = System.getenv("EXO_ACCOUNT_SID");
        
        if (authKey == null || authToken == null || domain == null || accountSid == null) {
            System.err.println("Error: Missing required environment variables (EXO_AUTH_KEY, EXO_AUTH_TOKEN, EXO_SUBSCRIBIX_DOMAIN, EXO_ACCOUNT_SID)");
            System.exit(1);
        }
        
        return String.format("https://%s:%s@%s/v2/accounts/%s", authKey, authToken, domain, accountSid);
    }
    
    /**
     * Make a POST request to the Exotel API
     */
    static String post(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(base() + path))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofSeconds(30))
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        
        HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
        
        if (resp.statusCode() >= 400) {
            System.err.printf("HTTP Error %d: %s%n", resp.statusCode(), resp.body());
            System.exit(1);
        }
        
        System.out.println(resp.body());
        return resp.body();
    }
    
    /**
     * Get environment variable with default value
     */
    static String getenvDefault(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value != null && !value.isEmpty()) ? value : defaultValue;
    }
} 