package main

import (
    "fmt"
    "os"
)

func main() {
    trunkSid := os.Getenv("TRUNK_SID")
    didNumber := os.Getenv("DID_NUMBER")
    
    if trunkSid == "" {
        fmt.Println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
        os.Exit(1)
    }
    
    if didNumber == "" {
        fmt.Println("Error: DID_NUMBER is required. Set it in your .env file.")
        os.Exit(1)
    }
    
    fmt.Printf("Mapping DID %s to trunk %s...\n", didNumber, trunkSid)
    
    payload := map[string]string{
        "phone_number": didNumber,
    }
    
    post("/trunks/"+trunkSid+"/phone-numbers", payload)
    fmt.Println("DID mapped successfully!")
} 