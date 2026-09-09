"""
RAVISN Voice Note ASR (Automatic Speech Recognition) Benchmark
Measures: Groq Whisper / Faster-Whisper transcription latency across audio sample buffers.
Target: <800ms ASR latency
"""

import sys
import os
import io
import math
import struct
import asyncio
import time
import statistics
from typing import List, Dict, Any

# Ensure apps/agent is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "agent")))

from src.services.audio_service import AudioService


def generate_valid_wav_bytes(duration_sec: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generates a valid 16kHz 16-bit mono PCM WAV file in memory."""
    num_samples = int(duration_sec * sample_rate)
    raw_data = bytearray()
    for i in range(num_samples):
        # 440 Hz tone
        sample = int(math.sin(2 * math.pi * 440 * (i / sample_rate)) * 16383)
        raw_data.extend(struct.pack('<h', sample))

    data_chunk_size = len(raw_data)
    header = bytearray(b'RIFF')
    header.extend(struct.pack('<I', 36 + data_chunk_size))
    header.extend(b'WAVEfmt ')
    header.extend(struct.pack('<I', 16))          # Subchunk1Size (16 for PCM)
    header.extend(struct.pack('<H', 1))           # AudioFormat (1 for PCM)
    header.extend(struct.pack('<H', 1))           # NumChannels (1 mono)
    header.extend(struct.pack('<I', sample_rate)) # SampleRate
    header.extend(struct.pack('<I', sample_rate * 2)) # ByteRate
    header.extend(struct.pack('<H', 2))           # BlockAlign
    header.extend(struct.pack('<H', 16))          # BitsPerSample
    header.extend(b'data')
    header.extend(struct.pack('<I', data_chunk_size))

    return bytes(header + raw_data)


SAMPLE_AUDIO_BUFFER = generate_valid_wav_bytes(1.2, 16000)
NUM_ITERATIONS = 5


async def run_asr_benchmark():
    print("=" * 70)
    print(">> [RAVISN BENCHMARK] RUNNING VOICE ASR TRANSCRIPTION LATENCY SUITE")
    print(f"   Audio Length: 1.2s (16kHz WAV) | Iterations: {NUM_ITERATIONS}")
    print("=" * 70)

    # Warm-up request to establish HTTP/2 connection pool
    print("  [Warm-up] Initializing connection pool...")
    await AudioService.transcribe_audio(SAMPLE_AUDIO_BUFFER, "warmup.wav")

    latencies: List[float] = []

    for i in range(NUM_ITERATIONS):
        t0 = time.perf_counter()
        text, conf, metrics = await AudioService.transcribe_audio(SAMPLE_AUDIO_BUFFER, f"bench_{i}.wav")
        duration_ms = (time.perf_counter() - t0) * 1000
        latencies.append(duration_ms)
        provider = metrics.get('asr_provider')
        print(f"  [Run {i+1}] Provider: {provider} | Latency: {duration_ms:.2f}ms | Conf: {conf}")

    avg_ms = statistics.mean(latencies)
    p50_ms = statistics.median(latencies)
    p95_ms = latencies[int(len(latencies) * 0.95)]

    print("\n--- ASR Benchmark Summary ---")
    print(f"Iterations:      {NUM_ITERATIONS}")
    print(f"Average Latency: {avg_ms:.2f} ms (Target: <800ms)")
    print(f"p50 Latency:     {p50_ms:.2f} ms")
    print(f"p95 Latency:     {p95_ms:.2f} ms")
    print("=" * 70)

    assert avg_ms < 800.0, f"Average ASR latency {avg_ms:.2f}ms exceeds target 800ms"
    print("[PASS] Voice ASR Latency Benchmark Passed!")


if __name__ == "__main__":
    asyncio.run(run_asr_benchmark())
