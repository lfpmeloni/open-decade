import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ofx} from '../src/ofx.mjs';
import {state,account} from './helpers.mjs';
import {replay} from '../src/validate.mjs';
import {proposal} from '../src/vault.mjs';
import {hash} from '../src/core.mjs';
const input=fs.readFileSync(new URL('../fixtures/imports/bank.ofx',import.meta.url),'utf8');
const mapping={version:1,source:'synthetic',accountId:'a',externalAccountId:'synthetic-account',datePolicy:'bank-date',capturedAt:'2026-02-01T00:00:00Z'};
const append=(s,b)=>{const batches=[...s.batches,b];return {...replay(batches),batches,state:hash(batches)};};
test('OFX 102 and XML 230 banking statements preserve values and expose unapplied balance',()=>{
 const s=state([account('a')]),parsed=ofx(input,mapping,s);assert.equal(parsed.batch.records[0].amount,'-12.5');assert.equal(parsed.batch.records[0].description,'Example & shop');assert.equal(parsed.sourceMetadata.ledger.imported,false);assert.equal(parsed.sourceMetadata.ledger.amount,'87.50');assert.equal(parsed.warnings.length,2);
 const xml='<?xml version="1.0"?><?OFX OFXHEADER="200" VERSION="230" SECURITY="NONE"?>'+input.slice(input.indexOf('<OFX>')).replace(/<(TRNUID|CODE|SEVERITY|CURDEF|BANKID|ACCTID|ACCTTYPE|DTSTART|DTEND|TRNTYPE|DTPOSTED|TRNAMT|FITID|NAME|BALAMT|DTASOF)>([^<]*)/g,(_,tag,text)=>`<${tag}>${text.trim()}</${tag}>`);
 assert.equal(ofx(xml,mapping,s).batch.records.length,2);assert.equal(ofx(xml,mapping,s).sourceMetadata.exportVersion,'230');
});
test('repeat, partial overlap and changed source require existing confirmation and correction semantics',()=>{
 const s=state([account('a')]),first=ofx(input,mapping,s),after=append(s,first.batch);assert.equal(proposal(ofx(input,mapping,after).batch,after).noop,true);
 const changed=input.replace('-12.50','-13.00');assert.throws(()=>ofx(changed,mapping,after),{code:'SOURCE_CONFLICT'});
 const corrected=ofx(changed,{...mapping,corrections:{'synthetic-1':first.batch.records[0].id}},after);assert.equal(proposal(corrected.batch,after).changes.length,1);
 const overlap=input.replace('</BANKTRANLIST>','<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260104<TRNAMT>-1<FITID>third<NAME>New</STMTTRN></BANKTRANLIST>');assert.equal(proposal(ofx(overlap,mapping,after).batch,after).changes.length,1);
});
test('OFX rejects malformed, pending, wrong-account, directives and external entities without partial records',()=>{
 const s=state([account('a')]);
 for(const bad of [input.replace('</OFX>',''),input.replace('<FITID>synthetic-2','<FITID>synthetic-1'),input.replace('<STMTTRN>','<STMTTRNP>'),input.replace('20260102','20260230'),input.replace('<NAME>','<CORRECTFITID>old<NAME>'),input.replace('<OFX>','<!DOCTYPE x SYSTEM "file:///etc/passwd"><OFX>'),input.replace('<TRNAMT>-12.50','<TRNAMT>bad')])assert.throws(()=>ofx(bad,mapping,s));
 assert.throws(()=>ofx(input,{...mapping,externalAccountId:'wrong'},s),{code:'INVALID_REFERENCE'});assert.equal(s.active.length,1);
});
