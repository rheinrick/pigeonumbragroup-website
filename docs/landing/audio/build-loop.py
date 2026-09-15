"""Run from repository root: FFMPEG=/path/to/ffmpeg python build-loop.py original.mp3.
Requires NumPy; FFmpeg does decoding/filtering/encoding. No source download is automatic.
"""
import os, subprocess, sys
import numpy as np
ff = os.environ.get('FFMPEG', 'ffmpeg')
rate = 44100
raw = subprocess.check_output([ff, '-v','error','-ss','8.571429','-i',sys.argv[1],'-t','83','-af',
    'asetrate=36162,aresample=44100,highpass=f=180,lowpass=f=2300,vibrato=f=0.22:d=0.12,aecho=0.8:0.35:91|183:0.18|0.10',
    '-ac','1','-ar',str(rate),'-f','f32le','pipe:1'])
samples=np.frombuffer(raw,dtype='<f4')
span=3*rate
assert len(samples)>=83*rate
blend=np.arange(span,dtype=np.float64)/span
# Last sample tends to the sample immediately preceding the new beginning.
seam=samples[80*rate:83*rate]*(1-blend)+samples[:span]*blend
loop=np.concatenate((samples[span:80*rate],seam))
# Gentle, band-limited, periodic pink-ish noise has no separate boundary jump.
rng=np.random.default_rng(20260914)
frequencies=np.fft.rfftfreq(len(loop),1/rate)
spectrum=np.fft.rfft(rng.normal(size=len(loop)))
weight=np.zeros_like(frequencies)
mask=(frequencies>=300)&(frequencies<=4000)
weight[mask]=1/np.sqrt(frequencies[mask])
noise=np.fft.irfft(spectrum*weight,n=len(loop))
noise*=0.001/np.std(noise)
loop=(loop+noise)*3
assert np.max(np.abs(loop))<0.95
print('duration',len(loop)/rate,'peak',np.max(np.abs(loop)),'seam jump',abs(loop[-1]-loop[0]))
subprocess.run([ff,'-v','error','-y','-f','f32le','-ar',str(rate),'-ac','1','-i','pipe:0',
    '-c:a','libmp3lame','-b:a','96k','-metadata','title=Devonshire Waltz Andante — Pigeon Umbra lobby edit',
    '-metadata','artist=Kevin MacLeod','public/landing/media/lobby-waltz-v1.mp3'],input=loop.astype('<f4').tobytes(),check=True)
