import { pipeline, env } from '@huggingface/transformers';
import { TONE_CONFIG } from '../utils/config.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = 'wasm';
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  async loadModel() {
    try {
      env.allowLocalModels = false;

      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        this.currentBackend = 'webgpu';
        console.log('Transformers.js: WebGPU backend selected');
      } else {
        this.currentBackend = 'wasm';
        console.log('Transformers.js: WebAssembly backend selected');
      }

      this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
        device: this.currentBackend,
        dtype: 'q4',
        progress_callback: (info) => {
          if (info.status === 'progress') {
            const progress = Math.round(info.progress);
            const event = new CustomEvent('facts-loading-progress', { detail: progress });
            window.dispatchEvent(event);
          }
        }
      });

      this.isModelLoaded = true;
    } catch (error) {
      console.error('Error loading Transformers.js model', error);
      throw new Error(`Failed to load FunFact model: ${error.message}`);
    }
  }

  setTone(tone) {
    this.currentTone = tone;
  }

  async generateFacts(vegetableName, tone = 'normal') {
    if (!this.isModelLoaded || this.isGenerating) {
      throw new Error('Model belum siap atau sedang menghasilkan fakta');
    }

    if (!vegetableName || typeof vegetableName !== 'string') {
      throw new Error('Nama sayuran yang valid diperlukan');
    }

    let cleanVegetable = vegetableName.trim();
    cleanVegetable = cleanVegetable.replace(/<[^>]*>/g, '');
    if (cleanVegetable.length > 50) {
      cleanVegetable = cleanVegetable.substring(0, 50);
    }
    cleanVegetable = cleanVegetable.replace(/[^a-zA-Z0-9\s-]/g, '');

    this.isGenerating = true;

    try {
      let prompt = '';
      const selectedTone = tone || this.currentTone;

      switch (selectedTone) {
      case 'funny':
        prompt = `Generate a very funny, witty and humorous one-sentence fun fact about the vegetable: ${cleanVegetable}. Keep it comical and short.`;
        break;
      case 'professional':
        prompt = `Write a professional, scientific fun fact focusing on the biological or nutritional health benefit of the vegetable: ${cleanVegetable}. Keep it under 2 sentences.`;
        break;
      case 'casual':
        prompt = `Provide a friendly, casual and cool trivia about the vegetable: ${cleanVegetable}. Keep it engaging and under 2 sentences.`;
        break;
      case 'normal':
      default:
        prompt = `Write an interesting and unique fun fact about the vegetable: ${cleanVegetable}. Keep it under 2 sentences.`;
        break;
      }

      const result = await this.generator(prompt, {
        max_new_tokens: 60,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true
      });

      const generatedText = result[0]?.generated_text || 'Fakta tidak tersedia.';
      return generatedText;
    } catch (error) {
      console.error('Error generating fun fact', error);
      throw new Error(`Failed to generate fun fact: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return this.isModelLoaded && !this.isGenerating;
  }
}
