public class MapDid {
    public static void main(String[] args) throws Exception {
        String trunkSid = System.getenv("TRUNK_SID");
        String didNumber = System.getenv("DID_NUMBER");
        
        if (trunkSid == null || trunkSid.isEmpty()) {
            System.err.println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.");
            System.exit(1);
        }
        
        if (didNumber == null || didNumber.isEmpty()) {
            System.err.println("Error: DID_NUMBER is required. Set it in your .env file.");
            System.exit(1);
        }
        
        System.out.printf("Mapping DID %s to trunk %s...%n", didNumber, trunkSid);
        
        String json = String.format("{\"phone_number\":\"%s\"}", didNumber);
        _Client.post("/trunks/" + trunkSid + "/phone-numbers", json);
        
        System.out.println("DID mapped successfully!");
    }
} 