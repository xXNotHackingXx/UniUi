# UniUI - Talk To Your System

UniUI is an intuitive web application that allows users to query system information through a natural language chat interface. It translates user queries into appropriate system commands and provides human-readable responses, making system administration and troubleshooting accessible to users of all technical levels.

[<img src="https://github.com/calinux-py/UniUi/blob/main/uniui.png?raw=true" alt="UniUi" width="100%">](https://github.com/calinux-py/UniUi/blob/main/uniui.png)

## Features

- **Natural Language Interface**: Ask questions about your system in plain English
- **Real-time Command Execution**: Executes appropriate system commands based on user queries
- **Smart Command Correction**: Automatically attempts to fix failed commands
- **Cross-Platform Support**: Works on Windows, macOS, and Linux systems
- **Detailed Explanations**: Provides explanations of command outputs
- **Network Accessibility**: Access from any device on your local network via `http://uniui.local`
- **Real-time Terminal Output**: See command execution progress in real-time
- **Command History**: Review previous commands and their outputs
- **System Information Display**: Quick access to key system details

## Requirements

- Python 3.7 or higher
- OpenAI API key
- Flask and other dependencies (listed in requirements.txt)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/calinux-py/UniUi.git
   cd UniUi
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Network Setup

### Automatic Setup (Recommended)

Run one of the setup scripts to configure your hosts file automatically:

- **Windows**: Right-click on `setup_local_domain.bat` and select "Run as administrator"
- **macOS/Linux**: Run the shell script with sudo:
  ```bash
  sudo ./setup_local_domain.sh
  ```

### Manual Setup

Add the following entry to your hosts file:

```
127.0.0.1 uniui.local
```

The hosts file is located at:
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- macOS/Linux: `/etc/hosts`

## Usage

1. Start the application:
   ```bash
   python app.py
   ```

2. Access the web interface:
   - From the host machine: http://uniui.local or http://localhost
   - From other devices on your network: UniUi will provide the local network address to view

3. Ask questions about your system in the chat interface:
   - "What is my IP address?"
   - "How much disk space do I have?"
   - "Show me the running processes"
   - "What's my system uptime?"
   - "Show me information about my CPU"
   - "Check my internet connection speed"

## Development

### Project Structure

```
UniUI-WebApp/
├── app.py                     # Main application file
├── .env                       # Configuration file for openai API
├── static/                    # Static assets
│   ├── css/                   # CSS stylesheets
│   ├── js/                    # JavaScript files
│   └── images/                # Images and icons
├── templates/                 # HTML templates
│   └── index.html             # Main application template
├── setup_local_domain.bat     # Windows setup script
├── setup_local_domain.sh      # macOS/Linux setup script
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```
