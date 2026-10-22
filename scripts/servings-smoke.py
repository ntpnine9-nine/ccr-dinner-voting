"""Live serving API check. Uses disposable public identities; cleanup hashes are written to /tmp.
No administrator credentials are needed. The operator must delete only those test identities afterwards.
"""
import copy
import hashlib
import json
import re
import secrets
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
root=Path(__file__).resolve().parents[1]
config=(root/'config.js').read_text()
url=re.search(r"supabaseUrl:\s*'([^']+)'",config)[1]+'/functions/v1/vote'
key=re.search(r"publishableKey:\s*'([^']+)'",config)[1]
tokens=[secrets.token_hex(32) for _ in range(3)]
state={'hashes':[hashlib.sha256(('ccr-2026:open:'+t).encode()).hexdigest() for t in tokens],'receipts':[]}
checkpoint=Path('/tmp/ccr-serving-test-state.json')
def record():checkpoint.write_text(json.dumps(state))
record()
def api(op,**data):
 req=Request(url,json.dumps(dict(op=op,campaign='ccr-2026',**data)).encode(),{'Content-Type':'application/json','apikey':key})
 try:
  with urlopen(req,timeout=30) as res:return res.status,json.load(res)
 except HTTPError as e:return e.code,json.load(e)
def ok(op,**data):
 status,result=api(op,**data)
 assert status==200 and result.get('ok'),(op,status,result)
 return result
catalog=ok('catalog');assert catalog['catalogVersion']==2
for c in catalog['categories']:
 assert c['servingQuota']==(2 if c['key'] in 'ABCEF' else 1)
 assert c['billingMultiplier']==(2 if c['key']=='H' else 1)
ballot={k:{k+'1':2 if k in 'ABCEF' else 1} for k in 'ABCDEFGH'}
ballot['A']={'A1':1,'A2':1};ballot['F']={'F1':1,'F2':1}
a=ok('submit',deviceToken=tokens[0],participantLabel='ทดสอบจำนวนเสิร์ฟ 🧪',choices=ballot,catalogVersion=2)
state['receipts'].append(a['receipt']);state['expected']=ballot;record()
assert a['saved_at']
again=ok('submit',deviceToken=tokens[0],participantLabel='ทดสอบจำนวนเสิร์ฟ 🧪',choices=ballot,catalogVersion=2)
assert a['receipt']==again['receipt'],'retry must not create another vote'
for category,value in [('A',{'A1':3}),('A',{'A1':1}),('A',{'A1':1,'A2':2}),('A',{'B1':2}),('A',{'A1':1.5}),('A',{'A1':-2}),('A',{'A1':'2'}),('D',{'D1':2}),('G',{'G1':2}),('H',{'H1':2}),('H',{'H1':1,'H2':1})]:
 bad=copy.deepcopy(ballot);bad[category]=value
 status,res=api('submit',deviceToken=tokens[2],choices=bad,catalogVersion=2)
 assert status==400 and not res.get('ok'),(category,value,status,res)
status,res=api('submit',deviceToken=tokens[2],choices=ballot,catalogVersion=1);assert status==409
status,res=api('admin.ballot.save',inviteId='00000000-0000-0000-0000-000000000000',choices=ballot);assert status==403
b=ok('submit',deviceToken=tokens[1],participantLabel='',choices={k:k+'2' for k in 'ABCDEFGH'})
state['receipts'].append(b['receipt']);state['passed']=True;record()
print('PASS · live catalog v2 · split menus · same-receipt retry · 11 invalid quotas rejected · stale client rejected · anonymous and legacy capability paths · admin permission enforced')
print('Disposable test checkpoint:',str(checkpoint))
