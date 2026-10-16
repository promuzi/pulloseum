# fontTools woff2용 brotli 대신: 노드 내장 zlib brotli를 불러 씀(설치 없이)
import subprocess
MODE_GENERIC, MODE_TEXT, MODE_FONT = 0, 1, 2
_JS = r"""
const z=require('zlib');const chunks=[];process.stdin.on('data',c=>chunks.push(c));process.stdin.on('end',()=>{const b=Buffer.concat(chunks);
const op=process.argv[1];let out;
if(op==='d') out=z.brotliDecompressSync(b);
else out=z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_MODE]:+process.argv[2],[z.constants.BROTLI_PARAM_QUALITY]:+process.argv[3],[z.constants.BROTLI_PARAM_LGWIN]:+process.argv[4],[z.constants.BROTLI_PARAM_SIZE_HINT]:b.length}});
process.stdout.write(out);});
"""
def _run(args, data):
    r = subprocess.run(['node', '-e', _JS] + args, input=data, stdout=subprocess.PIPE, check=True)
    return r.stdout
def decompress(data): return _run(['d'], bytes(data))
def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0): return _run(['c', str(mode), str(quality), str(lgwin)], bytes(data))
class error(Exception): pass
