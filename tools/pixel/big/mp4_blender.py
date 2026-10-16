# 블렌더 배경 실행용: PNG 장 목록(job.json) → MP4(H.264, yuv420p) [+ 소리 띠(WAV → AAC)]. video.mjs가 부른다.
# 시퀀서에 그림 띠 하나(+ 소리 띠 하나)를 깔고 그대로 굽는다 — 색 변환은 Standard(그림 색 그대로), 크기 조정 없음(장 크기 = 영상 크기).
import json
import os
import sys

import bpy

job = json.load(open(sys.argv[sys.argv.index('--') + 1], encoding='utf-8'))
sc = bpy.context.scene
se = sc.sequence_editor_create()
strips = se.strips if hasattr(se, 'strips') else se.sequences
seq = job['seq']
st = strips.new_image(name='frames', filepath=os.path.join(job['dir'], seq[0]), channel=1, frame_start=1)
for n in seq[1:]:
    st.elements.append(n)

sc.frame_start, sc.frame_end = 1, len(seq)
r = sc.render
r.fps, r.fps_base = job['fps'], 1.0
r.resolution_x, r.resolution_y, r.resolution_percentage = job['w'], job['h'], 100
r.pixel_aspect_x = r.pixel_aspect_y = 1
r.use_sequencer = True
r.use_compositing = False

im = r.image_settings
if hasattr(im, 'media_type'):
    im.media_type = 'VIDEO'
im.file_format = 'FFMPEG'
im.color_mode = 'RGB'
ff = r.ffmpeg
ff.format = 'MPEG4'
ff.codec = 'H264'
ff.constant_rate_factor = job.get('crf') or 'PERC_LOSSLESS'   # 무손실(LOSSLESS)은 4:4:4라 휴대폰이 못 튼다
ff.ffmpeg_preset = 'BEST'
ff.audio_codec = 'NONE'
if job.get('audio'):   # 소리 띠: 1장에서 시작 · AAC 스테레오 44.1kHz
    snd = strips.new_sound(name='audio', filepath=job['audio'], channel=2, frame_start=1)
    ff.audio_codec = 'AAC'
    ff.audio_bitrate = 192
    ff.audio_channels = 'STEREO'
    ff.audio_mixrate = 44100
    print('sound strip', snd.frame_final_duration, 'frames')

vs = sc.view_settings
vs.view_transform = 'Standard'
vs.look = 'None'
vs.exposure = 0
vs.gamma = 1
try:
    sc.sequencer_colorspace_settings.name = 'sRGB'
except Exception as e:
    print('sequencer colorspace:', e)

r.use_file_extension = True
r.filepath = job['out']
bpy.ops.render.render(animation=True)
