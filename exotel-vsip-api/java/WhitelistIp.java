public class WhitelistIp {
    public static void main(String[] args) throws Exception {
        String trunkSid = System.getenv("TRUNK_SID");
        String whitelistIp = System.getenv("WHITELIST_IP");
        String whitelistMask = _Client.getenvDefault("WHITELIST_MASK", "32");
        
        if (trunkSid == null || trunkSid.isEmpty()) {
            System.err.println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.");
            System.exit(1);
        }
        
        if (whitelistIp == null || whitelistIp.isEmpty()) {
            System.err.println("Error: WHITELIST_IP is required. Set it in your .env file.");
            System.exit(1);
        }
        
        System.out.printf("Whitelisting IP %s/%s for trunk %s...%n", whitelistIp, whitelistMask, trunkSid);
        
        String json = String.format("{\"ip\":\"%s\",\"mask\":%s}", whitelistIp, whitelistMask);
        _Client.post("/trunks/" + trunkSid + "/whitelisted-ips", json);
        
        System.out.println("IP whitelisted successfully!");
    }
} 