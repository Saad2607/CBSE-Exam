let model;
let studentImages = [];
let studentNames = [];
let labelMap = {};
let numberOfStudents = 0;
let webcamVideo;

// Load the pre-trained MobileNet model for feature extraction
async function loadPretrainedModel() {
    model = await mobilenet.load();
    console.log('MobileNet model loaded.');

    // Load saved students from localStorage
    loadSavedStudents();
}

// Load the image and preprocess it for MobileNet
async function loadImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .expandDims();
            resolve(tensor);
        };
    });
}

// Register students by uploading their face images
async function registerStudents() {
    const fileInput = document.getElementById('imageUpload');
    const files = fileInput.files;

    if(files.length === 0) {
        alert("Please upload at least one image.");
        return;
    }

    // Register each student with their name and face image
    for(const file of files) {
        const studentName = prompt(`Enter the student name for the image: ${file.name}`);
        if(!(studentName in labelMap)) {
            labelMap[studentName] = numberOfStudents++;
            studentNames.push(studentName);
        }
        
        // Load the image tensor 
        const tensor = await loadImage(file);
        studentImages.push({ tensor, studentName });

        // Convert the image to base64 and save to localStorage
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageBase64 = e.target.result;
            saveStudentToLocalStorage(studentName, imageBase64);
        };
        reader.readAsDataURL(file);
    }

    console.log('Students registered successfully!');

    // Automatically start the webcam after registration
    startLogin();
}

// Save a student image and name to localStorage
function saveStudentToLocalStorage(studentName, imageBase64) {
    const savedStudents = JSON.parse(localStorage.getItem('students')) || [];
    savedStudents.push({ studentName, imageBase64 });
    localStorage.setItem('students', JSON.stringify(savedStudents));
}

// Load saved students from localStorage and reconstruct the tensors
async function loadSavedStudents() {
    const savedStudents = JSON.parse(localStorage.getItem('students')) || [];
    
    for (const student of savedStudents) {
        const { studentName, imageBase64 } = student;
        const img = new Image();
        img.src = imageBase64;

        // Wait for the image to load and create a tensor
        await new Promise((resolve) => {
            img.onload = () => {
                const tensor = tf.browser.fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat()
                    .expandDims();
                studentImages.push({ tensor, studentName });
                if(!(studentName in labelMap)) {
                    labelMap[studentName] = numberOfStudents++;
                    studentNames.push(studentName);
                }
                resolve();
            };
        });
    }

    if(studentImages.length > 0) {
        console.log('Saved students loaded successfully');
        startLogin(); // Start webcam login if students are already registered
    }
}

// Start the login process by recognizing the student's face
async function startLogin() {
    if(!studentImages.length) {
        console.log("No students registered. Please register first.");
        return;
    }

    const video = document.getElementById('webcam');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        webcamVideo = video;

        // Wait for the video to be ready
        video.addEventListener('loadeddata', () => {
            console.log('Webcam video loaded, starting face recognition...');
            monitorLogin(); // Start face recognition after the video is ready
        });
    } catch(error) {
        console.error('Error accessing the webcam: ', error);
        console.log('Could not access the camera. Please check your permissions.');
    }
}

// Continuously capture frames from the webcam and attempt to recognize the student
async function monitorLogin() {
    const loginStatus = document.getElementById('login-status');
    const faceRecognized = await recognizeStudent();

    if (faceRecognized) {
        loginStatus.innerText = `Login Successful: Welcome, ${faceRecognized}!`;

        // Redirect to the home page after successful login
        setTimeout(() => {
            window.location.href = 'home.html'; // Redirect to your home page or another URL
        }, 2000); // 2-second delay before redirecting
    } else {
        loginStatus.innerText = "Recognition failed. Please try again.";
    }

    // Retry in case the face is not recognized
    setTimeout(monitorLogin, 2000); // Check every 2 seconds
}

// Capture a frame from the webcam and preprocess it for MobileNet
function captureFrame() {
    const video = webcamVideo;

    // Check if the video is ready before capturing a frame
    if(video.readyState === video.HAVE_ENOUGH_DATA) {
        const videoTensor = tf.browser.fromPixels(video)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims();
        return videoTensor;
    } else {
        console.error('Video not ready for frame capture.');
        return null;
    }
}

// Compare cosine similarity between two feature vectors
function cosineSimilarity(tensorA, tensorB) {
    const dotProduct = tensorA.mul(tensorB).sum();
    const normA = tensorA.norm();
    const normB = tensorB.norm();
    return dotProduct.div(normA.mul(normB)).dataSync()[0];
}

// Recognize the student by comparing the webcam image to the registered images 
async function recognizeStudent() {
    const webcamTensor = captureFrame();

    // Ensure the webcamTensor is valid before proceeding
    if(!webcamTensor) {
        return null;
    }

    // Compare the webcam frame with each registered student' face image
    for (let student of studentImages) {
        const studentTensor = student.tensor;

        // Use MobileNet's `infer` method to extract features
        const webcamFeatures = model.infer(webcamTensor, true); // Get embeddings from the webcam frame
        const studentFeatures = model.infer(studentTensor, true); // Get embeddings from the registered student image

        // Calculate the cosine similarity between the webcam image and student image
        const similarity = cosineSimilarity(webcamFeatures, studentFeatures);

        console.log(`Similarity with ${student.studentName}: ${similarity}`);

        // Cosine similarity threshold for face recognition 
        if(similarity > 0.8) {
            return student.studentName; // Return the recognized student
        }
    }

    return null;
}

// Initialize the model on page load
window.onload = loadPretrainedModel;