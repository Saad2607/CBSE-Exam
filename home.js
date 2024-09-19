let currentQuestionIndex = 1;
const totalQuestions = 5;
let isDictating = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

const statusElement = document.getElementById('status');

function speakMessage(message) {
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance(message);
    synth.speak(utterThis);
}

function updateQuestionDisplay() {
    document.querySelectorAll('.question-container').forEach((element, index) => {
        element.classList.remove('active');
    });
    document.getElementById(`question${currentQuestionIndex}`).classList.add('active');
    speakMessage(`You are now on question ${currentQuestionIndex}`);
}

window.onload = function() {
    recognition.start();
    statusElement.textContent = "Voice recognition status: Listening...";
    speakMessage("Voice recognition started. You can start speaking.");
};

recognition.onresult = function(event) {
    const transcript = event.results[event.resultIndex][0].transcript.toLowerCase().trim();
    const currentQuestion = document.getElementById(`question${currentQuestionIndex}`);
    const questionType = currentQuestion.getAttribute('data-type');

    if (transcript === 'next question') {
        if (currentQuestionIndex < totalQuestions) {
            currentQuestionIndex++;
            updateQuestionDisplay();
        } else {
            speakMessage("This is the last question.");
        }
    } else if (transcript === 'previous question') {
        if (currentQuestionIndex > 1) {
            currentQuestionIndex--;
            updateQuestionDisplay();
        } else {
            speakMessage("This is the first question.");
        }
    } else if (transcript === 'start dictation' && questionType === 'theory') {
        isDictating = true;
        statusElement.textContent = "Dictation started...";
        speakMessage("Dictation started. You can now speak your answer.");
    } else if (transcript === 'stop dictation') {
        isDictating = false;
        statusElement.textContent = "Dictation stopped...";
        speakMessage("Dictation stopped.");
    } else if (isDictating && questionType === 'theory') {
        const focusedTextArea = currentQuestion.querySelector('textarea');
        if (focusedTextArea) {
            focusedTextArea.value += transcript + ' ';
        }
    } else {
        const mcqOptionMap = {
            "select option a": "A",
            "select option b": "B",
            "select option c": "C",
            "select option d": "D"
        };
        if (mcqOptionMap[transcript] && questionType === 'mcq') {
            const selectedOption = mcqOptionMap[transcript];
            const mcqOption = currentQuestion.querySelector(`.mcq-options input[value="${selectedOption}"]`);
            if (mcqOption) {
                mcqOption.checked = true;
                speakMessage(`Option ${selectedOption} selected.`);
            }
        }
    }

    if (transcript === 'submit exam') {
        submitExam();
    }
};

recognition.onerror = function(event) {
    statusElement.textContent = "Voice recognition status: Error occurred.";
    speakMessage("An error occurred with voice recognition. Please try again.");
};

recognition.onend = function() {
    statusElement.textContent = "Voice recognition status: Restarting...";
    recognition.start();
    speakMessage("Voice recognition restarted.");
};

function submitExam() {
    alert("Exam Submitted!");
    recognition.stop();
    statusElement.textContent = "Voice recognition status: Stopped.";
    speakMessage("Your exam has been submitted.");
}

document.getElementById('submitButton').addEventListener('click', function() {
    submitExam();
});

navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
}).catch(function(err) {
    statusElement.textContent = "Voice recognition status: Microphone permission denied.";
    speakMessage("Microphone permission denied. Please enable microphone access.");
});