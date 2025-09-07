# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import uuid
import math
import re

app = Flask(__name__)
# Enable CORS for cross-origin requests from the frontend
CORS(app) 

# Simple in-memory "database" to store formulas
formulas_db = []
# Initialize with some example data
formulas_db.append({
    "id": str(uuid.uuid4()),
    "name": "Area of Rectangle",
    "formula_string": "length * width",
    "result_label": "Area"
})
formulas_db.append({
    "id": str(uuid.uuid4()),
    "name": "Simple Interest",
    "formula_string": "(principal * rate * time) / 100",
    "result_label": "Interest"
})
formulas_db.append({
    "id": str(uuid.uuid4()),
    "name": "Pythagorean Theorem",
    "formula_string": "sqrt(a**2 + b**2)",
    "result_label": "Hypotenuse (c)"
})


def extract_variables(formula_string):
    """
    Extracts variables from a formula string.
    """
    variables = set(re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', formula_string))
    common_keywords = {'PI', 'E', 'sin', 'cos', 'tan', 'log', 'abs', 'sqrt', 'pow', 'round', 'floor', 'ceil', 'min', 'max'}
    return sorted(list(variables - common_keywords))

def safe_eval(formula_string, variables):
    """
    Safely evaluates a mathematical expression using a limited set of functions.
    """
    safe_globals = {
        '__builtins__': None,
        'math': math,
        'PI': math.pi,
        'E': math.e,
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'log': math.log,
        'abs': abs,
        'sqrt': math.sqrt,
        'pow': math.pow,
        'round': round,
        'floor': math.floor,
        'ceil': math.ceil,
        'min': min,
        'max': max,
        **variables
    }
    
    formula_string = formula_string.replace('^', '**')

    try:
        # Use eval with a restricted scope
        return eval(formula_string, {"__builtins__": {}}, safe_globals)
    except Exception as e:
        return f"Error: {e}"

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/formulas', methods=['GET'])
def get_formulas():
    """Returns a list of all stored formulas."""
    return jsonify(formulas_db)

@app.route('/api/formulas', methods=['POST'])
def add_formula():
    """Adds a new formula to the database."""
    data = request.json
    name = data.get('name')
    formula_string = data.get('formulaString')
    result_label = data.get('resultLabel')
    
    if not all([name, formula_string, result_label]):
        return jsonify({"error": "Missing data"}), 400

    if any(f['name'] == name for f in formulas_db):
        return jsonify({"error": f"A formula named '{name}' already exists."}), 409

    new_formula = {
        "id": str(uuid.uuid4()),
        "name": name,
        "formula_string": formula_string,
        "result_label": result_label
    }
    formulas_db.append(new_formula)
    return jsonify(new_formula), 201

@app.route('/api/formulas/<formula_id>', methods=['DELETE'])
def delete_formula(formula_id):
    """Deletes a formula by its ID."""
    global formulas_db
    initial_count = len(formulas_db)
    formulas_db = [f for f in formulas_db if f['id'] != formula_id]
    if len(formulas_db) == initial_count:
        return jsonify({"error": "Formula not found"}), 404
    return jsonify({"message": "Formula deleted successfully"}), 200

@app.route('/api/calculate', methods=['POST'])
def calculate():
    """Calculates a formula based on provided variables."""
    data = request.json
    formula_string = data.get('formulaString')
    variables = data.get('variables', {})
    
    if not formula_string:
        return jsonify({"error": "Missing formula string"}), 400
    
    try:
        result = safe_eval(formula_string, variables)
        if isinstance(result, str) and "Error" in result:
             return jsonify({"error": result}), 400
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)