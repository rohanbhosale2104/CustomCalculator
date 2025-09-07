// static/js/script.js

// DOM Elements
const addFormulaBtn = document.getElementById('addFormulaBtn');
const formulaNameInput = document.getElementById('formulaName');
const formulaStringInput = document.getElementById('formulaString');
const resultLabelInput = document.getElementById('resultLabel');
const formulasContainer = document.getElementById('formulasContainer');

// Modal Elements
const subFormulaModal = document.getElementById('subFormulaModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const selectSubFormula = document.getElementById('selectSubFormula');
const subFormulaInputsContainer = document.getElementById('subFormulaInputs');
const subFormulaResultDisplay = document.getElementById('subFormulaResultDisplay');
const subFormulaResultSpan = subFormulaResultDisplay.querySelector('span:last-child');
const calculateAndUseBtn = document.getElementById('calculateAndUseBtn');

// API Base URL
const API_URL = 'http://127.0.0.1:5000/api';

// Variables to manage modal state
let currentTargetInputId = null;
let currentSubFormulaId = null;
let allFormulas = [];

// Helper to extract variables (same as original, but now on the frontend)
const extractVariables = (formula) => {
    const variables = new Set();
    const commonMathKeywords = ['PI', 'E', 'sin', 'cos', 'tan', 'log', 'abs', 'sqrt', 'pow', 'round', 'floor', 'ceil', 'min', 'max'];
    const regex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
        const variable = match[0];
        if (!commonMathKeywords.includes(variable) && isNaN(variable)) {
            variables.add(variable);
        }
    }
    return Array.from(variables).sort();
};

// Function to fetch formulas from the backend and render them
const fetchAndRenderFormulas = async () => {
    try {
        const response = await fetch(`${API_URL}/formulas`);
        if (!response.ok) {
            throw new Error('Failed to fetch formulas.');
        }
        const formulas = await response.json();
        allFormulas = formulas; // Store fetched formulas
        formulasContainer.innerHTML = ''; // Clear existing cards
        formulas.forEach(formula => renderFormulaCard(formula));
    } catch (error) {
        console.error("Error fetching formulas:", error);
        showMessageBox('Could not load formulas.', 'error');
    }
};

// Function to render a single formula card
const renderFormulaCard = (formula) => {
    const variables = extractVariables(formula.formula_string);

    const card = document.createElement('div');
    card.id = `formula-card-${formula.id}`;
    card.className = 'formula-card';

    let inputsHtml = '';
    variables.forEach(variable => {
        inputsHtml += `
            <div class="input-group">
                <label for="input-${formula.id}-${variable}" class="block text-gray-600 text-sm font-medium">${variable}:</label>
                <input type="number" id="input-${formula.id}-${variable}" class="formula-input" placeholder="Value for ${variable}">
                <button class="link-formula-btn" data-target-input-id="input-${formula.id}-${variable}" title="Use result from another formula">F</button>
            </div>
        `;
    });

    card.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h3 class="text-xl font-semibold text-gray-800">${formula.name}</h3>
            <button class="delete" data-id="${formula.id}">Delete</button>
        </div>
        <div class="text-gray-600 text-sm mb-3">Formula: <code class="bg-gray-100 p-1 rounded">${formula.formula_string}</code></div>
        <div class="flex-wrap-gap">
            ${inputsHtml}
        </div>
        <button class="primary calculate-btn" data-id="${formula.id}">Calculate</button>
        <div id="result-${formula.id}" class="result-display hidden">
            <span class="text-gray-700">${formula.result_label}:</span>
            <span class="font-bold text-blue-800"></span>
        </div>
    `;

    formulasContainer.appendChild(card);

    // Add event listeners to the newly created elements
    card.querySelector(`.calculate-btn`).addEventListener('click', () => calculateFormula(formula.id));
    card.querySelector(`.delete`).addEventListener('click', () => deleteFormula(formula.id));
    card.querySelectorAll('.link-formula-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            openSubFormulaModal(event.target.dataset.targetInputId);
        });
    });
};

// Function to add a new formula
addFormulaBtn.addEventListener('click', async () => {
    const name = formulaNameInput.value.trim();
    const formulaString = formulaStringInput.value.trim();
    const resultLabel = resultLabelInput.value.trim();

    if (!name || !formulaString || !resultLabel) {
        showMessageBox('Please fill in all fields.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/formulas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, formulaString, resultLabel })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }
        showMessageBox(`Formula "${data.name}" added successfully!`, 'success');
        await fetchAndRenderFormulas(); // Re-render all formulas
        formulaNameInput.value = '';
        formulaStringInput.value = '';
        resultLabelInput.value = '';
    } catch (error) {
        showMessageBox(error.message, 'error');
    }
});

// Function to calculate a formula
const calculateFormula = async (id) => {
    const formula = allFormulas.find(f => f.id === id);
    if (!formula) return;

    const variables = extractVariables(formula.formula_string);
    const variableValues = {};
    let allInputsValid = true;

    variables.forEach(variable => {
        const inputElement = document.getElementById(`input-${id}-${variable}`);
        if (!inputElement) {
            allInputsValid = false;
            console.error(`Input element for variable "${variable}" not found.`);
            return;
        }

        const value = parseFloat(inputElement.value);
        if (isNaN(value)) {
            allInputsValid = false;
            inputElement.style.borderColor = '#ef4444';
        } else {
            inputElement.style.borderColor = '#cbd5e1';
            variableValues[variable] = value;
        }
    });

    const resultDisplay = document.getElementById(`result-${id}`);
    const resultSpan = resultDisplay.querySelector('span:last-child');

    if (!allInputsValid) {
        resultSpan.textContent = 'Please enter valid numbers.';
        resultDisplay.classList.remove('hidden');
        resultDisplay.style.backgroundColor = '#fef2f2';
        resultDisplay.style.color = '#b91c1c';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formulaString: formula.formula_string, variables: variableValues })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }
        resultSpan.textContent = data.result.toFixed(4);
        resultDisplay.style.backgroundColor = '#e0f2fe';
        resultDisplay.style.color = '#1e40af';
    } catch (error) {
        resultSpan.textContent = `Error: ${error.message}`;
        resultDisplay.style.backgroundColor = '#fef2f2';
        resultDisplay.style.color = '#b91c1c';
        console.error("Calculation error:", error);
    }
    resultDisplay.classList.remove('hidden');
};

// Function to delete a formula
const deleteFormula = (id) => {
    showConfirmationBox('Are you sure you want to delete this formula?', async () => {
        try {
            const response = await fetch(`${API_URL}/formulas/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            const cardToRemove = document.getElementById(`formula-card-${id}`);
            if (cardToRemove) {
                cardToRemove.remove();
                showMessageBox('Formula deleted successfully!', 'success');
            }
        } catch (error) {
            showMessageBox(error.message, 'error');
        }
    });
};

// --- Modal Logic ---
const openSubFormulaModal = (targetInputId) => {
    currentTargetInputId = targetInputId;
    subFormulaModal.classList.add('show');
    subFormulaInputsContainer.innerHTML = '';
    subFormulaResultDisplay.classList.add('hidden');
    
    selectSubFormula.innerHTML = '<option value="">-- Select Formula --</option>';
    allFormulas.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.name;
        selectSubFormula.appendChild(option);
    });
    currentSubFormulaId = null;
    calculateAndUseBtn.disabled = true;
    selectSubFormula.value = "";
};

const closeModal = () => {
    subFormulaModal.classList.remove('show');
    currentTargetInputId = null;
    currentSubFormulaId = null;
};

selectSubFormula.addEventListener('change', () => {
    currentSubFormulaId = selectSubFormula.value;
    subFormulaInputsContainer.innerHTML = '';
    subFormulaResultDisplay.classList.add('hidden');
    calculateAndUseBtn.disabled = true;

    if (currentSubFormulaId) {
        const subFormula = allFormulas.find(f => f.id === currentSubFormulaId);
        if (subFormula) {
            const variables = extractVariables(subFormula.formula_string);
            if (variables.length === 0) {
                subFormulaInputsContainer.innerHTML = `<p class="text-gray-600">This formula has no variables.</p>`;
                calculateAndUseBtn.disabled = false;
            } else {
                variables.forEach(variable => {
                    const inputDiv = document.createElement('div');
                    inputDiv.className = 'flex flex-col w-full md:w-1/2 lg:w-1/3 p-1';
                    inputDiv.innerHTML = `
                        <label for="modal-input-${subFormula.id}-${variable}" class="text-gray-600 text-sm font-medium mb-1">${variable}:</label>
                        <input type="number" id="modal-input-${subFormula.id}-${variable}" class="formula-input" placeholder="Value for ${variable}">
                    `;
                    subFormulaInputsContainer.appendChild(inputDiv);
                });
                calculateAndUseBtn.disabled = false;
            }
        }
    }
});

calculateAndUseBtn.addEventListener('click', async () => {
    if (!currentSubFormulaId || !currentTargetInputId) {
        showMessageBox('Error: No sub-formula selected or target input missing.', 'error');
        return;
    }

    const subFormula = allFormulas.find(f => f.id === currentSubFormulaId);
    if (!subFormula) {
        showMessageBox('Error: Sub-formula not found.', 'error');
        return;
    }

    const variables = extractVariables(subFormula.formula_string);
    const variableValues = {};
    let allInputsValid = true;

    variables.forEach(variable => {
        const inputElement = document.getElementById(`modal-input-${subFormula.id}-${variable}`);
        if (!inputElement) {
             allInputsValid = false;
             console.error(`Modal input element for variable "${variable}" not found.`);
             return;
        }
        const value = parseFloat(inputElement.value);

        if (isNaN(value)) {
            allInputsValid = false;
            inputElement.style.borderColor = '#ef4444';
        } else {
            inputElement.style.borderColor = '#cbd5e1';
            variableValues[variable] = value;
        }
    });

    if (!allInputsValid) {
        subFormulaResultSpan.textContent = 'Please enter valid numbers for all inputs.';
        subFormulaResultDisplay.classList.remove('hidden');
        subFormulaResultDisplay.style.backgroundColor = '#fef2f2';
        subFormulaResultDisplay.style.color = '#b91c1c';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formulaString: subFormula.formula_string, variables: variableValues })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }
        subFormulaResultSpan.textContent = data.result.toFixed(4);
        subFormulaResultDisplay.style.backgroundColor = '#e0f2fe';
        subFormulaResultDisplay.style.color = '#1e40af';
        subFormulaResultDisplay.classList.remove('hidden');

        const targetInput = document.getElementById(currentTargetInputId);
        if (targetInput) {
            targetInput.value = data.result.toFixed(4);
            targetInput.style.borderColor = '#22c55e';
            setTimeout(() => targetInput.style.borderColor = '#cbd5e1', 1500);
        }
        closeModal();
        showMessageBox(`Result of "${subFormula.name}" used for input.`, 'success');
    } catch (error) {
        subFormulaResultSpan.textContent = `Error: ${error.message}`;
        subFormulaResultDisplay.style.backgroundColor = '#fef2f2';
        subFormulaResultDisplay.style.color = '#b91c1c';
        console.error("Sub-formula calculation error:", error);
    }
});

// Modal close buttons
modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);
subFormulaModal.addEventListener('click', (event) => {
    if (event.target === subFormulaModal) {
        closeModal();
    }
});

// --- Custom Message Box and Confirmation Box ---
function showMessageBox(message, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white z-2000`;
    if (type === 'success') {
        messageBox.classList.add('bg-green-500');
    } else if (type === 'error') {
        messageBox.classList.add('bg-red-500');
    } else {
        messageBox.classList.add('bg-blue-500');
    }
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
        messageBox.remove();
    }, 3000);
}

function showConfirmationBox(message, onConfirm) {
    const confirmationOverlay = document.createElement('div');
    confirmationOverlay.className = `fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-2000`;
    confirmationOverlay.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <p class="text-gray-800 text-lg mb-6">${message}</p>
            <div class="flex justify-end gap-3">
                <button id="confirmCancelBtn" class="secondary">Cancel</button>
                <button id="confirmOkBtn" class="delete">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmationOverlay);

    document.getElementById('confirmOkBtn').addEventListener('click', () => {
        onConfirm();
        confirmationOverlay.remove();
    });

    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        confirmationOverlay.remove();
    });
}

// Initial fetch to populate formulas on page load
document.addEventListener('DOMContentLoaded', fetchAndRenderFormulas);