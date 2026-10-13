"""Actual operator CLI, isolated PG and native loopback Jupiter handler. No keeper.
Large validator/ELF read-only; all ledgers, packets, keys outside checkout.
"""
import argparse,base64,datetime,hashlib,json,os,socket,struct,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.hash import Hash
from solders.message import Message
from solders.system_program import create_nonce_account,advance_nonce_account
from solders.transaction import VersionedTransaction
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=Path('/Users/flydge/Library/Application Support/AntyTILT/nonce-verification-2026-10-11/public')
TOOLS=Path('/Users/flydge/Library/Application Support/AntyTILT/nonce-guard-devnet-2026-10-11/solana-release/bin')
PG=Path('/opt/homebrew/Cellar/postgresql@17/17.11_1/bin')
NODE=Path('/Users/flydge/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
parser=argparse.ArgumentParser(description="Isolated native wallet/UI runtime; no public sends.")
parser.add_argument('--public-directory',type=Path,default=PUBLIC)
parser.add_argument('--solana-bin',type=Path,default=TOOLS)
parser.add_argument('--postgres-bin',type=Path,default=PG)
parser.add_argument('--node24',type=Path,default=NODE)
parser.add_argument('--resume',type=Path,help='Restart exact task runtime and preserve native ledger/PG/vault/state')
options=parser.parse_args()
PUBLIC,TOOLS,PG,NODE=options.public_directory,options.solana_bin,options.postgres_bin,options.node24
PROGRAM=Pubkey.from_string('PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu');TOKEN=Pubkey.from_string('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');ATA=Pubkey.from_string('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');WSOL=Pubkey.from_string('So11111111111111111111111111111111111111112')
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def write(p,data):
 with os.fdopen(os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'wb') as f:f.write(data)
def run():
 if options.resume:return resume_runtime(options.resume)
 import signal
 run_dir=Path(tempfile.mkdtemp(prefix='jupiter-wallet-ui-native-'));os.chmod(run_dir,0o700)
 rpc_port=19980
 for n in (rpc_port,rpc_port+1,18990,18992,15973,15980,15974,15981):
  with socket.socket() as s:s.bind(('127.0.0.1',n))
 endpoint=f'http://127.0.0.1:{rpc_port}'
 result=dict(artifact_directory=str(run_dir),network='isolated-native-loopback',real_sol_spent=0,keeper_present=False)
 proc=None;pg_started=False;children=[];logs=[]
 def rpc(method,params):
  if not endpoint.startswith('http://127.0.0.1:'):raise ValueError('Loopback boundary')
  req=urllib.request.Request(endpoint,data=json.dumps(dict(jsonrpc='2.0',id=1,method=method,params=params)).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=8) as r:b=r.read(300001)
  if len(b)>300000:raise ValueError('RPC response bound')
  d=json.loads(b)
  if 'error' in d:raise ValueError('Native RPC rejected')
  return d['result']
 def launch(args,name,env=None):
  log=(run_dir/(name+'.log')).open('w');logs.append(log)
  p=subprocess.Popen(args,cwd=ROOT,stdout=log,stderr=log,env=env);children.append(p);return p
 def stop(*unused):raise KeyboardInterrupt()
 signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
 try:
  elf=PUBLIC/'jupiter-mainnet-program.so'
  result['input_metadata']=[dict(path=str(p),bytes=p.stat().st_size) for p in (elf,TOOLS/'solana-test-validator',PUBLIC/'legacy-account-snapshot.json',PUBLIC/'jupiter-perpetuals-idl-json.json')]
  if digest(elf)!='a2891a9277f865eb96feaae67e03cd88efc128d43f6093cc70618ad63cb7d9ba':raise ValueError('Captured Jupiter ELF changed')
  result['jupiter_elf_sha256']=digest(elf)
  owner,nonce=Keypair(),Keypair();owner_key=owner.pubkey();fixture=json.loads((PUBLIC/'legacy-unsigned-message.json').read_text());snapshot=json.loads((PUBLIC/'legacy-account-snapshot.json').read_text());idl=json.loads((PUBLIC/'jupiter-perpetuals-idl-json.json').read_text())
  records={k:v for k,v in zip(snapshot['keys'],snapshot['value']) if v}
  keys=[Pubkey.from_string(k) for k in fixture['keys']];pool,custody=keys[3],keys[7]
  position,bump=Pubkey.find_program_address([b'position',bytes(owner_key),bytes(pool),bytes(custody),bytes(custody),bytes([1])],PROGRAM)
  recipient=Pubkey.find_program_address([bytes(owner_key),bytes(TOKEN),bytes(WSOL)],ATA)[0]
  # Derive fixture offsets from pinned IDL rather than stale fixed offsets.
  fields=next(a for a in idl['accounts'] if a['name']=='Position')['type']['fields'];offsets={};offset=8
  for f in fields:
   offsets[f['name']]=offset;t=f['type'];offset+=({'publicKey':32,'i64':8,'u64':8,'u128':16,'u8':1}[t] if isinstance(t,str) else 1)
  raw=bytearray(base64.b64decode(records[str(keys[4])]['data'][0]))
  for name,data in [('owner',bytes(owner_key)),('collateralCustody',bytes(custody)),('side',bytes([1])),('bump',bytes([bump])),('sizeUsd',struct.pack('<Q',200_000_000)),('collateralUsd',struct.pack('<Q',10_000_000))]:raw[offsets[name]:offsets[name]+len(data)]=data
  position_record=dict(records[str(keys[4])]);position_record['data']=[base64.b64encode(raw).decode(),'base64']
  tok=bytearray(base64.b64decode(records[str(keys[1])]['data'][0]));tok[:32]=bytes(WSOL);tok[32:64]=bytes(owner_key);struct.pack_into('<Q',tok,64,0)
  recipient_record=dict(records[str(keys[1])]);recipient_record['data']=[base64.b64encode(tok).decode(),'base64']
  mint=dict(records[str(keys[9])]);mint_data=bytearray(base64.b64decode(mint['data'][0]));mint_data[44]=9;mint['data']=[base64.b64encode(mint_data).decode(),'base64']
  bootstrap=run_dir/'accounts';bootstrap.mkdir(mode=0o700)
  for k,v in {str(keys[2]):records[str(keys[2])],str(pool):records[str(pool)],str(custody):records[str(custody)],str(position):position_record,str(WSOL):mint}.items():write(bootstrap/(k+'.json'),json.dumps(dict(pubkey=k,account=v)).encode())
  result.update(owner=str(owner_key),position=str(position),recipient=str(recipient),nonce=str(nonce.pubkey()),position_pre_sha256=hashlib.sha256(raw).hexdigest())
  write(run_dir/'validator-config.yml',f'---\njson_rpc_url: {endpoint}\nwebsocket_url: ""\nkeypair_path: /nonexistent\ncommitment: finalized\n'.encode())
  log=(run_dir/'validator.log').open('w')
  proc=subprocess.Popen([str(TOOLS/'solana-test-validator'),'--config',str(run_dir/'validator-config.yml'),'--ledger',str(run_dir/'ledger'),'--bind-address','127.0.0.1','--rpc-port',str(rpc_port),'--faucet-port','18990','--gossip-port','18992','--dynamic-port-range','19000-19200','--limit-blockstore-size','50000','--clone-feature-set','--url','https://api.mainnet-beta.solana.com','--mint',str(owner_key),'--upgradeable-program',str(PROGRAM),str(elf),'none','--account-dir',str(bootstrap),'--quiet'],stdout=log,stderr=log)
  for _ in range(150):
   if proc.poll() is not None:raise ValueError('Validator startup failed; preserved log')
   try:
    if rpc('getSlot',[{'commitment':'confirmed'}])>20:break
   except (OSError,ValueError):pass
   time.sleep(.3)
  else:raise ValueError('Validator readiness timeout')
  result['genesis']=rpc('getGenesisHash',[]);result['native_version']=rpc('getVersion',[])
  pg_port=port();subprocess.run([str(PG/'initdb'),'-D',str(run_dir/'pg'),'-A','trust','--no-locale','-U','wallet_ui_native'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
  subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-l',str(run_dir/'pg.log'),'-o',f'-h 127.0.0.1 -p {pg_port} -k {run_dir}','-w','start'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True);pg_started=True
  key=run_dir/'vault.key';write(key,os.urandom(32));wallet_key=run_dir/'native-wallet.json';write(wallet_key,json.dumps(list(bytes(owner))).encode())
  config=run_dir/'ui-config.json';write(config,json.dumps(dict(rpc=endpoint,genesis=result['genesis'],trustedOrigin='http://127.0.0.1:15973',mode='native-rehearsal',keyFile=str(key))).encode())
  result.update(nativeWalletKey=str(wallet_key),config=str(config),pg_port=pg_port,database_url=f'postgresql://wallet_ui_native@127.0.0.1:{pg_port}/postgres',rpc=endpoint,ui_url='http://127.0.0.1:15973/',owner=str(owner_key),position=str(position),native_process=proc.pid,supervisor_process=os.getpid())
  manifest=run_dir/'runtime.json';write(manifest,json.dumps(result,indent=2).encode())
  env=dict(os.environ,NODE_ENV='test',DATABASE_URL=result['database_url'],API_PORT='15980',JUPITER_UI_CONFIG=str(config),JUPITER_NATIVE_MANIFEST=str(manifest),ANTYTILT_API_ORIGIN='http://127.0.0.1:15980',ALLOWED_ORIGINS='http://127.0.0.1:15973',ALLOW_LIVE_TRADING='false')
  env.pop('REDIS_URL',None);env.pop('REDIS_PREFIX',None)
  api=launch([str(NODE),str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(ROOT/'scripts/jupiter-wallet-ui-native-api.ts')],'api',env)
  web=launch([str(NODE),str(ROOT/'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','15973','--strictPort'],'web',env)
  result.update(api_process=api.pid,web_process=web.pid);manifest.write_text(json.dumps(result,indent=2));os.chmod(manifest,0o600)
  print(json.dumps(dict(status='NATIVE_RUNTIME_STARTED',manifest=str(manifest),ui_url=result['ui_url'],pid=os.getpid())),flush=True)
  while True:
   time.sleep(1)
   if any(p.poll() is not None for p in children) or proc.poll() is not None:raise ValueError('Task runtime exited; inspect preserved logs')
 except KeyboardInterrupt:pass
 except Exception as e:print(json.dumps(dict(status='FAILED',failure=str(e)[:500],artifact_directory=str(run_dir))),flush=True)
 finally:
  for p in reversed(children):
   if p.poll() is None:p.terminate()
  for p in reversed(children):
   try:p.wait(timeout=12)
   except subprocess.TimeoutExpired:p.kill();p.wait()
  if pg_started:subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  if proc and proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=15)
   except subprocess.TimeoutExpired:proc.kill();proc.wait()
  for log in logs:log.close()
  print(json.dumps(dict(status='TASK_RUNTIME_STOPPED',artifact_directory=str(run_dir))),flush=True)
def resume_runtime(manifest):
 import signal
 result=json.loads(manifest.read_text());run_dir=manifest.parent;children=[];logs=[];pg_started=False
 if result['rpc']!='http://127.0.0.1:19980' or result['network']!='isolated-native-loopback':raise ValueError('Exact native runtime required')
 for n in (19980,19981,18990,18992,15973,15980):
  with socket.socket() as s:s.bind(('127.0.0.1',n))
 for path in (run_dir/'ledger',run_dir/'pg'):
  files=[p for p in path.rglob('*') if p.is_file()];print(json.dumps(dict(metadata_path=str(path),files=len(files),bytes=sum(p.stat().st_size for p in files))),flush=True)
 def launch(args,name,env=None):
  log=(run_dir/(name+'-restart.log')).open('a');logs.append(log);p=subprocess.Popen(args,cwd=ROOT,stdout=log,stderr=log,env=env);children.append(p);return p
 def stop(*unused):raise KeyboardInterrupt()
 signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
 try:
  validator=launch([str(TOOLS/'solana-test-validator'),'--config',str(run_dir/'validator-config.yml'),'--ledger',str(run_dir/'ledger'),'--bind-address','127.0.0.1','--rpc-port','19980','--faucet-port','18990','--gossip-port','18992','--dynamic-port-range','19000-19200','--limit-blockstore-size','50000','--quiet'],'validator')
  subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-l',str(run_dir/'pg.log'),'-o',f"-h 127.0.0.1 -p {result['pg_port']} -k {run_dir}",'-w','start'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True);pg_started=True
  env=dict(os.environ,NODE_ENV='test',DATABASE_URL=result['database_url'],API_PORT='15980',JUPITER_UI_CONFIG=result['config'],JUPITER_NATIVE_MANIFEST=str(manifest),ANTYTILT_API_ORIGIN='http://127.0.0.1:15980',ALLOWED_ORIGINS='http://127.0.0.1:15973',ALLOW_LIVE_TRADING='false');env.pop('REDIS_URL',None);env.pop('REDIS_PREFIX',None)
  api=launch([str(NODE),str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(ROOT/'scripts/jupiter-wallet-ui-native-api.ts')],'api',env);web=launch([str(NODE),str(ROOT/'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','15973','--strictPort'],'web',env)
  result.update(api_process=api.pid,web_process=web.pid,native_process=validator.pid,supervisor_process=os.getpid(),restart_preserved_state=True);manifest.write_text(json.dumps(result,indent=2));os.chmod(manifest,0o600)
  print(json.dumps(dict(status='NATIVE_RUNTIME_RESTARTED',manifest=str(manifest),ui_url=result['ui_url'],pid=os.getpid())),flush=True)
  while True:
   time.sleep(1)
   if any(p.poll() is not None for p in children):raise ValueError('Runtime child stopped; preserved logs')
 except KeyboardInterrupt:pass
 finally:
  for p in reversed(children):
   if p.poll() is None:p.terminate()
  for p in reversed(children):
   try:p.wait(timeout=12)
   except subprocess.TimeoutExpired:p.kill();p.wait()
  if pg_started:subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  for log in logs:log.close()
  print(json.dumps(dict(status='TASK_RUNTIME_STOPPED',artifact_directory=str(run_dir))),flush=True)
if __name__=='__main__':run()
