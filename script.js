import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

class FullBodyTracker {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.overlay = document.getElementById('overlay');
        this.loading = document.getElementById('loading');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        this.togglePoseBtn = document.getElementById('togglePose');
        
        this.ctx = this.overlay.getContext('2d');
        this.camera = null;
        this.pose = null;
        this.isPoseEnabled = true;
        this.isCameraEnabled = true;
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupPose();
            await this.setupCamera();
            this.setupControls();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            this.loading.classList.add('hidden');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to initialize camera or pose detection');
        }
    }
    
    async setupPose() {
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
            }
        });
        
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.pose.onResults((results) => this.onPoseResults(results));
    }
    
    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            this.webcam.srcObject = stream;
            
            // Process video frames for pose detection
            const processFrame = async () => {
                if (this.isPoseEnabled && this.webcam.readyState === 4) {
                    await this.pose.send({ image: this.webcam });
                }
                requestAnimationFrame(processFrame);
            };
            
            this.webcam.addEventListener('loadedmetadata', () => {
                processFrame();
            });
            
        } catch (error) {
            console.error('Camera setup failed:', error);
            throw new Error('Could not access camera');
        }
    }
    
    setupControls() {
        this.toggleCameraBtn.addEventListener('click', () => {
            this.isCameraEnabled = !this.isCameraEnabled;
            if (this.isCameraEnabled) {
                this.webcam.style.display = 'block';
                this.toggleCameraBtn.classList.add('active');
            } else {
                this.webcam.style.display = 'none';
                this.toggleCameraBtn.classList.remove('active');
            }
        });
        
        this.togglePoseBtn.addEventListener('click', () => {
            this.isPoseEnabled = !this.isPoseEnabled;
            if (this.isPoseEnabled) {
                this.togglePoseBtn.classList.add('active');
            } else {
                this.togglePoseBtn.classList.remove('active');
                this.clearCanvas();
            }
        });
    }
    
    onPoseResults(results) {
        if (!this.isPoseEnabled) return;
        
        this.clearCanvas();
        
        if (results.poseLandmarks) {
            // Draw pose connections
            drawConnectors(this.ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
                color: '#00ff88',
                lineWidth: 4
            });
            
            // Draw pose landmarks
            drawLandmarks(this.ctx, results.poseLandmarks, {
                color: '#ff0040',
                lineWidth: 2,
                radius: 6
            });
            
            // Draw additional body outline
            this.drawBodyOutline(results.poseLandmarks);
        }
    }
    
    drawBodyOutline(landmarks) {
        if (!landmarks || landmarks.length < 33) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        
        // Draw body silhouette
        const bodyPoints = [
            landmarks[11], // left shoulder
            landmarks[12], // right shoulder
            landmarks[24], // right hip
            landmarks[23], // left hip
        ];
        
        ctx.beginPath();
        bodyPoints.forEach((point, index) => {
            const x = point.x * this.overlay.width;
            const y = point.y * this.overlay.height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
    }
    
    resizeCanvas() {
        this.overlay.width = window.innerWidth;
        this.overlay.height = window.innerHeight;
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }
    
    showError(message) {
        this.loading.innerHTML = `
            <div style="color: #ff4444;">
                <p>❌ ${message}</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">
                    Please ensure camera permissions are granted and refresh the page.
                </p>
            </div>
        `;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FullBodyTracker();
});