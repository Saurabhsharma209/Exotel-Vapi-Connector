public class SetTrunkAlias {
    public static void main(String[] args) throws Exception {
        String trunkSid = System.getenv("TRUNK_SID");
        String exophone = System.getenv("EXOPHONE");
        
        if (trunkSid == null || trunkSid.isEmpty()) {
            System.err.println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.");
            System.exit(1);
        }
        
        if (exophone == null || exophone.isEmpty()) {
            System.out.println("Warning: EXOPHONE is not set. Skipping trunk alias configuration.");
            System.exit(0);
        }
        
        System.out.printf("Setting trunk alias %s for trunk %s...%n", exophone, trunkSid);
        
        String json = String.format("{\"settings\":[{\"name\":\"trunk_external_alias\",\"value\":\"%s\"}]}", exophone);
        _Client.post("/trunks/" + trunkSid + "/settings", json);
        
        System.out.println("Trunk alias set successfully!");
    }
} 