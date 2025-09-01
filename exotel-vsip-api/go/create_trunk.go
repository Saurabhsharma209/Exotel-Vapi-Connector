package main

import (
    "fmt"
    "os"
)

func main() {
    fmt.Println("Creating trunk...")
    
    trunkData := map[string]string{
        "trunk_name":  getenvDefault("TRUNK_NAME", "my_ai_trunk"),
        "nso_code":    getenvDefault("NSO_CODE", "ANY-ANY"),
        "domain_name": os.Getenv("EXO_ACCOUNT_SID") + ".pstn.exotel.com",
    }
    
    post("/trunks", trunkData)
    fmt.Println("Trunk created successfully!")
} 