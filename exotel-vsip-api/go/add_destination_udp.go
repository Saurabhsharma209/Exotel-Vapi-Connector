package main

import (
    "fmt"
    "os"
)

func main() {
    trunkSid := os.Getenv("TRUNK_SID")
    destIP := os.Getenv("TRUNK_DEST_IP")
    destPort := os.Getenv("TRUNK_DEST_PORT")
    
    if trunkSid == "" {
        fmt.Println("Error: TRUNK_SID is required. Set it in your .env file after creating a trunk.")
        os.Exit(1)
    }
    
    if destIP == "" || destPort == "" {
        fmt.Println("Error: TRUNK_DEST_IP and TRUNK_DEST_PORT are required. Set them in your .env file.")
        os.Exit(1)
    }
    
    dest := fmt.Sprintf("%s:%s", destIP, destPort)
    fmt.Printf("Adding UDP destination %s to trunk %s...\n", dest, trunkSid)
    
    payload := map[string]interface{}{
        "destinations": []map[string]string{
            {"destination": dest},
        },
    }
    
    post("/trunks/"+trunkSid+"/destination-uris", payload)
    fmt.Println("UDP destination added successfully!")
} 