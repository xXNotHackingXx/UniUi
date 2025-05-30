#!/bin/bash

echo "Setting up uniui.local domain..."

# Check for root privileges
if [ "$EUID" -ne 0 ]; then
  echo "This script requires root privileges."
  echo "Please run with sudo: sudo $0"
  exit 1
fi

# Path to the hosts file
HOSTS_FILE="/etc/hosts"

# Check if uniui.local is already in the hosts file
if grep -q "uniui.local" $HOSTS_FILE; then
  echo "uniui.local is already in your hosts file."
else
  # Add the entry to the hosts file
  echo "127.0.0.1 uniui.local" >> $HOSTS_FILE
  if [ $? -eq 0 ]; then
    echo "Successfully added uniui.local to your hosts file."
  else
    echo "Failed to add uniui.local to your hosts file."
    echo "Please check your permissions or add it manually."
  fi
fi

echo ""
echo "Done! You can now access the application at http://uniui.local"
echo ""

# For other network devices
echo "For other devices on your network to access this server:"
echo "1. Find your IP address:"
echo "   IP address: $(hostname -I 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)"
echo "2. On each device, add the following to their hosts file:"
echo "   <YOUR_IP_ADDRESS> uniui.local"
echo "" 