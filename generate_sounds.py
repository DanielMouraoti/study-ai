#!/usr/bin/env python3
"""
Gerador de Sons para Study AI Extension
Cria arquivos MP3 com sons sintetizados usando numpy e scipy

Instale as dependências:
pip install numpy scipy pydub
"""

import numpy as np
from scipy.io import wavfile
import os

# Configurações
SAMPLE_RATE = 44100  # 44.1kHz
DURATION_SHORT = 0.6  # segundos
DURATION_LONG = 1.5   # segundos

def create_tone(frequency, duration, volume=0.5):
    """Cria um tom sinusoidal simples"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration))
    # ADSR envelope
    attack = int(0.01 * SAMPLE_RATE)
    decay = int(0.1 * SAMPLE_RATE)
    release = int(0.2 * SAMPLE_RATE)
    
    envelope = np.ones_like(t)
    envelope[:attack] = np.linspace(0, 1, attack)
    envelope[-release:] = np.linspace(1, 0, release)
    
    wave = np.sin(2 * np.pi * frequency * t) * envelope * volume
    return (wave * 32767).astype(np.int16)

def create_sparkle():
    """Som agudo cristalino (4 beeps ascendentes)"""
    frequencies = [523, 659, 784, 1047]  # C5, E5, G5, C6
    waves = []
    for i, freq in enumerate(frequencies):
        t = np.linspace(0, 0.15, int(SAMPLE_RATE * 0.15))
        wave = np.sin(2 * np.pi * freq * t) * np.exp(-3 * t) * 0.5
        silence = np.zeros(int(SAMPLE_RATE * 0.03))
        waves.extend([wave, silence])
    
    combined = np.concatenate(waves)
    return (combined * 32767).astype(np.int16)

def create_piano():
    """Acorde de piano (Dó maior arpejado)"""
    frequencies = [262, 330, 392]  # C4, E4, G4
    waves = []
    for i, freq in enumerate(frequencies):
        t = np.linspace(0, 0.4, int(SAMPLE_RATE * 0.4))
        wave = np.sin(2 * np.pi * freq * t) * np.exp(-2 * t) * 0.6
        silence = np.zeros(int(SAMPLE_RATE * 0.05))
        waves.extend([wave, silence])
    
    combined = np.concatenate(waves)
    return (combined * 32767).astype(np.int16)

def create_chime():
    """Som de sino/carrilhão (3 toques)"""
    waves = []
    for i in range(3):
        t = np.linspace(0, 0.35, int(SAMPLE_RATE * 0.35))
        wave = np.sin(2 * np.pi * 880 * t) * np.exp(-3 * t) * 0.6
        silence = np.zeros(int(SAMPLE_RATE * 0.1))
        waves.extend([wave, silence])
    
    combined = np.concatenate(waves)
    return (combined * 32767).astype(np.int16)

def create_bell():
    """Som de sino grave sustentado"""
    t = np.linspace(0, DURATION_LONG, int(SAMPLE_RATE * DURATION_LONG))
    wave = np.sin(2 * np.pi * 392 * t) * np.exp(-1 * t) * 0.7
    return (wave * 32767).astype(np.int16)

def main():
    """Gera todos os sons e salva como WAV (depois converta para MP3)"""
    assets_dir = 'assets'
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    sounds = {
        'sparkle': create_sparkle(),
        'piano': create_piano(),
        'chime': create_chime(),
        'bell': create_bell()
    }
    
    for name, wave in sounds.items():
        filepath = os.path.join(assets_dir, f'{name}.wav')
        wavfile.write(filepath, SAMPLE_RATE, wave)
        print(f'✅ Criado: {filepath}')
    
    print('\n📝 Agora converta os WAV para MP3 usando:')
    print('   ffmpeg -i assets/sparkle.wav -codec:a libmp3lame -qscale:a 2 assets/sparkle.mp3')
    print('   (repita para piano, chime, bell)')

if __name__ == '__main__':
    main()
