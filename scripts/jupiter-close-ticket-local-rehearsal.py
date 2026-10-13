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
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--public-directory',type=Path,default=PUBLIC)
parser.add_argument('--solana-bin',type=Path,default=TOOLS)
parser.add_argument('--postgres-bin',type=Path,default=PG)
parser.add_argument('--node24',type=Path,default=NODE)
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
 run_dir=Path(tempfile.mkdtemp(prefix='jupiter-ticket-native-'));os.chmod(run_dir,0o700)
 rpc_port=18980
 for n in (rpc_port,rpc_port+1,18990,18992):
  with socket.socket() as s:s.bind(('127.0.0.1',n))
 endpoint=f'http://127.0.0.1:{rpc_port}'
 result=dict(started_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),artifact_directory=str(run_dir),network='isolated-native-loopback',rpc=endpoint,real_sol_spent=0,keeper_present=False,position_fixture='synthetic SOL Long rebound from public market snapshot',commands=[])
 proc=None;pg_started=False;log=None
 def rpc(method,params):
  if not endpoint.startswith('http://127.0.0.1:') or method not in {'getVersion','getGenesisHash','getLatestBlockhash','getAccountInfo','getMinimumBalanceForRentExemption','getSlot','sendTransaction','getSignatureStatuses'}:raise ValueError('Loopback RPC boundary')
  req=urllib.request.Request(endpoint,data=json.dumps(dict(jsonrpc='2.0',id=1,method=method,params=params)).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=8) as r:b=r.read(300001)
  if len(b)>300000:raise ValueError('RPC body bound')
  d=json.loads(b)
  if 'error' in d:raise ValueError('RPC rejected '+json.dumps(d['error'])[:500])
  return d['result']
 def account(k):return rpc('getAccountInfo',[str(k),dict(encoding='base64',commitment='finalized')])['value']
 def confirm(signature):
  for _ in range(100):
   r=rpc('getSignatureStatuses',[[signature],{'searchTransactionHistory':True}])['value'][0]
   if r and r['err'] is not None:raise ValueError('Processed local transaction failure')
   if r and r['confirmationStatus']=='finalized':return r
   time.sleep(.3)
  raise ValueError('Local signature unresolved; no resend')
 def cli(command,*args,success=True):
  call=[str(NODE),str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(ROOT/'scripts/jupiter-close-ticket.ts'),command]+list(args)
  p=subprocess.run(call,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=40)
  result['commands'].append(dict(command=command,exit=p.returncode,expected_success=success))
  if (p.returncode==0)!=success:raise ValueError('Operator command outcome mismatch: '+command+' '+p.stderr.decode()[:800])
  return json.loads(p.stdout) if p.returncode==0 else None
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
  for k,v in {str(keys[2]):records[str(keys[2])],str(pool):records[str(pool)],str(custody):records[str(custody)],str(position):position_record,str(recipient):recipient_record,str(WSOL):mint}.items():write(bootstrap/(k+'.json'),json.dumps(dict(pubkey=k,account=v)).encode())
  result.update(owner=str(owner_key),position=str(position),recipient=str(recipient),nonce=str(nonce.pubkey()),position_pre_sha256=hashlib.sha256(raw).hexdigest())
  write(run_dir/'validator-config.yml',b'---\njson_rpc_url: http://127.0.0.1:18980\nwebsocket_url: ""\nkeypair_path: /nonexistent\ncommitment: finalized\n')
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
  rent=rpc('getMinimumBalanceForRentExemption',[80]);bh=rpc('getLatestBlockhash',[{'commitment':'finalized'}])['value']['blockhash']
  tx=VersionedTransaction(Message.new_with_blockhash(create_nonce_account(owner_key,nonce.pubkey(),owner_key,rent),owner_key,Hash.from_string(bh)),[owner,nonce])
  sig=rpc('sendTransaction',[base64.b64encode(bytes(tx)).decode(),dict(encoding='base64',skipPreflight=False,preflightCommitment='finalized',maxRetries=0)]);result['nonce_creation']=dict(signature=sig,**confirm(sig))
  nonce_raw=base64.b64decode(account(nonce.pubkey())['data'][0]);nonce_value=str(Pubkey.from_bytes(nonce_raw[40:72]));prog_raw=base64.b64decode(account(PROGRAM)['data'][0]);programdata=Pubkey.from_bytes(prog_raw[4:36]);pd=base64.b64decode(rpc('getAccountInfo',[str(programdata),dict(encoding='base64',commitment='finalized',dataSlice=dict(offset=0,length=13))])['value']['data'][0]);deployment=str(struct.unpack_from('<Q',pd,4)[0])
  pg_port=port();subprocess.run([str(PG/'initdb'),'-D',str(run_dir/'pg'),'-A','trust','--no-locale','-U','ticket_native'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
  subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-l',str(run_dir/'pg.log'),'-o',f'-h 127.0.0.1 -p {pg_port} -k {run_dir}','-w','start'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True);pg_started=True
  key=run_dir/'vault.key';cli('init-key','--key-file',str(key));config=run_dir/'config.json';write(config,json.dumps(dict(database=dict(host='127.0.0.1',port=pg_port,user='ticket_native',database='postgres'),rpc=endpoint,keyFile=str(key))).encode())
  binding=dict(genesis=result['genesis'],owner=str(owner_key),position=str(position),pool=str(pool),custody=str(custody),collateralCustody=str(custody),side='Long',mint=str(WSOL),recipient=str(recipient),nonce=str(nonce.pubkey()),nonceAuthority=str(owner_key),nonceValue=nonce_value,counter='90201',absolutePriceBound='150000000',maxFeeLamports='5000',maxRentLamports='8000000',triggerEvent='synthetic-native-demo-5',programDeployment=deployment)
  binding_file=run_dir/'binding.json';write(binding_file,json.dumps(binding).encode());unsigned=run_dir/'unsigned.bin';prepared=cli('prepare','--config',str(config),'--binding',str(binding_file),'--unsigned',str(unsigned));result['prepared']=prepared
  unsigned_tx=VersionedTransaction.from_bytes(unsigned.read_bytes());signed=VersionedTransaction(unsigned_tx.message,[owner]);packet=run_dir/'signed.bin';write(packet,bytes(signed));result['signed_packet_sha256']=hashlib.sha256(bytes(signed)).hexdigest()
  args=['--config',str(config),'--id',prepared['id']]
  bad=run_dir/'wrong-signature.bin';wrong=bytearray(bytes(signed));wrong[1]^=1;write(bad,wrong);cli('arm',*args,'--packet',str(bad),success=False)
  cli('arm',*args,'--packet',str(packet));restarted=cli('status',*args);result['restart_armed']=restarted['status']=='ARMED'
  cli('trigger',*args,'--event','wrong','--local-test',success=False);cli('trigger',*args,'--event',binding['triggerEvent'],success=False);result['default_disabled_kept_armed']=cli('status',*args)['status']=='ARMED'
  # Documented unused recovery: local disable, real owner nonce advance, observed revoke.
  result['recovery_disabled']=cli('disable',*args)['status']=='DISABLED'
  cli('confirm-revoke',*args,success=False)
  bh=rpc('getLatestBlockhash',[{'commitment':'finalized'}])['value']['blockhash']
  advance=advance_nonce_account(dict(nonce_pubkey=nonce.pubkey(),authorized_pubkey=owner_key))
  revoke_tx=VersionedTransaction(Message.new_with_blockhash([advance],owner_key,Hash.from_string(bh)),[owner])
  revoke_sig=rpc('sendTransaction',[base64.b64encode(bytes(revoke_tx)).decode(),dict(encoding='base64',skipPreflight=False,preflightCommitment='finalized',maxRetries=0)])
  result['owner_nonce_revoke']=dict(signature=revoke_sig,**confirm(revoke_sig))
  revoked=cli('confirm-revoke',*args);result['recovery_revoked']=revoked['status']=='REVOKED' and revoked['intentAt'] is None
  cli('trigger',*args,'--event',binding['triggerEvent'],'--local-test',success=False)
  # New request means a new nonce/counter and a fresh outside-bot owner signature.
  nonce=Keypair();bh=rpc('getLatestBlockhash',[{'commitment':'finalized'}])['value']['blockhash']
  setup=VersionedTransaction(Message.new_with_blockhash(create_nonce_account(owner_key,nonce.pubkey(),owner_key,rent),owner_key,Hash.from_string(bh)),[owner,nonce])
  setup_sig=rpc('sendTransaction',[base64.b64encode(bytes(setup)).decode(),dict(encoding='base64',skipPreflight=False,preflightCommitment='finalized',maxRetries=0)]);result['fresh_nonce_creation']=dict(signature=setup_sig,**confirm(setup_sig))
  nonce_raw=base64.b64decode(account(nonce.pubkey())['data'][0]);binding.update(nonce=str(nonce.pubkey()),nonceValue=str(Pubkey.from_bytes(nonce_raw[40:72])),counter='90202');result['nonce']=str(nonce.pubkey())
  binding_file=run_dir/'fresh-binding.json';write(binding_file,json.dumps(binding).encode());unsigned=run_dir/'fresh-unsigned.bin'
  prepared=cli('prepare','--config',str(config),'--binding',str(binding_file),'--unsigned',str(unsigned));result['prepared']=prepared
  unsigned_tx=VersionedTransaction.from_bytes(unsigned.read_bytes());signed=VersionedTransaction(unsigned_tx.message,[owner]);packet=run_dir/'fresh-signed.bin';write(packet,bytes(signed));result['signed_packet_sha256']=hashlib.sha256(bytes(signed)).hexdigest()
  args=['--config',str(config),'--id',prepared['id']];cli('arm',*args,'--packet',str(packet))
  balance_before=account(owner_key)['lamports'];submitted=cli('trigger',*args,'--event',binding['triggerEvent'],'--local-test');result['submitted']=submitted;result['submission_finalized']=confirm(submitted['signature']);balance_after=account(owner_key)['lamports']
  result['actual_owner_cost_lamports']=balance_before-balance_after;result['cost_within_immutable_budget']=result['actual_owner_cost_lamports']<=8_005_000
  reconciled=cli('reconcile',*args);result['reconciliation']=reconciled;cli('trigger',*args,'--event',binding['triggerEvent'],'--local-test',success=False)
  after=base64.b64decode(account(position)['data'][0]);request=account(prepared['request']);result['position_post_sha256']=hashlib.sha256(after).hexdigest();result['position_unchanged']=after==bytes(raw);result['request_created']=request is not None;result['request_sha256']=hashlib.sha256(base64.b64decode(request['data'][0])).hexdigest() if request else None;result['nonce_consumed']=base64.b64decode(account(nonce.pubkey())['data'][0])[40:72]!=nonce_raw[40:72]
  result['signed_packet_unchanged']=hashlib.sha256(packet.read_bytes()).hexdigest()==result['signed_packet_sha256']
  if not all(result[k] for k in ['recovery_disabled','recovery_revoked','restart_armed','default_disabled_kept_armed','position_unchanged','request_created','nonce_consumed','signed_packet_unchanged','cost_within_immutable_budget']) or reconciled['status']!='REQUEST_PENDING':raise ValueError('Native operator outcome gate failed')
  result['status']='NATIVE_OPERATOR_REQUEST_PENDING_PASSED'
 except Exception as e:result['status']='FAILED';result['failure']=str(e)[:1600]
 finally:
  if pg_started:subprocess.run([str(PG/'pg_ctl'),'-D',str(run_dir/'pg'),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  if proc and proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=15)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
  if log:log.close()
  result['validator_stopped']=proc is None or proc.poll() is not None;write(run_dir/'receipt.json',(json.dumps(result,indent=2)+'\n').encode());print(json.dumps(dict(status=result['status'],artifact_directory=str(run_dir),failure=result.get('failure'),validator_stopped=result['validator_stopped'])))
 return result['status']=='FAILED'
if __name__=='__main__':sys.exit(run())
