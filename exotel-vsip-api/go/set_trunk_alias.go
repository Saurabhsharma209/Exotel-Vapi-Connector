package main

import (
    "fmt"
    "os"
)

func main() {
    trunkSid := os.Getenv("TRUNK_SID")
    exophone := os.Getenv("EXOPHONE")
    
    if trunkSid == "" {
        fmt.Println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
        os.Exit(1)
    }
    
    if exophone == "" {
        fmt.Println("Warning: EXOPHONE is not set. Skipping trunk alias configuration.")
        os.Exit(0)
    }
    
    fmt.Printf("Setting trunk alias %s for trunk %s...\n", exophone, trunkSid)
    
    payload := map[string]interface{}{
        "settings": []map[string]string{
            {"name": "trunk_external_alias", "value": exophone},
        },
    }
    
    post("/trunks/"+trunkSid+"/settings", payload)
    fmt.Println("Trunk alias set successfully!")
} 