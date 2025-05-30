import os
import platform
import subprocess
import json
import datetime
import threading
import queue
import time
import socket
import re
from flask import Flask, request, jsonify, render_template, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = openai.OpenAI(api_key=openai_api_key)

MAX_RETRY_ATTEMPTS = 3
terminal_output_queue = queue.Queue()
current_command_status = {"status": "idle", "details": ""}


def get_system_info():
    ip_address = "Unknown"
    try:
        if platform.system() == "Windows":
            powershell_cmd = '''
            $eth = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" -ErrorAction SilentlyContinue).IPAddress; 
            if (-not $eth -or $eth.StartsWith("169")) { 
                (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress 
            } else { 
                $eth 
            }
            '''
            
            result = subprocess.run(
                ["powershell", "-Command", powershell_cmd],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0 and result.stdout.strip():
                ip_address = result.stdout.strip()
                if ip_address == "127.0.0.1":
                    ip_address = "Unknown"
            else:
                print(f"PowerShell error: {result.stderr.strip()}")
        else:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                s.connect(("8.8.8.8", 80))
                ip_address = s.getsockname()[0]
                s.close()
            except:
                hostname = socket.gethostname()
                ip_address = socket.gethostbyname(hostname)
                if ip_address == "127.0.0.1":
                    ip_address = "Unknown"
    except Exception as e:
        print(f"Error getting IP address: {str(e)}")
    
    return {
        "ip_address": ip_address,
        "os_name": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "hostname": platform.node()
    }


def format_timestamp():
    now = datetime.datetime.now()
    return now.strftime("%Y-%m-%d %I:%M %p")


def execute_command_with_output(command):
    global current_command_status
    
    try:
        current_command_status = {"status": "starting", "details": f"Preparing to execute: {command}"}
        terminal_output_queue.put({"status": "starting", "details": f"Preparing to execute: {command}"})
        
        current_command_status = {"status": "running", "details": f"Executing command: {command}"}
        terminal_output_queue.put({"status": "running", "details": f"Executing command: {command}"})
        
        stdout_output = []
        stderr_output = []
        
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        def read_output(pipe, is_error=False, output_list=None):
            for line in iter(pipe.readline, ''):
                if line:
                    line_text = line.strip()
                    terminal_output_queue.put({"status": "output", "details": line_text, "error": is_error})
                    if output_list is not None:
                        output_list.append(line_text)
                    time.sleep(0.01)
            pipe.close()
        
        stdout_thread = threading.Thread(target=read_output, args=(process.stdout, False, stdout_output))
        stderr_thread = threading.Thread(target=read_output, args=(process.stderr, True, stderr_output))
        
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        return_code = process.wait()
        
        stdout_thread.join()
        stderr_thread.join()
        
        if return_code != 0:
            current_command_status = {"status": "finished", "details": f"Command exited with code {return_code}"}
            terminal_output_queue.put({"status": "finished", "details": f"Command exited with code {return_code}"})
            return {"error": "\n".join(stderr_output) if stderr_output else f"Command exited with non-zero status: {return_code}"}
        else:
            current_command_status = {"status": "finished", "details": "Command completed successfully"}
            terminal_output_queue.put({"status": "finished", "details": "Command completed successfully"})
            return {"output": "\n".join(stdout_output) if stdout_output else "Command executed successfully but produced no output."}
    
    except Exception as e:
        current_command_status = {"status": "error", "details": str(e)}
        terminal_output_queue.put({"status": "error", "details": str(e)})
        return {"error": str(e)}


def execute_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.stderr:
            return {"error": result.stderr}
        return {"output": result.stdout}
    except Exception as e:
        return {"error": str(e)}


def contains_exception(output):
    error_patterns = [
        "Exception calling",
        "is not recognized as an internal or external command",
        "In Line",
        "Parameter set cannot be resolved using the specified named parameters",
        "The underlying connection was closed",
        "The cmdlet cannot run because the following parameter is missing",
        "The request was aborted"
    ]
    
    if isinstance(output, dict):
        if "error" in output and isinstance(output["error"], str):
            for pattern in error_patterns:
                if pattern in output["error"]:
                    return True, output["error"]
        
        if "output" in output and isinstance(output["output"], str):
            for pattern in error_patterns:
                if pattern in output["output"]:
                    return True, output["output"]
    
    return False, None


def get_fixed_command(original_command, error_message, user_query, system_info):
    try:
        fix_prompt = f"""You are an advanced system command assistant helping fix a command that produced an error.

Original user query: "{user_query}"

Command that failed: "{original_command}"

Error message received: 
{error_message}

Current system information:
- OS: {system_info['os_name']}
- Version: {system_info['os_version']}
- Release: {system_info['os_release']}
- Architecture: {system_info['architecture']}

TASK: Generate a corrected command that will work on this system. 
Look at the error message carefully to understand what went wrong, then fix the command.

IMPORTANT GUIDELINES:
1. ONLY respond with the exact fixed command to execute - no explanations, markdown, or additional text.
2. Make sure the command is compatible with the user's operating system ({system_info['os_name']}).
3. Ensure proper syntax and escape characters where needed.
4. If the original command used PowerShell but failed, try using a different approach or traditional CMD command.
5. If the error is about a command not being recognized, try finding an alternative command that provides similar functionality or use the full path to the command.
6. For Windows, if a command is not recognized, try using an equivalent PowerShell command.
7. NEVER include potentially harmful commands that could damage the system.
8. IF the user asks for an internet speed test or to check connection speed, ALWAYS use this command: powershell -Command "$s=Get-Date;iwr 'http://speedtest.tele2.net/1MB.zip' -OutFile "$env:TEMP\1MB.zip";$d=((Get-Date)-$s).TotalSeconds;rm "$env:TEMP\1MB.zip";"Download speed: $([math]::Round(8/$d,2)) Mbps""

Generate ONLY the corrected command:"""

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": fix_prompt},
            ],
            max_tokens=150
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error getting fixed command: {str(e)}")
        return original_command


def format_command_output(command, output, user_query):
    if isinstance(output, dict) and "error" in output:
        return output
    
    if isinstance(output, dict) and "output" in output:
        formatted_output = output["output"].strip()
        
        if not formatted_output:
            return {"output": "The command executed successfully but returned no output."}
        
        if len(formatted_output) > 10000:
            formatted_output = formatted_output[:10000] + "\n\n[Output truncated due to size]"
            
        return {"output": formatted_output}
    
    return output


def build_context_from_history(message_history):
    context = ""
    if message_history and message_history.get('user_messages') and message_history.get('system_responses'):
        user_messages = message_history.get('user_messages', [])
        system_responses = message_history.get('system_responses', [])
        
        if user_messages:
            context += "Previous user queries:\n"
            for msg in user_messages:
                content = msg.get('content', '')
                if content:
                    context += f"- {content}\n"
        
        if system_responses:
            context += "\nPrevious system responses:\n"
            for msg in system_responses:
                content = msg.get('content', '')
                if content:
                    context += f"- {content}\n"
    
    return context


def clear_terminal_queue():
    while not terminal_output_queue.empty():
        try:
            terminal_output_queue.get_nowait()
            terminal_output_queue.task_done()
        except queue.Empty:
            break


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/system_info', methods=['GET'])
def system_info():
    return jsonify(get_system_info())


@app.route('/terminal_stream', methods=['GET'])
def terminal_stream():
    def generate():
        while True:
            try:
                output = terminal_output_queue.get(timeout=1)
                yield f"data: {json.dumps(output)}\n\n"
                terminal_output_queue.task_done()
            except queue.Empty:
                yield f"data: {json.dumps({'status': 'heartbeat'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'status': 'error', 'details': str(e)})}\n\n"
                break
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')


@app.route('/query', methods=['POST'])
def process_query():
    data = request.json
    user_query = data.get('query', '')
    message_history = data.get('history', {'user_messages': [], 'system_responses': []})
    system_info = get_system_info()
    current_time = format_timestamp()
    
    clear_terminal_queue()
    context = build_context_from_history(message_history)
    
    try:
        system_prompt = f"""You are an advanced system command assistant helping users gather information about their computer.

Current system information:
- OS: {system_info['os_name']}
- Version: {system_info['os_version']}
- Release: {system_info['os_release']}
- Architecture: {system_info['architecture']}
- Current time: {current_time}

Your task is to generate the most appropriate terminal command that will provide the information the user is asking for.

IMPORTANT GUIDELINES:
1. ONLY respond with the exact command to execute - no explanations, markdown, or additional text.
2. Make sure the command is compatible with the user's operating system ({system_info['os_name']}).
3. Use commands that produce human-readable output.
4. For Windows, prefer PowerShell commands when possible for better formatting.
5. For complex data, use commands that format the output in a readable way.
6. For large outputs, consider adding filters to show only the most relevant information.
7. If the user wants to see processes, memory usage, or similar system stats, use commands that sort or limit the output to the most relevant items.
8. NEVER include potentially harmful commands that could damage the system.
9. Be careful with syntax and escaping of special characters.

{context}

Based on the system information above, provide ONLY the command to answer the user's query.
"""

        terminal_output_queue.put({"status": "analyzing", "details": "Analyzing your query to determine the best command..."})
        
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            max_tokens=1150
        )
        
        command = response.choices[0].message.content.strip()
        terminal_output_queue.put({"status": "command_generated", "details": f"Generated command: {command}"})
        
        retry_count = 0
        current_command = command
        last_error = None
        
        while retry_count < MAX_RETRY_ATTEMPTS:
            terminal_output_queue.put({"status": "executing", "details": f"Executing command (attempt {retry_count + 1}/{MAX_RETRY_ATTEMPTS}): {current_command}"})
            
            result = execute_command_with_output(current_command)
            has_exception, error_message = contains_exception(result)
            
            if has_exception:
                retry_count += 1
                last_error = error_message
                
                if retry_count < MAX_RETRY_ATTEMPTS:
                    terminal_output_queue.put({"status": "fixing", "details": f"Command failed. Attempting to fix the issue..."})
                    current_command = get_fixed_command(current_command, error_message, user_query, system_info)
                    terminal_output_queue.put({"status": "fixed", "details": f"Fixed command: {current_command}"})
                    continue
            else:
                break
        
        formatted_result = format_command_output(current_command, result, user_query)
        
        if retry_count == MAX_RETRY_ATTEMPTS and last_error:
            formatted_result = {
                "output": f"After {MAX_RETRY_ATTEMPTS} attempts, the command still produced errors. Here's the output:\n\n{result.get('output', result.get('error', 'No output'))}"
            }
            terminal_output_queue.put({"status": "failed", "details": f"Command failed after {MAX_RETRY_ATTEMPTS} attempts."})
        else:
            terminal_output_queue.put({"status": "completed", "details": "Command execution completed successfully."})
        
        return jsonify({
            "query": user_query,
            "command": current_command,
            "result": formatted_result,
            "system_info": system_info,
            "timestamp": current_time,
            "retry_count": retry_count
        })
    except Exception as e:
        terminal_output_queue.put({"status": "error", "details": f"Error processing request: {str(e)}"})
        return jsonify({"error": str(e)})


@app.route('/explain', methods=['POST'])
def explain_output():
    data = request.json
    command = data.get('command', '')
    output = data.get('output', '')
    system_info = get_system_info()
    
    try:
        explain_prompt = f"""You are an expert system administrator tasked with explaining command outputs concisely.

Command executed: {command}

Output received:
{output}

Current system information:
- OS: {system_info['os_name']}
- Version: {system_info['os_version']}
- Architecture: {system_info['architecture']}

Please provide a brief, clear explanation of what this output means. Explain any technical terms that a non-expert might not understand.
Focus on the key information and explain what it tells us about the system.

IMPORTANT:
1. Use Markdown formatting to enhance readability (e.g., **bold** for important terms, `code` for commands or values, etc.)
2. You may use bullet points for listing multiple pieces of information
3. Your explanation should be concise (3-5 sentences maximum) but comprehensive
4. Organize your response with proper Markdown formatting for clarity
5. If relevant, include a brief explanation of what the command itself does

Format your response in clear, professional Markdown.
"""

        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini-2025-04-14",
            messages=[
                {"role": "system", "content": explain_prompt},
            ],
            max_tokens=300
        )
        
        explanation = response.choices[0].message.content.strip()
        return jsonify({"explanation": explanation})
    except Exception as e:
        return jsonify({"error": f"Error generating explanation: {str(e)}"})


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static/images'),
                               'favicon.svg', mimetype='image/svg+xml')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80) 