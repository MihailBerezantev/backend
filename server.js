import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Configuration CORS pour Vercel
app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (comme les apps mobiles)
    if (!origin) return callback(null, true);
    
    // Liste des origines autorisées
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5177', // Nouveau port de développement
      'https://musigenerator.vercel.app',
      'https://musigenerator-git-main-berezantevmihail-4730s-projects.vercel.app',
      'https://test2-neon-psi.vercel.app',
      'https://test2-ad1w.vercel.app'
    ];
    
    // Permettre toutes les URLs Vercel
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Rejeter l'origine
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Mon Générateur Backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Debug route pour vérifier les variables d'environnement
app.get('/debug', (req, res) => {
  res.json({
    hasReplicateKey: !!process.env.REPLICATE_API_KEY,
    keyLength: process.env.REPLICATE_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    timestamp: new Date().toISOString()
  });
});

// Route to expose API parameters
app.get('/api/parameters', (req, res) => {
  res.json({
    availableModels: ['musicgen', 'riffusion', 'other-model'],
    defaultModel: 'musicgen',
    parameters: {
      version: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      top_k: 250,
      top_p: 0,
      duration: 8,
      temperature: 1,
      continuation: false,
      model_version: "stereo-large",
      output_format: "mp3",
      continuation_start: 0,
      multi_band_diffusion: false,
      normalization_strategy: "peak",
      classifier_free_guidance: 3
    }
  });
});

app.post('/api/generate-audio', async (req, res) => {
  try {
    console.log('Full request body:', req.body); // Debug pour voir tout ce qui est reçu
    console.log('REPLICATE_API_KEY exists:', !!process.env.REPLICATE_API_KEY); // Debug pour vérifier la clé
    console.log('REPLICATE_API_KEY length:', process.env.REPLICATE_API_KEY?.length); // Debug pour la longueur
    
    const { 
      prompt, 
      model = 'musicgen',
      // Paramètres MusicGen - extraire directement du req.body
      top_k = 250,
      top_p = 0,
      duration = 8,
      temperature = 1,
      continuation = false,
      model_version = 'stereo-large',
      output_format = 'mp3',
      continuation_start = 0,
      multi_band_diffusion = false,
      normalization_strategy = 'peak',
      classifier_free_guidance = 3
    } = req.body;

    // Créer l'objet input avec tous les paramètres
    const inputParams = {
      prompt,
      top_k: Number(top_k),
      top_p: Number(top_p),
      duration: Number(duration),
      temperature: Number(temperature),
      continuation: Boolean(continuation),
      model_version: String(model_version),
      output_format: String(output_format),
      continuation_start: Number(continuation_start),
      multi_band_diffusion: Boolean(multi_band_diffusion),
      normalization_strategy: String(normalization_strategy),
      classifier_free_guidance: Number(classifier_free_guidance)
    };

    console.log('Sending to Replicate:', inputParams);

    if (!['musicgen', 'riffusion', 'other-model'].includes(model)) {
      return res.status(400).json({ error: 'Invalid model selected' });
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        version: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
        input: inputParams
      }),
    });

    const result = await response.json();
    console.log('Replicate response:', result);
    res.json(result);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route spécifique pour Riffusion
app.post('/api/riffusion-generate', async (req, res) => {
  try {
    console.log('Riffusion request body:', req.body);
    console.log('REPLICATE_API_KEY exists:', !!process.env.REPLICATE_API_KEY); // Debug pour vérifier la clé
    console.log('REPLICATE_API_KEY length:', process.env.REPLICATE_API_KEY?.length); // Debug pour la longueur
    
    const { 
      prompt, 
      prompt_b = '',
      denoising = 0.75,
      alpha = 0.5,
      num_inference_steps = 50,
      seed_image_id = 'vibes'
    } = req.body;

    // Construire l'objet input pour Riffusion
    const inputParams = {
      prompt_a: prompt, // Utiliser directement le prompt principal
      denoising: Number(denoising),
      num_inference_steps: Number(num_inference_steps),
      seed_image_id: String(seed_image_id)
    };

    // Ajouter prompt_b et alpha seulement si prompt_b n'est pas vide
    if (prompt_b && prompt_b.trim()) {
      inputParams.prompt_b = prompt_b;
      inputParams.alpha = Number(alpha);
    }

    console.log('Sending to Riffusion with params:', inputParams);

    // Première requête pour démarrer la prédiction
    const initialResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
        input: inputParams
      }),
    });

    const prediction = await initialResponse.json();
    console.log('Initial Riffusion response:', prediction);

    if (!prediction.id) {
      throw new Error('Failed to create prediction');
    }

    // Polling pour attendre le résultat
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts >= maxAttempts) {
        throw new Error('Timeout waiting for Riffusion result');
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5 secondes
      
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        },
      });

      result = await statusResponse.json();
      console.log(`Riffusion status check ${attempts + 1}:`, result.status);
      attempts++;
    }

    if (result.status === 'failed') {
      throw new Error(`Riffusion generation failed: ${result.error}`);
    }

    if (result.status === 'succeeded' && result.output) {
      console.log('Riffusion generation completed:', result.output);
      
      // Riffusion renvoie { audio: "url" } alors que MusicGen renvoie directement l'URL ou un array
      if (result.output.audio) {
        result.output = result.output.audio; // Normaliser pour être cohérent avec MusicGen
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Riffusion server error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
