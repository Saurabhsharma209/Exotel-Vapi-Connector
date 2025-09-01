public class CreateTrunk {
    public static void main(String[] args) throws Exception {
        System.out.println("Creating trunk...");
        
        String accountSid = System.getenv("EXO_ACCOUNT_SID");
        if (accountSid == null) {
            System.err.println("Error: EXO_ACCOUNT_SID is required");
            System.exit(1);
        }
        
        String json = String.format(
            "{\"trunk_name\":\"%s\",\"nso_code\":\"%s\",\"domain_name\":\"%s.pstn.exotel.com\"}",
            _Client.getenvDefault("TRUNK_NAME", "my_ai_trunk"),
            _Client.getenvDefault("NSO_CODE", "ANY-ANY"),
            accountSid
        );
        
        _Client.post("/trunks", json);
        System.out.println("Trunk created successfully!");
    }
} 