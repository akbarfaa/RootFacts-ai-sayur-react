import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
  }

  async loadModel() {
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          await tf.setBackend('webgpu');
          console.log('TFJS: WebGPU backend selected');
        } catch (e) {
          await tf.setBackend('webgl');
          console.log('TFJS: WebGL backend selected (WebGPU failed)');
        }
      } else {
        await tf.setBackend('webgl');
        console.log('TFJS: WebGL backend selected');
      }
      await tf.ready();

      const metadataResponse = await fetch('/model/metadata.json');
      const metadata = await metadataResponse.json();

      if (metadata && metadata.labels && Array.isArray(metadata.labels)) {
        this.labels = metadata.labels;
      } else {
        throw new Error('Invalid metadata format');
      }

      this.model = await tf.loadLayersModel('/model/model.json', {
        onProgress: (fraction) => {
          const progress = Math.round(fraction * 100);
          const event = new CustomEvent('model-loading-progress', { detail: progress });
          window.dispatchEvent(event);
        }
      });
    } catch (error) {
      console.error('Failed to load model', error);
      throw new Error(`Failed to load model: ${error.message}`);
    }
  }

  async predict(imageElement) {
    if (!this.model) {
      throw new Error('Model belum dimuat.');
    }

    const predictionTensor = tf.tidy(() => {
      const img = tf.browser.fromPixels(imageElement);
      const resized = tf.image.resizeBilinear(img, [224, 224]);
      const normalized = resized.div(tf.scalar(127.5)).sub(tf.scalar(1.0));
      const batched = normalized.expandDims(0);
      return this.model.predict(batched);
    });

    try {
      const data = await predictionTensor.data();
      let maxIndex = 0;
      let maxVal = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i] > maxVal) {
          maxVal = data[i];
          maxIndex = i;
        }
      }

      const score = maxVal;
      const className = this.labels[maxIndex] || 'Sayuran';

      return {
        className,
        score,
        isValid: true
      };
    } catch (error) {
      console.error('Prediction error', error);
      throw new Error(`Prediksi gagal: ${error.message}`);
    } finally {
      predictionTensor.dispose();
    }
  }

  isLoaded() {
    return !!this.model;
  }
}
