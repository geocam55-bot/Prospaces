#!/bin/bash

# Fix all versioned imports in the codebase
# This script removes version numbers from package imports

echo "Fixing versioned imports..."

# Find all .tsx and .ts files and process them
find components -type f -name "*.tsx" -o -name "*.ts" | while read -r file; do
  # Skip if file doesn't exist
  [ ! -f "$file" ] && continue
  
  # Create a backup
  cp "$file" "$file.bak"
  
  # Remove version numbers from imports using sed
  sed -i 's/@radix-ui\/react-[a-z-]\+@[0-9.]\+/@radix-ui\/react-\1/g' "$file"
  sed -i 's/lucide-react@[0-9.]\+/lucide-react/g' "$file"
  sed -i 's/class-variance-authority@[0-9.]\+/class-variance-authority/g' "$file"
  sed -i 's/react-day-picker@[0-9.]\+/react-day-picker/g' "$file"
  sed -i 's/embla-carousel-react@[0-9.]\+/embla-carousel-react/g' "$file"
  sed -i 's/recharts@[0-9.]\+/recharts/g' "$file"
  sed -i 's/cmdk@[0-9.]\+/cmdk/g' "$file"
  sed -i 's/vaul@[0-9.]\+/vaul/g' "$file"
  sed -i 's/input-otp@[0-9.]\+/input-otp/g' "$file"
  sed -i 's/react-resizable-panels@[0-9.]\+/react-resizable-panels/g' "$file"
  
  # Check if file changed
  if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
    echo "Fixed: $file"
  fi
  
  # Remove backup
  rm "$file.bak"
done

echo "Done!"
