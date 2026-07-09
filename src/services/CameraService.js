export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  async loadCameras() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        s.getTracks().forEach((t) => t.stop());
      }).catch(() => {});

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Gagal memuat kamera', error);
      throw new Error(`Akses kamera gagal: ${error.message}`);
    }
  }

  async startCamera(selectedCameraId = 'default') {
    try {
      this.stopCamera();

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      if (selectedCameraId === 'front') {
        constraints.video.facingMode = 'user';
      } else if (selectedCameraId === 'default' || !selectedCameraId) {
        constraints.video.facingMode = 'environment';
      } else {
        constraints.video.deviceId = { exact: selectedCameraId };
      }

      if (!this.video) {
        this.video = document.getElementById('media-video');
      }

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (fallbackError) {
        console.warn('Gagal dengan constraint tertentu, mencoba fallback ke kamera default:', fallbackError);
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (this.video) {
        this.video.srcObject = this.stream;
        await this.video.play();
      }
    } catch (error) {
      console.error('Gagal memulai kamera', error);
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  setFPS(fps) {
    this.fps = Number(fps) || 30;
  }

  isActive() {
    return !!this.stream && this.stream.getVideoTracks().some((track) => track.readyState === 'live');
  }

  isReady() {
    return !!this.video && this.video.readyState >= 2;
  }
}