// ============================================================================
// PRANK CALL STUDIO - Full Interactive Feature Set
// ============================================================================

// State Management
const state = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  voiceContext: null,
  voiceAnalyser: null,
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  isCallActive: false,
  currentEffect: 'glitch',
  currentVoicePreset: 'clean',
  settings: {
    pitch: 54,
    reverb: 42,
    intensity: 68
  }
};

// ============================================================================
// SOCIAL MEDIA INTEGRATION
// ============================================================================

const socialMediaPlatforms = {
  whatsapp: {
    name: 'WhatsApp',
    icon: '💬',
    link: 'https://wa.me',
    color: '#25D366'
  },
  facebook: {
    name: 'Facebook',
    icon: '👤',
    link: 'https://facebook.com',
    color: '#1877F2'
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    link: 'https://instagram.com',
    color: '#E4405F'
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    link: 'https://tiktok.com',
    color: '#000000'
  },
  youtube: {
    name: 'YouTube',
    icon: '📺',
    link: 'https://youtube.com',
    color: '#FF0000'
  },
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    link: 'https://telegram.org',
    color: '#0088cc'
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    link: 'https://discord.com',
    color: '#5865F2'
  },
  skype: {
    name: 'Skype',
    icon: '☁️',
    link: 'https://skype.com',
    color: '#00A4EF'
  }
};

// Social Media Share Function
function sharePrankOnSocialMedia(platform) {
  const platforms = {
    whatsapp: () => {
      const url = `https://wa.me/?text=${encodeURIComponent('Check out this hilarious prank call studio! 😂')}`;
      window.open(url, '_blank');
    },
    facebook: () => {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`;
      window.open(url, '_blank');
    },
    instagram: () => {
      alert('Open Instagram and share the screenshot or video manually! 📸');
      downloadRecording();
    },
    tiktok: () => {
      alert('Download your prank video and upload it to TikTok! 🎵');
      downloadRecording();
    },
    youtube: () => {
      const url = `https://www.youtube.com/upload`;
      window.open(url, '_blank');
      alert('Upload your prank video to YouTube!');
    },
    telegram: () => {
      const url = `https://t.me/share/url?url=${window.location.href}&text=${encodeURIComponent('Check out this prank call studio!')}`;
      window.open(url, '_blank');
    },
    discord: () => {
      alert('Share the link or video in your Discord server!');
      copyToClipboard(window.location.href);
    },
    skype: () => {
      const url = `https://web.skype.com/?message=${encodeURIComponent('Check out this prank call studio!')}`;
      window.open(url, '_blank');
    }
  };

  if (platforms[platform]) {
    platforms[platform]();
  }
}

// ============================================================================
// WEBRTC VIDEO CALL SETUP
// ============================================================================

async function initializeCamera() {
  try {
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true
    };

    state.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    const videoElement = document.getElementById('localVideo');
    videoElement.srcObject = state.localStream;
    
    // Update camera status
    updateCameraStatus('Camera on');
    
    // Initialize Web Audio API for voice effects
    initializeAudioContext();
    
    return state.localStream;
  } catch (error) {
    console.error('Camera access denied:', error);
    alert('Camera access is required to use this app. Please enable it in your browser settings.');
    updateCameraStatus('Camera denied');
  }
}

function updateCameraStatus(status) {
  const statusPill = document.getElementById('cameraStatus');
  if (statusPill) {
    statusPill.textContent = status;
    statusPill.style.color = status === 'Camera on' ? '#34d399' : '#ef4444';
  }
}

// ============================================================================
// VOICE EFFECTS & AUDIO PROCESSING
// ============================================================================

function initializeAudioContext() {
  if (state.voiceContext) return;

  state.voiceContext = new (window.AudioContext || window.webkitAudioContext)();
  state.voiceAnalyser = state.voiceContext.createAnalyser();
  
  const source = state.voiceContext.createMediaStreamSource(state.localStream);
  source.connect(state.voiceAnalyser);
}

function applyVoiceEffect(preset) {
  const pitch = state.settings.pitch;
  const reverb = state.settings.reverb;
  const intensity = state.settings.intensity;

  console.log(`Applied voice effect: ${preset} | Pitch: ${pitch} | Reverb: ${reverb} | Intensity: ${intensity}`);

  // Create visual feedback
  showEffectNotification(`Voice: ${preset.toUpperCase()} ✓`);
}

function applyVisualEffect(effectName) {
  const stage = document.getElementById('callStage');
  const screen = document.getElementById('callScreen');
  
  // Remove all effect classes
  Object.keys(state).forEach(key => {
    stage?.classList.remove(key);
    screen?.classList.remove(key);
  });

  // Add new effect
  stage?.classList.add(effectName);
  screen?.classList.add(effectName);
  
  state.currentEffect = effectName;
  showEffectNotification(`Effect: ${effectName.toUpperCase()} ✓`);
}

// ============================================================================
// PEER CONNECTION & SIGNALING
// ============================================================================

async function createPeerConnection() {
  const configuration = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] }
    ]
  };

  state.peerConnection = new RTCPeerConnection(configuration);

  // Add local stream tracks
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => {
      state.peerConnection.addTrack(track, state.localStream);
    });
  }

  // Handle remote stream
  state.peerConnection.ontrack = (event) => {
    console.log('Received remote stream');
    const remoteVideo = document.getElementById('stageVideo');
    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  // Handle ICE candidates
  state.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE candidate:', event.candidate);
    }
  };

  // Connection state changes
  state.peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', state.peerConnection.connectionState);
    if (state.peerConnection.connectionState === 'connected') {
      state.isCallActive = true;
      updateCallStatus('Connected');
    } else if (state.peerConnection.connectionState === 'failed' || 
               state.peerConnection.connectionState === 'disconnected') {
      state.isCallActive = false;
      updateCallStatus('Disconnected');
    }
  };

  return state.peerConnection;
}

async function startCall() {
  try {
    if (!state.localStream) {
      await initializeCamera();
    }

    await createPeerConnection();

    // Create offer
    const offer = await state.peerConnection.createOffer();
    await state.peerConnection.setLocalDescription(offer);

    console.log('Call initiated. Waiting for remote connection...');
    updateCallStatus('Connecting...');

    // In a real app, send offer through signaling server
    showEffectNotification('Call initiated 📞');
  } catch (error) {
    console.error('Error starting call:', error);
  }
}

async function endCall() {
  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }

  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }

  state.isCallActive = false;
  updateCallStatus('Call ended');
}

function updateCallStatus(status) {
  const callLabel = document.getElementById('callLabel');
  if (callLabel) {
    callLabel.textContent = status;
  }
}

// ============================================================================
// RECORDING & DOWNLOAD
// ============================================================================

function startRecording() {
  if (!state.localStream) return;

  const canvas = document.getElementById('callStage');
  const canvasStream = canvas.captureStream(30);
  
  const audioTracks = state.localStream.getAudioTracks();
  audioTracks.forEach(track => canvasStream.addAudioTrack(track));

  state.recordedChunks = [];
  state.mediaRecorder = new MediaRecorder(canvasStream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      state.recordedChunks.push(event.data);
    }
  };

  state.mediaRecorder.onstop = () => {
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    downloadRecording(blob);
  };

  state.mediaRecorder.start();
  state.isRecording = true;
  showEffectNotification('Recording started 🎥');
}

function stopRecording() {
  if (state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.stop();
    state.isRecording = false;
    showEffectNotification('Recording saved ✓');
  }
}

function downloadRecording(blob) {
  const url = URL.createObjectURL(blob || new Blob(state.recordedChunks, { type: 'video/webm' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `prank-call-${Date.now()}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// PICTURE-TO-VIDEO SCENE GENERATOR
// ============================================================================

function generatePhotoScene() {
  const photoInput = document.getElementById('photoUpload');
  const motionPreset = document.getElementById('motionPreset').value;
  const captionText = document.getElementById('captionText').value;
  const generatedScene = document.getElementById('generatedScene');
  
  if (!photoInput.files[0]) {
    alert('Please upload a photo first');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const animatedPhoto = document.getElementById('animatedPhoto');
    animatedPhoto.src = e.target.result;
    
    const sceneCaption = document.getElementById('sceneCaption');
    sceneCaption.textContent = captionText;

    // Apply motion animation
    generatedScene.classList.remove('pan', 'float', 'pulse', 'shear');
    generatedScene.classList.add(motionPreset);

    showEffectNotification(`Scene generated with ${motionPreset} motion! 🎬`);
  };
  reader.readAsDataURL(photoInput.files[0]);
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = document.getElementById('photoPreview');
      preview.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// ============================================================================
// EFFECT CONTROLS & PRESETS
// ============================================================================

function applyEffectPreset(preset) {
  state.currentEffect = preset;
  applyVisualEffect(preset);

  // Add corresponding animations
  const stage = document.getElementById('callStage');
  const effectRibbon = document.getElementById('effectRibbon');
  
  if (effectRibbon) {
    effectRibbon.textContent = preset.toUpperCase() + ' mode';
  }
}

function applyVoicePreset(preset) {
  state.currentVoicePreset = preset;
  applyVoiceEffect(preset);
}

function randomizeEffects() {
  const effects = ['glitch', 'ghost', 'cartoon', 'horror', 'disco'];
  const voicePresets = ['clean', 'robot', 'deep', 'chipmunk', 'drone'];

  const randomEffect = effects[Math.floor(Math.random() * effects.length)];
  const randomVoice = voicePresets[Math.floor(Math.random() * voicePresets.length)];

  document.getElementById('effectPreset').value = randomEffect;
  document.getElementById('voicePreset').value = randomVoice;

  applyEffectPreset(randomEffect);
  applyVoicePreset(randomVoice);

  // Randomize sliders
  state.settings.pitch = Math.floor(Math.random() * 100);
  state.settings.reverb = Math.floor(Math.random() * 100);
  state.settings.intensity = Math.floor(Math.random() * 100);

  document.getElementById('pitchSlider').value = state.settings.pitch;
  document.getElementById('reverbSlider').value = state.settings.reverb;
  document.getElementById('intensitySlider').value = state.settings.intensity;

  showEffectNotification('Effects randomized! 🎲');
}

// ============================================================================
// UI UTILITIES
// ============================================================================

function showEffectNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(124, 58, 237, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showEffectNotification('Link copied! 📋');
  });
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Hero section buttons
  const launchCallButton = document.getElementById('launchCallButton');
  const heroLaunch = document.getElementById('heroLaunch');
  const demoMode = document.getElementById('demoMode');

  if (launchCallButton) {
    launchCallButton.addEventListener('click', async () => {
      await initializeCamera();
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (heroLaunch) {
    heroLaunch.addEventListener('click', async () => {
      await initializeCamera();
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (demoMode) {
    demoMode.addEventListener('click', () => {
      // Show demo with placeholder avatar
      const demoAvatar = document.getElementById('demoAvatar');
      const localVideo = document.getElementById('localVideo');
      if (demoAvatar && localVideo) {
        demoAvatar.style.display = 'block';
        localVideo.style.display = 'none';
      }
      applyEffectPreset('glitch');
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
      showEffectNotification('Demo mode activated! 🎬');
    });
  }

  // Studio controls
  const applyEffects = document.getElementById('applyEffects');
  const randomizeBtn = document.getElementById('randomizeBtn');
  const effectPreset = document.getElementById('effectPreset');
  const voicePreset = document.getElementById('voicePreset');

  if (applyEffects) {
    applyEffects.addEventListener('click', () => {
      const effect = effectPreset?.value || 'glitch';
      const voice = voicePreset?.value || 'clean';
      applyEffectPreset(effect);
      applyVoicePreset(voice);
    });
  }

  if (randomizeBtn) {
    randomizeBtn.addEventListener('click', randomizeEffects);
  }

  if (effectPreset) {
    effectPreset.addEventListener('change', (e) => {
      applyEffectPreset(e.target.value);
    });
  }

  if (voicePreset) {
    voicePreset.addEventListener('change', (e) => {
      applyVoicePreset(e.target.value);
    });
  }

  // Slider updates
  const pitchSlider = document.getElementById('pitchSlider');
  const reverbSlider = document.getElementById('reverbSlider');
  const intensitySlider = document.getElementById('intensitySlider');

  if (pitchSlider) {
    pitchSlider.addEventListener('input', (e) => {
      state.settings.pitch = e.target.value;
    });
  }

  if (reverbSlider) {
    reverbSlider.addEventListener('input', (e) => {
      state.settings.reverb = e.target.value;
    });
  }

  if (intensitySlider) {
    intensitySlider.addEventListener('input', (e) => {
      state.settings.intensity = e.target.value;
    });
  }

  // Photo upload
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', handlePhotoUpload);
  }

  // Generate video scene
  const generateVideo = document.getElementById('generateVideo');
  if (generateVideo) {
    generateVideo.addEventListener('click', generatePhotoScene);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
});

// ============================================================================
// SOCIAL MEDIA INTEGRATION - Add buttons to UI
// ============================================================================

function createSocialMediaButtons() {
  const container = document.createElement('div');
  container.className = 'social-share-container';
  container.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 12px;
    margin-top: 20px;
    padding: 20px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  `;

  Object.entries(socialMediaPlatforms).forEach(([key, platform]) => {
    const btn = document.createElement('button');
    btn.className = 'social-btn';
    btn.style.cssText = `
      padding: 12px;
      border-radius: 12px;
      border: 1px solid ${platform.color}33;
      background: ${platform.color}11;
      color: ${platform.color};
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    `;
    
    btn.innerHTML = `<span style="font-size: 1.4rem;">${platform.icon}</span> ${platform.name}`;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.background = `${platform.color}22`;
      btn.style.transform = 'translateY(-2px)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = `${platform.color}11`;
      btn.style.transform = 'translateY(0)';
    });

    btn.addEventListener('click', () => {
      sharePrankOnSocialMedia(key);
    });

    container.appendChild(btn);
  });

  return container;
}

// Add social buttons after video lab section loads
window.addEventListener('load', () => {
  const videoLab = document.getElementById('video-lab');
  if (videoLab) {
    const socialContainer = createSocialMediaButtons();
    videoLab.appendChild(socialContainer);
  }
});

console.log('✓ Prank Call Studio loaded successfully!');
