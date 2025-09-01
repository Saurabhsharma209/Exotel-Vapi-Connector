public class AddDestinationTcp {
    public static void main(String[] args) throws Exception {
        String trunkSid = System.getenv("TRUNK_SID");
        String destIp = System.getenv("TRUNK_DEST_IP");
        String destPort = System.getenv("TRUNK_DEST_PORT");
        
        if (trunkSid == null || trunkSid.isEmpty()) {
            System.err.println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.");
            System.exit(1);
        }
        
        if (destIp == null || destIp.isEmpty() || destPort == null || destPort.isEmpty()) {
            System.err.println("Error: TRUNK_DEST_IP and TRUNK_DEST_PORT are required. Set them in your .env file.");
            System.exit(1);
        }
        
        String dest = destIp + ":" + destPort + ";transport=tcp";
        System.out.printf("Adding TCP destination %s to trunk %s...%n", dest, trunkSid);
        
        String json = String.format("{\"destinations\":[{\"destination\":\"%s\"}]}", dest);
        _Client.post("/trunks/" + trunkSid + "/destination-uris", json);
        
        System.out.println("TCP destination added successfully!");
    }
} 