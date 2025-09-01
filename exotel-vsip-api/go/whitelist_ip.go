package main

import (
    "fmt"
    "os"
    "strconv"
)

func main() {
    trunkSid := os.Getenv("TRUNK_SID")
    whitelistIP := os.Getenv("WHITELIST_IP")
    whitelistMaskStr := getenvDefault("WHITELIST_MASK", "32")
    
    if trunkSid == "" {
        fmt.Println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
        os.Exit(1)
    }
    
    if whitelistIP == "" {
        fmt.Println("Error: WHITELIST_IP is required. Set it in your .env file.")
        os.Exit(1)
    }
    
    whitelistMask, err := strconv.Atoi(whitelistMaskStr)
    if err != nil {
        fmt.Printf("Error: Invalid WHITELIST_MASK value: %s\n", whitelistMaskStr)
        os.Exit(1)
    }
    
    fmt.Printf("Whitelisting IP %s/%d for trunk %s...\n", whitelistIP, whitelistMask, trunkSid)
    
    payload := map[string]interface{}{
        "ip":   whitelistIP,
        "mask": whitelistMask,
    }
    
    post("/trunks/"+trunkSid+"/whitelisted-ips", payload)
    fmt.Println("IP whitelisted successfully!")
} 