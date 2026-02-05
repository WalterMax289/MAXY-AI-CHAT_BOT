from flask import Flask, request, jsonify
from flask_cors import CORS
import threading

def create_app(model_name):
    """Factory function to create a Flask app for a specific model."""
    app = Flask(model_name)
    CORS(app)  # Allows your frontend to talk to this backend

    @app.route('/api/chat', methods=['POST'])
    def chat():
        data = request.json
        user_message = data.get('message', '')
        history = data.get('history', [])

        # --- MODEL LOGIC START ---
        # This is where you would call your actual AI model.
        # For now, we return a unique response based on the model version.
        response_text = f"[{model_name.upper()}]: I received your message: '{user_message}'"
        
        if model_name == "maxy_1_1":
            response_text += "\n(Note: I am the stable 1.1 version.)"
        elif model_name == "maxy_1_2":
            response_text += "\n(Note: I am the experimental 1.2 version.)"
        elif model_name == "maxy_1_3":
            response_text += "\n(Note: I am the latest 1.3 build.)"
        # --- MODEL LOGIC END ---

        return jsonify({"response": response_text})

    return app

# Define the apps
app1 = create_app("maxy_1_1")
app2 = create_app("maxy_1_2")
app3 = create_app("maxy_1_3")

def run_maxy1():
    app1.run(port=5000, host='127.0.0.1', debug=False, use_reloader=False)

def run_maxy2():
    app2.run(port=5001, host='127.0.0.1', debug=False, use_reloader=False)

def run_maxy3():
    app3.run(port=5002, host='127.0.0.1', debug=False, use_reloader=False)

if __name__ == "__main__":
    print("🚀 Starting all Maxy models...")
    
    # Run each server in a separate thread
    threading.Thread(target=run_maxy1).start()
    threading.Thread(target=run_maxy2).start()
    threading.Thread(target=run_maxy3).start()
    
    print("✅ Servers active on ports 5000, 5001, and 5002.")