#!/bin/bash
curl -X POST https://ozelihznyvcmebjqeebm.supabase.co/functions/v1/analyzeProduct \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZWxpaHpueXZjbWVianFlZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzIyOTAsImV4cCI6MjA3MDU0ODI5MH0.J01ZRpA60F8Y95EJF7FVYtDXPQtL_r5_xWOlf8o7UoY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "101372bd-d678-4d37-a004-da061399d5a0",
    "product": {
      "product_name": "Chocolate Chip Cookies",
      "product_name_en": "Chocolate Chip Cookies",
      "ingredients_text": "wheat flour, sugar, butter, chocolate chips (sugar, cocoa butter, milk powder), eggs",
      "ingredients_text_en": "wheat flour, sugar, butter, chocolate chips (sugar, cocoa butter, milk powder), eggs",
      "code": "1234567890",
      "brands": "Test Brand"
    }
  }'